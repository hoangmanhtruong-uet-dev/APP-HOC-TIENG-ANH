-- Phase 2: Performance Tuning Indexes
-- Add indexes for frequently queried columns

CREATE INDEX IF NOT EXISTS learner_lesson_progress_user_id_idx ON public.learner_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS learner_lesson_progress_lesson_id_idx ON public.learner_lesson_progress(lesson_id);

CREATE INDEX IF NOT EXISTS learner_section_progress_user_id_idx ON public.learner_section_progress(user_id);
CREATE INDEX IF NOT EXISTS learner_section_progress_lesson_id_idx ON public.learner_section_progress(lesson_id);

CREATE INDEX IF NOT EXISTS ai_generated_contents_created_at_idx ON public.ai_generated_contents(created_at DESC);
