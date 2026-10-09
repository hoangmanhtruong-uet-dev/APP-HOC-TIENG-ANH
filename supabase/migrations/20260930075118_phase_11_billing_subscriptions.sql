-- Phase 11: Billing & Subscriptions Schema
-- Creates tables for managing subscription lifecycle, payment webhooks, and usage quotas.

BEGIN;

-- 1. Create custom types
CREATE TYPE public.subscription_tier AS ENUM ('free', 'pro');
CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'incomplete');

-- 2. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tier public.subscription_tier NOT NULL DEFAULT 'free',
    status public.subscription_status NOT NULL DEFAULT 'active',
    current_period_start timestamptz NOT NULL DEFAULT now(),
    current_period_end timestamptz,
    cancel_at_period_end boolean NOT NULL DEFAULT false,
    payment_gateway text, -- 'stripe', 'sepay', 'vnpay', etc.
    gateway_customer_id text,
    gateway_subscription_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure one active subscription per user (partial index)
CREATE UNIQUE INDEX subscriptions_user_id_active_idx 
    ON public.subscriptions (user_id) 
    WHERE status IN ('active', 'trialing', 'past_due');

-- 3. Create billing webhooks/events table for idempotent processing
CREATE TABLE IF NOT EXISTS public.billing_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway text NOT NULL,
    gateway_event_id text NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    processed_at timestamptz,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX billing_events_gateway_event_id_idx 
    ON public.billing_events (gateway, gateway_event_id);

-- 4. Create user quotas table
CREATE TABLE IF NOT EXISTS public.user_quotas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quota_type text NOT NULL, -- 'ai_writing', 'ai_speaking', 'mock_test', 'vocab_daily'
    quota_limit integer NOT NULL,
    quota_used integer NOT NULL DEFAULT 0,
    reset_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, quota_type)
);

-- 5. Add RLS Policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;

-- Subscriptions: User can read their own
CREATE POLICY "Users can view own subscription" 
    ON public.subscriptions 
    FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

-- Billing Events: Service role only (no client access)
-- No policies created means deny all for authenticated/anon

-- Quotas: User can read their own
CREATE POLICY "Users can view own quotas" 
    ON public.user_quotas 
    FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER handle_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_user_quotas_updated_at
    BEFORE UPDATE ON public.user_quotas
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 7. Secure RPC to check active tier
CREATE OR REPLACE FUNCTION public.get_current_tier()
RETURNS public.subscription_tier
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT tier
    FROM public.subscriptions
    WHERE user_id = auth.uid()
      AND status IN ('active', 'trialing')
    ORDER BY created_at DESC
    LIMIT 1;
$$;

-- By default, if no row is found, it returns null. We can handle 'free' fallback in application code or modify the RPC.
-- Better to use a plpgsql function for fallback.

CREATE OR REPLACE FUNCTION public.get_user_tier(target_user_id uuid)
RETURNS public.subscription_tier
LANGUAGE plpgsql
SECURITY DEFINER -- Needs to run as definer if we want service roles to check it reliably, but for users themselves, invoker is fine.
SET search_path = ''
AS $$
DECLARE
    found_tier public.subscription_tier;
BEGIN
    IF target_user_id != auth.uid() THEN
        -- Only allow self-check unless superuser (simple RLS equivalent)
        -- Since it's SECURITY DEFINER, we manually enforce:
        -- But let's stick to SECURITY INVOKER for simplicity and safety.
    END IF;
    
    SELECT tier INTO found_tier
    FROM public.subscriptions
    WHERE user_id = target_user_id
      AND status IN ('active', 'trialing')
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF found_tier IS NULL THEN
        RETURN 'free'::public.subscription_tier;
    END IF;
    
    RETURN found_tier;
END;
$$;

-- Correcting to Security Invoker for user self-check
DROP FUNCTION public.get_user_tier(uuid);

CREATE OR REPLACE FUNCTION public.get_my_tier()
RETURNS public.subscription_tier
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    found_tier public.subscription_tier;
BEGIN
    SELECT tier INTO found_tier
    FROM public.subscriptions
    WHERE user_id = auth.uid()
      AND status IN ('active', 'trialing')
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF found_tier IS NULL THEN
        RETURN 'free'::public.subscription_tier;
    END IF;
    
    RETURN found_tier;
END;
$$;

COMMIT;
