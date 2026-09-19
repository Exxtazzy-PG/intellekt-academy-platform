-- 1) Lock down the answer key on questions ------------------------------------
DROP POLICY IF EXISTS "All authenticated view questions" ON public.questions;

CREATE POLICY "Ustoz views questions"
ON public.questions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'ustoz'::app_role));

CREATE OR REPLACE VIEW public.questions_safe
WITH (security_invoker = false) AS
SELECT id, test_id, question_text, option_a, option_b, option_c, option_d, position, created_at
FROM public.questions;

REVOKE ALL ON public.questions_safe FROM PUBLIC, anon;
GRANT SELECT ON public.questions_safe TO authenticated;

-- 2) Server-side grading of student answers ------------------------------------
CREATE OR REPLACE FUNCTION public.grade_student_answer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ck text;
BEGIN
  SELECT correct_option INTO ck FROM public.questions WHERE id = NEW.question_id;
  NEW.is_correct := (NOT COALESCE(NEW.timed_out, false))
                    AND NEW.selected_option IS NOT NULL
                    AND lower(NEW.selected_option) = lower(COALESCE(ck, ''));
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.grade_student_answer() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_grade_student_answer ON public.student_answers;
CREATE TRIGGER trg_grade_student_answer
BEFORE INSERT OR UPDATE ON public.student_answers
FOR EACH ROW EXECUTE FUNCTION public.grade_student_answer();

-- 3) Answer key released only after the teacher publishes -----------------------
CREATE OR REPLACE FUNCTION public.get_assignment_answer_key(_assignment_id uuid)
RETURNS TABLE (question_id uuid, correct_option text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'ustoz'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.test_assignments ta
      JOIN public.assignment_students s ON s.assignment_id = ta.id
      WHERE ta.id = _assignment_id
        AND s.student_id = auth.uid()
        AND ta.answers_published = true
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT q.id, q.correct_option::text
  FROM public.assignment_questions aq
  JOIN public.questions q ON q.id = aq.question_id
  WHERE aq.assignment_id = _assignment_id
    AND (public.has_role(auth.uid(), 'ustoz'::app_role) OR aq.student_id = auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.get_assignment_answer_key(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_assignment_answer_key(uuid) TO authenticated;

-- 4) Practice test grading fully server-side -----------------------------------
CREATE OR REPLACE FUNCTION public.submit_test_attempt(_test_id uuid, _answers jsonb)
RETURNS TABLE (score integer, total integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  sc integer := 0;
  tt integer := 0;
  payload jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT count(*)::int INTO tt FROM public.questions WHERE test_id = _test_id;

  SELECT
    count(*) FILTER (WHERE lower(COALESCE(a.value->>'selected','')) = lower(q.correct_option))::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'question_id', q.id,
      'selected', a.value->>'selected',
      'correct', q.correct_option
    )), '[]'::jsonb)
  INTO sc, payload
  FROM jsonb_array_elements(COALESCE(_answers, '[]'::jsonb)) a
  JOIN public.questions q ON q.id = (a.value->>'question_id')::uuid AND q.test_id = _test_id;

  INSERT INTO public.attempts (test_id, student_id, score, total, answers, finished_at)
  VALUES (_test_id, uid, COALESCE(sc,0), tt, COALESCE(payload,'[]'::jsonb), now());

  score := COALESCE(sc,0);
  total := tt;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_test_attempt(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_test_attempt(uuid, jsonb) TO authenticated;

-- 5) Harden existing SECURITY DEFINER functions --------------------------------
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- 6) user_roles: make privilege escalation impossible ---------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.user_roles FROM authenticated, anon, PUBLIC;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

CREATE OR REPLACE FUNCTION public.block_client_role_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    RAISE EXCEPTION 'Role assignment is not allowed from client applications';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.block_client_role_writes() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_block_client_role_writes ON public.user_roles;
CREATE TRIGGER trg_block_client_role_writes
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.block_client_role_writes();

-- 7) Private avatars bucket: scoped storage policies ---------------------------
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public avatar read" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;

CREATE POLICY "Authenticated can view avatars"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);