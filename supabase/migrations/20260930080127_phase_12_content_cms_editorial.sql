-- Phase 12: Content CMS & Taxonomy
-- Creates tables for taxonomy/tags, tagging mapping, and bulk import tracking.

BEGIN;

-- 1. Create Taxonomy Tree
CREATE TYPE public.taxonomy_type AS ENUM ('skill', 'grammar', 'vocabulary', 'topic', 'question_type');

CREATE TABLE public.content_taxonomy (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id uuid REFERENCES public.content_taxonomy(id) ON DELETE CASCADE,
    type public.taxonomy_type NOT NULL,
    label text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT content_taxonomy_slug_check CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX content_taxonomy_parent_idx ON public.content_taxonomy(parent_id);
CREATE INDEX content_taxonomy_type_idx ON public.content_taxonomy(type);

-- 2. Create Tag Mappings (Polymorphic mapping using relation name + UUID)
CREATE TABLE public.content_tag_mappings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    taxonomy_id uuid NOT NULL REFERENCES public.content_taxonomy(id) ON DELETE CASCADE,
    entity_type text NOT NULL, -- 'lesson_version', 'exercise_question', 'reading_question', 'listening_part', 'writing_task', 'speaking_task'
    entity_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(taxonomy_id, entity_type, entity_id)
);

CREATE INDEX content_tag_mappings_entity_idx ON public.content_tag_mappings(entity_type, entity_id);

-- 3. Create Bulk Import Jobs Table
CREATE TYPE public.import_job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE public.bulk_import_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_type text NOT NULL, -- e.g., 'import_reading_test', 'import_grammar_exercises'
    status public.import_job_status NOT NULL DEFAULT 'pending',
    file_url text NOT NULL, -- Reference to Supabase Storage path
    total_records integer DEFAULT 0,
    processed_records integer DEFAULT 0,
    error_log jsonb, -- Array of error objects per row
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Triggers for updated_at
CREATE TRIGGER handle_content_taxonomy_updated_at
    BEFORE UPDATE ON public.content_taxonomy
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_bulk_import_jobs_updated_at
    BEFORE UPDATE ON public.bulk_import_jobs
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 5. RLS Policies
ALTER TABLE public.content_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_tag_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_import_jobs ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can READ taxonomy and tags
CREATE POLICY "Anyone can read taxonomy" 
    ON public.content_taxonomy FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone can read tag mappings" 
    ON public.content_tag_mappings FOR SELECT TO authenticated USING (true);

-- Only service role or authors can mutate CMS (handled via API/Service Role in this simplified version, or via admin check)
-- Users can read their own import jobs
CREATE POLICY "Users can view own import jobs" 
    ON public.bulk_import_jobs FOR SELECT TO authenticated USING (auth.uid() = author_id);

COMMIT;
