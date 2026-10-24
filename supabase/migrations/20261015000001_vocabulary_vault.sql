CREATE TABLE IF NOT EXISTS public.vocabulary_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    term TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.vocabulary_vault ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS vocabulary_vault_user_term_idx ON public.vocabulary_vault (user_id, term);
CREATE INDEX IF NOT EXISTS vocabulary_vault_user_id_idx ON public.vocabulary_vault (user_id);

DROP POLICY IF EXISTS "Users can insert their own vocabulary" ON public.vocabulary_vault;
CREATE POLICY "Users can insert their own vocabulary"
    ON public.vocabulary_vault FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can select their own vocabulary" ON public.vocabulary_vault;
CREATE POLICY "Users can select their own vocabulary"
    ON public.vocabulary_vault FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own vocabulary" ON public.vocabulary_vault;
CREATE POLICY "Users can update their own vocabulary"
    ON public.vocabulary_vault FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own vocabulary" ON public.vocabulary_vault;
CREATE POLICY "Users can delete their own vocabulary"
    ON public.vocabulary_vault FOR DELETE
    USING (auth.uid() = user_id);
