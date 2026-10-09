-- Phase 1 (P0): Composite Performance Tuning Indexes
-- Add composite indexes for high frequency query paths

BEGIN;

CREATE INDEX IF NOT EXISTS idx_writing_submissions_user_status 
    ON public.writing_submissions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_speaking_attempts_user_status 
    ON public.speaking_attempts(user_id, status);

CREATE INDEX IF NOT EXISTS idx_practice_attempts_user_domain_created 
    ON public.practice_attempts(user_id, domain, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learner_analytics_daily_user_tag_date 
    ON public.learner_analytics_daily(user_id, tag_id, date DESC);

COMMIT;
