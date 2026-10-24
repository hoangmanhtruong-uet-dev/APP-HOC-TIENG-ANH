-- Phase 1 (P0): Composite Performance Tuning Indexes
-- Add composite indexes for high frequency query paths

BEGIN;

CREATE INDEX IF NOT EXISTS idx_writing_submissions_user_status 
    ON public.writing_submissions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_speaking_attempts_user_status 
    ON public.speaking_attempts(user_id, status);

CREATE INDEX IF NOT EXISTS idx_learner_attempts_user_status_created 
    ON public.learner_attempts(user_id, status, created_at DESC);

COMMIT;
