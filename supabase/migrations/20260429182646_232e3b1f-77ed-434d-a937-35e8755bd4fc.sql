-- Create subjects (fanlar) table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated view subjects"
  ON public.subjects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Ustoz manages subjects insert"
  ON public.subjects FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'ustoz'::app_role));

CREATE POLICY "Ustoz manages subjects update"
  ON public.subjects FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'ustoz'::app_role));

CREATE POLICY "Ustoz manages subjects delete"
  ON public.subjects FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'ustoz'::app_role));

CREATE TRIGGER subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Add subject_id and content fields to topics
ALTER TABLE public.topics
  ADD COLUMN subject_id UUID,
  ADD COLUMN content TEXT,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TRIGGER topics_updated_at
  BEFORE UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_topics_subject_id ON public.topics(subject_id);
CREATE INDEX idx_tests_topic_id ON public.tests(topic_id);
CREATE INDEX idx_questions_test_id ON public.questions(test_id);
CREATE INDEX idx_attempts_student_id ON public.attempts(student_id);