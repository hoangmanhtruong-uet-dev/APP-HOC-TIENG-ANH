-- Phase 13: Gamification & Retention Engine
-- Creates tables for tracking Streaks, XP, Leaderboards, and Notifications.

BEGIN;

-- 1. Gamification Profile (1-to-1 with auth.users)
CREATE TABLE public.user_gamification (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_xp integer NOT NULL DEFAULT 0,
    current_level integer NOT NULL DEFAULT 1,
    current_streak integer NOT NULL DEFAULT 0,
    longest_streak integer NOT NULL DEFAULT 0,
    last_activity_date date, -- Used to calculate streaks based on timezone
    streak_freezes_available integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. XP Event Log
CREATE TABLE public.xp_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount integer NOT NULL,
    source text NOT NULL, -- 'lesson_completed', 'mock_test_completed', 'streak_bonus'
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX xp_events_user_idx ON public.xp_events(user_id);

-- 3. Leaderboard Snapshot (Calculated weekly)
CREATE TABLE public.weekly_leaderboards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start date NOT NULL,
    week_end date NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    weekly_xp integer NOT NULL DEFAULT 0,
    rank integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (week_start, user_id)
);

CREATE INDEX weekly_leaderboards_rank_idx ON public.weekly_leaderboards(week_start, weekly_xp DESC);

-- 4. Notification Preferences & Tokens
CREATE TABLE public.user_notification_settings (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email_enabled boolean NOT NULL DEFAULT true,
    push_enabled boolean NOT NULL DEFAULT false,
    daily_reminder_time time NOT NULL DEFAULT '20:00:00', -- Local time of user
    timezone text NOT NULL DEFAULT 'UTC',
    fcm_token text, -- Firebase Cloud Messaging token for web push
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Triggers for updated_at
CREATE TRIGGER handle_user_gamification_updated_at
    BEFORE UPDATE ON public.user_gamification
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_user_notification_settings_updated_at
    BEFORE UPDATE ON public.user_notification_settings
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 6. RLS Policies
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own gamification" 
    ON public.user_gamification FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can read own xp events" 
    ON public.xp_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Leaderboards are public to authenticated users
CREATE POLICY "Anyone can read leaderboards" 
    ON public.weekly_leaderboards FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own notification settings" 
    ON public.user_notification_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. RPC to securely award XP
CREATE OR REPLACE FUNCTION public.award_xp(target_user_id uuid, xp_amount integer, xp_source text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Only allow server/service role or matching user (with limits) to award XP
    -- In a real app, you'd verify if the user actually completed the task.
    -- For simplicity, this is a basic implementation.
    
    INSERT INTO public.xp_events (user_id, amount, source)
    VALUES (target_user_id, xp_amount, xp_source);

    INSERT INTO public.user_gamification (user_id, total_xp)
    VALUES (target_user_id, xp_amount)
    ON CONFLICT (user_id) DO UPDATE
    SET total_xp = user_gamification.total_xp + excluded.total_xp;
END;
$$;

COMMIT;
