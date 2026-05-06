
DROP POLICY IF EXISTS "Insert notifications" ON public.notifications;
CREATE POLICY "Insert notifications" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'ustoz'::app_role)
  OR auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.test_assignments ta
    JOIN public.assignment_students asg_s
      ON asg_s.assignment_id = ta.id
    WHERE ta.created_by = notifications.user_id
      AND asg_s.student_id = auth.uid()
  )
);

ALTER TABLE public.assignment_students REPLICA IDENTITY FULL;
ALTER TABLE public.student_answers REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.assignment_students;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.student_answers;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
