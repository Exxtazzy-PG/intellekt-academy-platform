-- Создаём все таблицы сначала
CREATE TABLE public.test_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  questions_per_student INTEGER NOT NULL DEFAULT 10,
  seconds_per_question INTEGER NOT NULL DEFAULT 60,
  deadline TIMESTAMPTZ,
  answers_published BOOLEAN NOT NULL DEFAULT false,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.assignment_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.test_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  score INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);

CREATE TABLE public.assignment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.test_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id, question_id)
);

CREATE TABLE public.student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.test_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  time_taken_seconds INTEGER,
  timed_out BOOLEAN NOT NULL DEFAULT false,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id, question_id)
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Включаем RLS
ALTER TABLE public.test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Политики: test_assignments
CREATE POLICY "Select assignments" ON public.test_assignments
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'ustoz'::app_role) OR EXISTS (
    SELECT 1 FROM public.assignment_students WHERE assignment_id = test_assignments.id AND student_id = auth.uid()
  ));
CREATE POLICY "Insert assignments" ON public.test_assignments
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'ustoz'::app_role));
CREATE POLICY "Update assignments" ON public.test_assignments
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'ustoz'::app_role));
CREATE POLICY "Delete assignments" ON public.test_assignments
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'ustoz'::app_role));

-- Политики: assignment_students
CREATE POLICY "Select assignment_students" ON public.assignment_students
  FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR has_role(auth.uid(), 'ustoz'::app_role));
CREATE POLICY "Insert assignment_students" ON public.assignment_students
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'ustoz'::app_role));
CREATE POLICY "Update assignment_students" ON public.assignment_students
  FOR UPDATE TO authenticated USING (auth.uid() = student_id OR has_role(auth.uid(), 'ustoz'::app_role));
CREATE POLICY "Delete assignment_students" ON public.assignment_students
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'ustoz'::app_role));

-- Политики: assignment_questions
CREATE POLICY "Select assignment_questions" ON public.assignment_questions
  FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR has_role(auth.uid(), 'ustoz'::app_role));
CREATE POLICY "Insert assignment_questions" ON public.assignment_questions
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'ustoz'::app_role));
CREATE POLICY "Delete assignment_questions" ON public.assignment_questions
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'ustoz'::app_role));

-- Политики: student_answers
CREATE POLICY "Select student_answers" ON public.student_answers
  FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR has_role(auth.uid(), 'ustoz'::app_role));
CREATE POLICY "Insert student_answers" ON public.student_answers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Update student_answers" ON public.student_answers
  FOR UPDATE TO authenticated USING (auth.uid() = student_id);

-- Политики: notifications
CREATE POLICY "Select notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'ustoz'::app_role));
CREATE POLICY "Insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'ustoz'::app_role) OR auth.uid() = user_id);
CREATE POLICY "Update notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Delete notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Триггеры
CREATE TRIGGER trg_test_assignments_updated_at
  BEFORE UPDATE ON public.test_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Индексы
CREATE INDEX idx_assignment_students_student ON public.assignment_students(student_id);
CREATE INDEX idx_assignment_students_assignment ON public.assignment_students(assignment_id);
CREATE INDEX idx_assignment_questions_lookup ON public.assignment_questions(assignment_id, student_id);
CREATE INDEX idx_student_answers_lookup ON public.student_answers(assignment_id, student_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignment_students;