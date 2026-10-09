-- Create AI Content Generation table
CREATE TYPE public.ai_content_status AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

CREATE TABLE public.ai_generated_contents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url text,
    content_type text NOT NULL, -- 'reading', 'listening', 'dictation'
    raw_content text,
    structured_data jsonb NOT NULL,
    status public.ai_content_status NOT NULL DEFAULT 'PENDING_REVIEW',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER handle_ai_generated_contents_updated_at
    BEFORE UPDATE ON public.ai_generated_contents
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

ALTER TABLE public.ai_generated_contents ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage
CREATE POLICY "Admins can manage ai generated contents" 
    ON public.ai_generated_contents 
    FOR ALL 
    TO authenticated 
    USING (auth.uid() IN (SELECT user_id FROM auth.users)) -- Just placeholder for now, since we don't have an admin role table
    WITH CHECK (auth.uid() IN (SELECT user_id FROM auth.users));
