-- ==========================================
-- MIGRATION: supabase/migrations/20261003022100_support_r2_storage.sql
-- ==========================================
-- Migration to support Cloudflare R2 for speaking audio
alter table public.speaking_audio_assets drop constraint if exists speaking_audio_assets_bucket_check;
alter table public.speaking_audio_assets drop constraint if exists speaking_audio_checksum_check;
alter table public.speaking_audio_assets alter column upload_intent_id drop not null;

create or replace function public.finalize_r2_speaking_upload(
  p_attempt_id uuid,
  p_prompt_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint,
  p_duration_seconds numeric
) returns public.speaking_audio_assets language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  target_attempt public.speaking_attempts;
  target_response public.speaking_responses;
  result public.speaking_audio_assets;
  old_asset_id uuid;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  
  select * into target_attempt from public.speaking_attempts 
  where id = p_attempt_id and user_id = actor_id for update;
  if target_attempt.status <> 'in_progress' then raise exception 'Speaking attempt is not editable'; end if;

  insert into public.speaking_responses (user_id, attempt_id, speaking_set_version_id, prompt_id)
  values (actor_id, target_attempt.id, target_attempt.speaking_set_version_id, p_prompt_id)
  on conflict (attempt_id, prompt_id) do update set updated_at = public.speaking_responses.updated_at
  returning * into target_response;
  
  old_asset_id := target_response.audio_asset_id;

  insert into public.speaking_audio_assets (
    user_id, attempt_id, response_id, bucket_id, storage_path, mime_type,
    size_bytes, duration_seconds, sha256_checksum
  ) values (
    actor_id, target_attempt.id, target_response.id, 'cloudflare-r2', p_storage_path,
    p_mime_type, p_size_bytes, p_duration_seconds, '0000000000000000000000000000000000000000000000000000000000000000'
  ) returning * into result;

  update public.speaking_responses set audio_asset_id = result.id where id = target_response.id;
  if old_asset_id is not null then update public.speaking_audio_assets set status = 'orphaned' where id = old_asset_id; end if;

  return result;
end; $$;

revoke all on function public.finalize_r2_speaking_upload(uuid, uuid, text, text, bigint, numeric) from public, anon, authenticated;
grant execute on function public.finalize_r2_speaking_upload(uuid, uuid, text, text, bigint, numeric) to authenticated;



-- ==========================================
-- MIGRATION: supabase/migrations/20261006000000_ai_content_generation.sql
-- ==========================================
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
    USING (auth.uid() IN (SELECT id FROM auth.users)) -- Placeholder: auth.users primary key is id
    WITH CHECK (auth.uid() IN (SELECT id FROM auth.users));


-- ==========================================
-- MIGRATION: supabase/migrations/20261006000001_phase_2_indexes.sql
-- ==========================================
-- Phase 2: Performance Tuning Indexes
-- Add indexes for frequently queried columns

CREATE INDEX IF NOT EXISTS learner_lesson_progress_user_id_idx ON public.learner_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS learner_lesson_progress_lesson_id_idx ON public.learner_lesson_progress(lesson_id);

CREATE INDEX IF NOT EXISTS learner_section_progress_user_id_idx ON public.learner_section_progress(user_id);
CREATE INDEX IF NOT EXISTS learner_section_progress_lesson_id_idx ON public.learner_section_progress(lesson_id);

CREATE INDEX IF NOT EXISTS ai_generated_contents_created_at_idx ON public.ai_generated_contents(created_at DESC);


-- ==========================================
-- MIGRATION: supabase/migrations/20261009000000_composite_indexes.sql
-- ==========================================
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


-- ==========================================
-- MIGRATION: supabase/migrations/20261015000000_learning_and_practice_core.sql
-- ==========================================
-- 1. Bảng lưu trữ bài học lý thuyết
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    video_url TEXT,
    content_markdown TEXT NOT NULL,
    duration_seconds INT NOT NULL DEFAULT 0,
    order_index INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng theo dõi tiến độ bài học (Lesson Progress)
CREATE TABLE IF NOT EXISTS public.user_lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    last_position_seconds INT NOT NULL DEFAULT 0,
    completion_percentage INT NOT NULL DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_lesson UNIQUE(user_id, lesson_id)
);

-- 3. Bảng bài tập thực hành (Practice Exercises)
CREATE TABLE IF NOT EXISTS public.practice_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('reading', 'listening', 'grammar', 'vocab')),
    time_limit_seconds INT NOT NULL DEFAULT 0, -- 0 = không giới hạn
    total_questions INT NOT NULL DEFAULT 0,
    passing_score_percentage INT NOT NULL DEFAULT 70,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bảng câu hỏi hiển thị cho Client (Public / RLS - Không chứa đáp án đúng)
CREATE TABLE IF NOT EXISTS public.practice_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES public.practice_exercises(id) ON DELETE CASCADE,
    order_index INT NOT NULL,
    question_type VARCHAR(30) NOT NULL CHECK (question_type IN ('multiple_choice', 'fill_in_blanks', 'matching')),
    prompt TEXT NOT NULL,
    options JSONB, -- Array options cho MCQs, Matching pairs bên A
    matching_targets JSONB, -- Danh sách pairs bên B
    explanation TEXT, -- Chỉ trả về sau khi đã nộp bài
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Bảng đáp án bảo mật (Isolate trong Private Schema - Client KHÔNG THỂ SELECT)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM authenticated, anon, public;

CREATE TABLE IF NOT EXISTS private.exercise_answer_keys (
    question_id UUID PRIMARY KEY REFERENCES public.practice_questions(id) ON DELETE CASCADE,
    correct_answers JSONB NOT NULL, -- Giá trị đúng: ["A"], ["answer1", "answer2"]
    accepted_synonyms JSONB DEFAULT '[]'::jsonb, -- Từ đồng nghĩa chấp nhận được
    case_sensitive BOOLEAN NOT NULL DEFAULT false
);

-- 6. Bảng lưu lượt làm bài tập (Practice Attempts & Drafts)
CREATE TABLE IF NOT EXISTS public.exercise_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.practice_exercises(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'abandoned')),
    draft_answers JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    server_expires_at TIMESTAMPTZ, -- Server-authoritative deadline
    submitted_at TIMESTAMPTZ,
    score INT DEFAULT 0,
    max_score INT NOT NULL DEFAULT 0,
    accuracy_percentage NUMERIC(5,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chỉ mục hiệu năng tối ưu hóa tra cứu (Fix Gap Audit)
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_lookup ON public.user_lesson_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_user_status ON public.exercise_attempts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_exercise_created ON public.exercise_attempts(exercise_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_practice_questions_exercise_order ON public.practice_questions(exercise_id, order_index);

-- Kích hoạt RLS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_attempts ENABLE ROW LEVEL SECURITY;

-- Policies cơ bản
DROP POLICY IF EXISTS "Public read lessons" ON public.lessons;
CREATE POLICY "Public read lessons" ON public.lessons FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Public read exercises" ON public.practice_exercises;
CREATE POLICY "Public read exercises" ON public.practice_exercises FOR SELECT TO authenticated USING (is_published = true);
DROP POLICY IF EXISTS "Public read questions" ON public.practice_questions;
CREATE POLICY "Public read questions" ON public.practice_questions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users own lesson progress" ON public.user_lesson_progress;
CREATE POLICY "Users own lesson progress" ON public.user_lesson_progress 
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own attempts" ON public.exercise_attempts;
CREATE POLICY "Users own attempts" ON public.exercise_attempts 
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Secure RPC: Nộp bài và chấm điểm Server-Authoritative
CREATE OR REPLACE FUNCTION public.submit_exercise_attempt(
    p_attempt_id UUID,
    p_user_answers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
    v_user_id UUID;
    v_exercise_id UUID;
    v_expires_at TIMESTAMPTZ;
    v_status VARCHAR(20);
    v_total_questions INT;
    v_correct_count INT := 0;
    v_q RECORD;
    v_correct_data JSONB;
    v_is_correct BOOLEAN;
    v_result_details JSONB := '[]'::jsonb;
BEGIN
    v_user_id := auth.uid();
    
    -- 1. Validate Attempt
    SELECT user_id, exercise_id, server_expires_at, status 
    INTO v_user_id, v_exercise_id, v_expires_at, v_status
    FROM public.exercise_attempts
    WHERE id = p_attempt_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Attempt not found';
    END IF;

    IF v_user_id <> auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized attempt access';
    END IF;

    IF v_status = 'submitted' THEN
        RAISE EXCEPTION 'Attempt has already been submitted';
    END IF;

    -- Kiểm tra quá thời gian nộp bài cho phép (Grace period 15 giây)
    IF v_expires_at IS NOT NULL AND NOW() > (v_expires_at + INTERVAL '15 seconds') THEN
        UPDATE public.exercise_attempts SET status = 'abandoned' WHERE id = p_attempt_id;
        RAISE EXCEPTION 'Time limit exceeded. Attempt marked as abandoned';
    END IF;

    -- 2. Đánh giá kết quả từ Private Schema
    FOR v_q IN 
        SELECT pq.id, pq.question_type, pq.explanation, ak.correct_answers, ak.accepted_synonyms, ak.case_sensitive
        FROM public.practice_questions pq
        JOIN private.exercise_answer_keys ak ON pq.id = ak.question_id
        WHERE pq.exercise_id = v_exercise_id
    LOOP
        v_is_correct := false;
        
        -- Logic kiểm tra câu trả lời dựa trên loại câu hỏi
        IF v_q.question_type = 'multiple_choice' THEN
            v_is_correct := (v_q.correct_answers = (p_user_answers->v_q.id::text));
        ELSIF v_q.question_type = 'fill_in_blanks' THEN
            -- So khớp case-insensitive và từ đồng nghĩa
            v_is_correct := (
                lower(p_user_answers->>v_q.id::text) = lower(v_q.correct_answers->>0) OR
                v_q.accepted_synonyms @> to_jsonb(p_user_answers->>v_q.id::text)
            );
        ELSIF v_q.question_type = 'matching' THEN
            v_is_correct := (v_q.correct_answers = (p_user_answers->v_q.id::text));
        END IF;

        IF v_is_correct THEN
            v_correct_count := v_correct_count + 1;
        END IF;

        v_result_details := v_result_details || jsonb_build_object(
            'question_id', v_q.id,
            'is_correct', v_is_correct,
            'correct_answer', v_q.correct_answers,
            'explanation', v_q.explanation
        );
    END LOOP;

    SELECT COUNT(*) INTO v_total_questions FROM public.practice_questions WHERE exercise_id = v_exercise_id;

    -- 3. Cập nhật kết quả bài làm
    UPDATE public.exercise_attempts
    SET status = 'submitted',
        submitted_at = NOW(),
        score = v_correct_count,
        max_score = v_total_questions,
        accuracy_percentage = ROUND((v_correct_count::numeric / GREATEST(v_total_questions, 1)) * 100, 2),
        draft_answers = p_user_answers,
        updated_at = NOW()
    WHERE id = p_attempt_id;

    RETURN jsonb_build_object(
        'attempt_id', p_attempt_id,
        'score', v_correct_count,
        'max_score', v_total_questions,
        'accuracy_percentage', ROUND((v_correct_count::numeric / GREATEST(v_total_questions, 1)) * 100, 2),
        'results', v_result_details
    );
END;
$$;

-- Touched for audit


-- ==========================================
-- MIGRATION: supabase/migrations/20261015000001_vocabulary_vault.sql
-- ==========================================
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


-- ==========================================
-- MIGRATION: supabase/migrations/20261024000000_fix_ai_generated_contents_rls.sql
-- ==========================================
-- Fix G1: Siết RLS cho public.ai_generated_contents
-- Thay thế policy placeholder (auth.uid() IN (SELECT user_id FROM auth.users))
-- bằng policy dựa trên bảng admin roles thật.
--
-- Forward-only: không sửa migration cũ, chỉ thêm migration mới.

BEGIN;

-- 1. Tạo bảng vai trò admin (nếu chưa có)
CREATE TABLE IF NOT EXISTS public.app_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('super_admin', 'content_editor', 'support', 'student')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

CREATE INDEX IF NOT EXISTS app_roles_user_id_idx ON public.app_roles(user_id);
CREATE INDEX IF NOT EXISTS app_roles_role_idx ON public.app_roles(role);

-- 2. Tạo view helper cho kiểm tra admin (dùng trong RLS policy)
CREATE OR REPLACE VIEW public.admin_users AS
    SELECT user_id FROM public.app_roles WHERE role IN ('super_admin', 'content_editor');

-- 3. Bật RLS cho ai_generated_contents (đã bật từ migration cũ, đảm bảo lại)
ALTER TABLE public.ai_generated_contents ENABLE ROW LEVEL SECURITY;

-- 4. Xóa policy placeholder cũ (nếu tồn tại)
DROP POLICY IF EXISTS "Admins can manage ai generated contents" ON public.ai_generated_contents;

-- 5. Tạo policy mới: chỉ admin có thể quản lý ai_generated_contents
CREATE POLICY "Admins can manage ai generated contents"
    ON public.ai_generated_contents
    FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- 6. Cho phép authenticated user đọc nội dung đã APPROVED (dùng cho content draft review UI)
CREATE POLICY "Authenticated can read approved ai generated contents"
    ON public.ai_generated_contents
    FOR SELECT
    TO authenticated
    USING (status = 'APPROVED');

COMMIT;


-- ==========================================
-- MIGRATION: supabase/migrations/20261024000001_content_seed_template.sql
-- ==========================================
-- Template migration seed nội dung G1
-- Copy file này và đổi tên theo convention: 2026MMDDHHMMSS_content_batch_XX.sql
-- Chỉ áp dụng forward-only, không sửa migration đã apply.

BEGIN;

-- Ví dụ: thêm 1 module + 1 lesson + 1 exercise (định dạng thực tế tuỳ schema dự án)
-- INSERT INTO public.content_modules (...) VALUES (...);
-- INSERT INTO public.content_lesson_versions (...) VALUES (...);
-- INSERT INTO public.exercise_questions (...) VALUES (...);
-- INSERT INTO private.exercise_answer_keys (...) VALUES (...);

-- Lưu ý: answer key phải nằm trong schema `private`, client không được SELECT trực tiếp.

COMMIT;


-- ==========================================
-- MIGRATION: supabase/migrations/20261024100000_seed_oxford_cefr_vocabulary.sql
-- ==========================================
-- Migration: Seed 320 Oxford Core Vocabulary A1 -> B2 (CEFR & IELTS 0 - 6.5)
-- Date: 2026-10-24
-- Forward-only migration following Project Constitution

begin;

-- 1. Ingest canonical vocabulary_entries
insert into public.vocabulary_entries (
  id, slug, normalized_term, part_of_speech, sense_key, display_order
) values
  ('40000000-0000-4000-9000-000000000001', 'about-verb', 'about', 'verb', 'default', 10),
  ('40000000-0000-4000-9000-000000000002', 'above-verb', 'above', 'verb', 'default', 11),
  ('40000000-0000-4000-9000-000000000003', 'across-verb', 'across', 'verb', 'default', 12),
  ('40000000-0000-4000-9000-000000000004', 'action-noun', 'action', 'noun', 'default', 13),
  ('40000000-0000-4000-9000-000000000005', 'activity-noun', 'activity', 'noun', 'default', 14),
  ('40000000-0000-4000-9000-000000000006', 'actor-noun', 'actor', 'noun', 'default', 15),
  ('40000000-0000-4000-9000-000000000007', 'actress-noun', 'actress', 'noun', 'default', 16),
  ('40000000-0000-4000-9000-000000000008', 'add-verb', 'add', 'verb', 'default', 17),
  ('40000000-0000-4000-9000-000000000009', 'address-noun', 'address', 'noun', 'default', 18),
  ('40000000-0000-4000-9000-00000000000a', 'adult-noun', 'adult', 'noun', 'default', 19),
  ('40000000-0000-4000-9000-00000000000b', 'advice-noun', 'advice', 'noun', 'default', 20),
  ('40000000-0000-4000-9000-00000000000c', 'afraid-adjective', 'afraid', 'adjective', 'default', 21),
  ('40000000-0000-4000-9000-00000000000d', 'after-preposition', 'after', 'preposition', 'default', 22),
  ('40000000-0000-4000-9000-00000000000e', 'afternoon-noun', 'afternoon', 'noun', 'default', 23),
  ('40000000-0000-4000-9000-00000000000f', 'again-verb', 'again', 'verb', 'default', 24),
  ('40000000-0000-4000-9000-000000000010', 'age-noun', 'age', 'noun', 'default', 25),
  ('40000000-0000-4000-9000-000000000011', 'ago-verb', 'ago', 'verb', 'default', 26),
  ('40000000-0000-4000-9000-000000000012', 'agree-verb', 'agree', 'verb', 'default', 27),
  ('40000000-0000-4000-9000-000000000013', 'air-noun', 'air', 'noun', 'default', 28),
  ('40000000-0000-4000-9000-000000000014', 'airport-noun', 'airport', 'noun', 'default', 29),
  ('40000000-0000-4000-9000-000000000015', 'all-determiner', 'all', 'determiner', 'default', 30),
  ('40000000-0000-4000-9000-000000000016', 'also-verb', 'also', 'verb', 'default', 31),
  ('40000000-0000-4000-9000-000000000017', 'always-verb', 'always', 'verb', 'default', 32),
  ('40000000-0000-4000-9000-000000000018', 'amazing-adjective', 'amazing', 'adjective', 'default', 33),
  ('40000000-0000-4000-9000-000000000019', 'and-conjunction', 'and', 'conjunction', 'default', 34),
  ('40000000-0000-4000-9000-00000000001a', 'angry-adjective', 'angry', 'adjective', 'default', 35),
  ('40000000-0000-4000-9000-00000000001b', 'animal-noun', 'animal', 'noun', 'default', 36),
  ('40000000-0000-4000-9000-00000000001c', 'another-determiner', 'another', 'determiner', 'default', 37),
  ('40000000-0000-4000-9000-00000000001d', 'answer-noun', 'answer', 'noun', 'default', 38),
  ('40000000-0000-4000-9000-00000000001e', 'any-determiner', 'any', 'determiner', 'default', 39),
  ('40000000-0000-4000-9000-00000000001f', 'anyone-pronoun', 'anyone', 'pronoun', 'default', 40),
  ('40000000-0000-4000-9000-000000000020', 'anything-pronoun', 'anything', 'pronoun', 'default', 41),
  ('40000000-0000-4000-9000-000000000021', 'apartment-noun', 'apartment', 'noun', 'default', 42),
  ('40000000-0000-4000-9000-000000000022', 'apple-noun', 'apple', 'noun', 'default', 43),
  ('40000000-0000-4000-9000-000000000023', 'april-noun', 'april', 'noun', 'default', 44),
  ('40000000-0000-4000-9000-000000000024', 'area-noun', 'area', 'noun', 'default', 45),
  ('40000000-0000-4000-9000-000000000025', 'arm-noun', 'arm', 'noun', 'default', 46),
  ('40000000-0000-4000-9000-000000000026', 'around-verb', 'around', 'verb', 'default', 47),
  ('40000000-0000-4000-9000-000000000027', 'arrive-verb', 'arrive', 'verb', 'default', 48),
  ('40000000-0000-4000-9000-000000000028', 'art-noun', 'art', 'noun', 'default', 49),
  ('40000000-0000-4000-9000-000000000029', 'article-noun', 'article', 'noun', 'default', 50),
  ('40000000-0000-4000-9000-00000000002a', 'artist-noun', 'artist', 'noun', 'default', 51),
  ('40000000-0000-4000-9000-00000000002b', 'as-preposition', 'as', 'preposition', 'default', 52),
  ('40000000-0000-4000-9000-00000000002c', 'ask-verb', 'ask', 'verb', 'default', 53),
  ('40000000-0000-4000-9000-00000000002d', 'at-preposition', 'at', 'preposition', 'default', 54),
  ('40000000-0000-4000-9000-00000000002e', 'august-noun', 'august', 'noun', 'default', 55),
  ('40000000-0000-4000-9000-00000000002f', 'aunt-noun', 'aunt', 'noun', 'default', 56),
  ('40000000-0000-4000-9000-000000000030', 'autumn-noun', 'autumn', 'noun', 'default', 57),
  ('40000000-0000-4000-9000-000000000031', 'away-verb', 'away', 'verb', 'default', 58),
  ('40000000-0000-4000-9000-000000000032', 'baby-noun', 'baby', 'noun', 'default', 59),
  ('40000000-0000-4000-9000-000000000033', 'back-verb', 'back', 'verb', 'default', 60),
  ('40000000-0000-4000-9000-000000000034', 'bad-adjective', 'bad', 'adjective', 'default', 61),
  ('40000000-0000-4000-9000-000000000035', 'bag-noun', 'bag', 'noun', 'default', 62),
  ('40000000-0000-4000-9000-000000000036', 'ball-noun', 'ball', 'noun', 'default', 63),
  ('40000000-0000-4000-9000-000000000037', 'banana-noun', 'banana', 'noun', 'default', 64),
  ('40000000-0000-4000-9000-000000000038', 'band-noun', 'band', 'noun', 'default', 65),
  ('40000000-0000-4000-9000-000000000039', 'bank-noun', 'bank', 'noun', 'default', 66),
  ('40000000-0000-4000-9000-00000000003a', 'bath-noun', 'bath', 'noun', 'default', 67),
  ('40000000-0000-4000-9000-00000000003b', 'bathroom-noun', 'bathroom', 'noun', 'default', 68),
  ('40000000-0000-4000-9000-00000000003c', 'be-verb', 'be', 'verb', 'default', 69),
  ('40000000-0000-4000-9000-00000000003d', 'beach-noun', 'beach', 'noun', 'default', 70),
  ('40000000-0000-4000-9000-00000000003e', 'beautiful-adjective', 'beautiful', 'adjective', 'default', 71),
  ('40000000-0000-4000-9000-00000000003f', 'because-conjunction', 'because', 'conjunction', 'default', 72),
  ('40000000-0000-4000-9000-000000000040', 'become-verb', 'become', 'verb', 'default', 73),
  ('40000000-0000-4000-9000-000000000041', 'bed-noun', 'bed', 'noun', 'default', 74),
  ('40000000-0000-4000-9000-000000000042', 'bedroom-noun', 'bedroom', 'noun', 'default', 75),
  ('40000000-0000-4000-9000-000000000043', 'beer-noun', 'beer', 'noun', 'default', 76),
  ('40000000-0000-4000-9000-000000000044', 'before-preposition', 'before', 'preposition', 'default', 77),
  ('40000000-0000-4000-9000-000000000045', 'begin-verb', 'begin', 'verb', 'default', 78),
  ('40000000-0000-4000-9000-000000000046', 'beginning-noun', 'beginning', 'noun', 'default', 79),
  ('40000000-0000-4000-9000-000000000047', 'behind-verb', 'behind', 'verb', 'default', 80),
  ('40000000-0000-4000-9000-000000000048', 'believe-verb', 'believe', 'verb', 'default', 81),
  ('40000000-0000-4000-9000-000000000049', 'below-verb', 'below', 'verb', 'default', 82),
  ('40000000-0000-4000-9000-00000000004a', 'best-adjective', 'best', 'adjective', 'default', 83),
  ('40000000-0000-4000-9000-00000000004b', 'better-adjective', 'better', 'adjective', 'default', 84),
  ('40000000-0000-4000-9000-00000000004c', 'between-preposition', 'between', 'preposition', 'default', 85),
  ('40000000-0000-4000-9000-00000000004d', 'bicycle-noun', 'bicycle', 'noun', 'default', 86),
  ('40000000-0000-4000-9000-00000000004e', 'big-adjective', 'big', 'adjective', 'default', 87),
  ('40000000-0000-4000-9000-00000000004f', 'bike-noun', 'bike', 'noun', 'default', 88),
  ('40000000-0000-4000-9000-000000000050', 'bill-noun', 'bill', 'noun', 'default', 89),
  ('40000000-0000-4000-9000-000000000051', 'ability-noun', 'ability', 'noun', 'default', 90),
  ('40000000-0000-4000-9000-000000000052', 'able-adjective', 'able', 'adjective', 'default', 91),
  ('40000000-0000-4000-9000-000000000053', 'abroad-verb', 'abroad', 'verb', 'default', 92),
  ('40000000-0000-4000-9000-000000000054', 'accept-verb', 'accept', 'verb', 'default', 93),
  ('40000000-0000-4000-9000-000000000055', 'accident-noun', 'accident', 'noun', 'default', 94),
  ('40000000-0000-4000-9000-000000000056', 'according-to-preposition', 'according to', 'preposition', 'default', 95),
  ('40000000-0000-4000-9000-000000000057', 'achieve-verb', 'achieve', 'verb', 'default', 96),
  ('40000000-0000-4000-9000-000000000058', 'act-verb', 'act', 'verb', 'default', 97),
  ('40000000-0000-4000-9000-000000000059', 'active-adjective', 'active', 'adjective', 'default', 98),
  ('40000000-0000-4000-9000-00000000005a', 'actually-verb', 'actually', 'verb', 'default', 99),
  ('40000000-0000-4000-9000-00000000005b', 'advantage-noun', 'advantage', 'noun', 'default', 100),
  ('40000000-0000-4000-9000-00000000005c', 'adventure-noun', 'adventure', 'noun', 'default', 101),
  ('40000000-0000-4000-9000-00000000005d', 'advertise-verb', 'advertise', 'verb', 'default', 102),
  ('40000000-0000-4000-9000-00000000005e', 'advertisement-noun', 'advertisement', 'noun', 'default', 103),
  ('40000000-0000-4000-9000-00000000005f', 'advertising-noun', 'advertising', 'noun', 'default', 104),
  ('40000000-0000-4000-9000-000000000060', 'affect-verb', 'affect', 'verb', 'default', 105),
  ('40000000-0000-4000-9000-000000000061', 'against-preposition', 'against', 'preposition', 'default', 106),
  ('40000000-0000-4000-9000-000000000062', 'ah-phrase', 'ah', 'phrase', 'default', 107),
  ('40000000-0000-4000-9000-000000000063', 'airline-noun', 'airline', 'noun', 'default', 108),
  ('40000000-0000-4000-9000-000000000064', 'alive-adjective', 'alive', 'adjective', 'default', 109),
  ('40000000-0000-4000-9000-000000000065', 'all-right-adjective', 'all right', 'adjective', 'default', 110),
  ('40000000-0000-4000-9000-000000000066', 'allow-verb', 'allow', 'verb', 'default', 111),
  ('40000000-0000-4000-9000-000000000067', 'almost-verb', 'almost', 'verb', 'default', 112),
  ('40000000-0000-4000-9000-000000000068', 'alone-adjective', 'alone', 'adjective', 'default', 113),
  ('40000000-0000-4000-9000-000000000069', 'along-verb', 'along', 'verb', 'default', 114),
  ('40000000-0000-4000-9000-00000000006a', 'already-verb', 'already', 'verb', 'default', 115),
  ('40000000-0000-4000-9000-00000000006b', 'alternative-noun', 'alternative', 'noun', 'default', 116),
  ('40000000-0000-4000-9000-00000000006c', 'although-conjunction', 'although', 'conjunction', 'default', 117),
  ('40000000-0000-4000-9000-00000000006d', 'among-preposition', 'among', 'preposition', 'default', 118),
  ('40000000-0000-4000-9000-00000000006e', 'amount-noun', 'amount', 'noun', 'default', 119),
  ('40000000-0000-4000-9000-00000000006f', 'ancient-adjective', 'ancient', 'adjective', 'default', 120),
  ('40000000-0000-4000-9000-000000000070', 'ankle-noun', 'ankle', 'noun', 'default', 121),
  ('40000000-0000-4000-9000-000000000071', 'any-more-verb', 'any more', 'verb', 'default', 122),
  ('40000000-0000-4000-9000-000000000072', 'anybody-pronoun', 'anybody', 'pronoun', 'default', 123),
  ('40000000-0000-4000-9000-000000000073', 'anyway-verb', 'anyway', 'verb', 'default', 124),
  ('40000000-0000-4000-9000-000000000074', 'anywhere-verb', 'anywhere', 'verb', 'default', 125),
  ('40000000-0000-4000-9000-000000000075', 'app-noun', 'app', 'noun', 'default', 126),
  ('40000000-0000-4000-9000-000000000076', 'appear-verb', 'appear', 'verb', 'default', 127),
  ('40000000-0000-4000-9000-000000000077', 'appearance-noun', 'appearance', 'noun', 'default', 128),
  ('40000000-0000-4000-9000-000000000078', 'apply-verb', 'apply', 'verb', 'default', 129),
  ('40000000-0000-4000-9000-000000000079', 'architect-noun', 'architect', 'noun', 'default', 130),
  ('40000000-0000-4000-9000-00000000007a', 'architecture-noun', 'architecture', 'noun', 'default', 131),
  ('40000000-0000-4000-9000-00000000007b', 'argue-verb', 'argue', 'verb', 'default', 132),
  ('40000000-0000-4000-9000-00000000007c', 'argument-noun', 'argument', 'noun', 'default', 133),
  ('40000000-0000-4000-9000-00000000007d', 'army-noun', 'army', 'noun', 'default', 134),
  ('40000000-0000-4000-9000-00000000007e', 'arrange-verb', 'arrange', 'verb', 'default', 135),
  ('40000000-0000-4000-9000-00000000007f', 'arrangement-noun', 'arrangement', 'noun', 'default', 136),
  ('40000000-0000-4000-9000-000000000080', 'asleep-adjective', 'asleep', 'adjective', 'default', 137),
  ('40000000-0000-4000-9000-000000000081', 'assistant-adjective', 'assistant', 'adjective', 'default', 138),
  ('40000000-0000-4000-9000-000000000082', 'athlete-noun', 'athlete', 'noun', 'default', 139),
  ('40000000-0000-4000-9000-000000000083', 'attack-noun', 'attack', 'noun', 'default', 140),
  ('40000000-0000-4000-9000-000000000084', 'attend-verb', 'attend', 'verb', 'default', 141),
  ('40000000-0000-4000-9000-000000000085', 'attention-phrase', 'attention', 'phrase', 'default', 142),
  ('40000000-0000-4000-9000-000000000086', 'attractive-adjective', 'attractive', 'adjective', 'default', 143),
  ('40000000-0000-4000-9000-000000000087', 'audience-noun', 'audience', 'noun', 'default', 144),
  ('40000000-0000-4000-9000-000000000088', 'author-noun', 'author', 'noun', 'default', 145),
  ('40000000-0000-4000-9000-000000000089', 'available-adjective', 'available', 'adjective', 'default', 146),
  ('40000000-0000-4000-9000-00000000008a', 'average-adjective', 'average', 'adjective', 'default', 147),
  ('40000000-0000-4000-9000-00000000008b', 'avoid-verb', 'avoid', 'verb', 'default', 148),
  ('40000000-0000-4000-9000-00000000008c', 'award-noun', 'award', 'noun', 'default', 149),
  ('40000000-0000-4000-9000-00000000008d', 'awful-adjective', 'awful', 'adjective', 'default', 150),
  ('40000000-0000-4000-9000-00000000008e', 'background-noun', 'background', 'noun', 'default', 151),
  ('40000000-0000-4000-9000-00000000008f', 'badly-verb', 'badly', 'verb', 'default', 152),
  ('40000000-0000-4000-9000-000000000090', 'bar-noun', 'bar', 'noun', 'default', 153),
  ('40000000-0000-4000-9000-000000000091', 'baseball-noun', 'baseball', 'noun', 'default', 154),
  ('40000000-0000-4000-9000-000000000092', 'based-adjective', 'based', 'adjective', 'default', 155),
  ('40000000-0000-4000-9000-000000000093', 'basketball-noun', 'basketball', 'noun', 'default', 156),
  ('40000000-0000-4000-9000-000000000094', 'bean-noun', 'bean', 'noun', 'default', 157),
  ('40000000-0000-4000-9000-000000000095', 'bear-noun', 'bear', 'noun', 'default', 158),
  ('40000000-0000-4000-9000-000000000096', 'beat-verb', 'beat', 'verb', 'default', 159),
  ('40000000-0000-4000-9000-000000000097', 'beef-noun', 'beef', 'noun', 'default', 160),
  ('40000000-0000-4000-9000-000000000098', 'behave-verb', 'behave', 'verb', 'default', 161),
  ('40000000-0000-4000-9000-000000000099', 'behaviour-noun', 'behaviour', 'noun', 'default', 162),
  ('40000000-0000-4000-9000-00000000009a', 'belong-verb', 'belong', 'verb', 'default', 163),
  ('40000000-0000-4000-9000-00000000009b', 'belt-noun', 'belt', 'noun', 'default', 164),
  ('40000000-0000-4000-9000-00000000009c', 'benefit-noun', 'benefit', 'noun', 'default', 165),
  ('40000000-0000-4000-9000-00000000009d', 'billion-determiner', 'billion', 'determiner', 'default', 166),
  ('40000000-0000-4000-9000-00000000009e', 'bin-noun', 'bin', 'noun', 'default', 167),
  ('40000000-0000-4000-9000-00000000009f', 'biology-noun', 'biology', 'noun', 'default', 168),
  ('40000000-0000-4000-9000-0000000000a0', 'birth-noun', 'birth', 'noun', 'default', 169),
  ('40000000-0000-4000-9000-0000000000a1', 'absolutely-verb', 'absolutely', 'verb', 'default', 170),
  ('40000000-0000-4000-9000-0000000000a2', 'academic-adjective', 'academic', 'adjective', 'default', 171),
  ('40000000-0000-4000-9000-0000000000a3', 'access-noun', 'access', 'noun', 'default', 172),
  ('40000000-0000-4000-9000-0000000000a4', 'accommodation-noun', 'accommodation', 'noun', 'default', 173),
  ('40000000-0000-4000-9000-0000000000a5', 'account-noun', 'account', 'noun', 'default', 174),
  ('40000000-0000-4000-9000-0000000000a6', 'achievement-noun', 'achievement', 'noun', 'default', 175),
  ('40000000-0000-4000-9000-0000000000a7', 'ad-noun', 'ad', 'noun', 'default', 176),
  ('40000000-0000-4000-9000-0000000000a8', 'addition-noun', 'addition', 'noun', 'default', 177),
  ('40000000-0000-4000-9000-0000000000a9', 'admire-verb', 'admire', 'verb', 'default', 178),
  ('40000000-0000-4000-9000-0000000000aa', 'admit-verb', 'admit', 'verb', 'default', 179),
  ('40000000-0000-4000-9000-0000000000ab', 'advanced-adjective', 'advanced', 'adjective', 'default', 180),
  ('40000000-0000-4000-9000-0000000000ac', 'advise-verb', 'advise', 'verb', 'default', 181),
  ('40000000-0000-4000-9000-0000000000ad', 'afford-verb', 'afford', 'verb', 'default', 182),
  ('40000000-0000-4000-9000-0000000000ae', 'aged-adjective', 'aged', 'adjective', 'default', 183),
  ('40000000-0000-4000-9000-0000000000af', 'agent-noun', 'agent', 'noun', 'default', 184),
  ('40000000-0000-4000-9000-0000000000b0', 'agreement-noun', 'agreement', 'noun', 'default', 185),
  ('40000000-0000-4000-9000-0000000000b1', 'ahead-verb', 'ahead', 'verb', 'default', 186),
  ('40000000-0000-4000-9000-0000000000b2', 'aim-noun', 'aim', 'noun', 'default', 187),
  ('40000000-0000-4000-9000-0000000000b3', 'alarm-noun', 'alarm', 'noun', 'default', 188),
  ('40000000-0000-4000-9000-0000000000b4', 'album-noun', 'album', 'noun', 'default', 189),
  ('40000000-0000-4000-9000-0000000000b5', 'alcohol-noun', 'alcohol', 'noun', 'default', 190),
  ('40000000-0000-4000-9000-0000000000b6', 'alcoholic-adjective', 'alcoholic', 'adjective', 'default', 191),
  ('40000000-0000-4000-9000-0000000000b7', 'amazed-adjective', 'amazed', 'adjective', 'default', 192),
  ('40000000-0000-4000-9000-0000000000b8', 'ambition-noun', 'ambition', 'noun', 'default', 193),
  ('40000000-0000-4000-9000-0000000000b9', 'ambitious-adjective', 'ambitious', 'adjective', 'default', 194),
  ('40000000-0000-4000-9000-0000000000ba', 'analyse-verb', 'analyse', 'verb', 'default', 195),
  ('40000000-0000-4000-9000-0000000000bb', 'analysis-noun', 'analysis', 'noun', 'default', 196),
  ('40000000-0000-4000-9000-0000000000bc', 'announce-verb', 'announce', 'verb', 'default', 197),
  ('40000000-0000-4000-9000-0000000000bd', 'announcement-noun', 'announcement', 'noun', 'default', 198),
  ('40000000-0000-4000-9000-0000000000be', 'annoy-verb', 'annoy', 'verb', 'default', 199),
  ('40000000-0000-4000-9000-0000000000bf', 'annoyed-adjective', 'annoyed', 'adjective', 'default', 200),
  ('40000000-0000-4000-9000-0000000000c0', 'annoying-adjective', 'annoying', 'adjective', 'default', 201),
  ('40000000-0000-4000-9000-0000000000c1', 'apart-verb', 'apart', 'verb', 'default', 202),
  ('40000000-0000-4000-9000-0000000000c2', 'apologize-verb', 'apologize', 'verb', 'default', 203),
  ('40000000-0000-4000-9000-0000000000c3', 'application-noun', 'application', 'noun', 'default', 204),
  ('40000000-0000-4000-9000-0000000000c4', 'appointment-noun', 'appointment', 'noun', 'default', 205),
  ('40000000-0000-4000-9000-0000000000c5', 'appreciate-verb', 'appreciate', 'verb', 'default', 206),
  ('40000000-0000-4000-9000-0000000000c6', 'approximately-verb', 'approximately', 'verb', 'default', 207),
  ('40000000-0000-4000-9000-0000000000c7', 'arrest-noun', 'arrest', 'noun', 'default', 208),
  ('40000000-0000-4000-9000-0000000000c8', 'arrival-noun', 'arrival', 'noun', 'default', 209),
  ('40000000-0000-4000-9000-0000000000c9', 'assignment-noun', 'assignment', 'noun', 'default', 210),
  ('40000000-0000-4000-9000-0000000000ca', 'assist-verb', 'assist', 'verb', 'default', 211),
  ('40000000-0000-4000-9000-0000000000cb', 'atmosphere-noun', 'atmosphere', 'noun', 'default', 212),
  ('40000000-0000-4000-9000-0000000000cc', 'attach-verb', 'attach', 'verb', 'default', 213),
  ('40000000-0000-4000-9000-0000000000cd', 'attitude-noun', 'attitude', 'noun', 'default', 214),
  ('40000000-0000-4000-9000-0000000000ce', 'attract-verb', 'attract', 'verb', 'default', 215),
  ('40000000-0000-4000-9000-0000000000cf', 'attraction-noun', 'attraction', 'noun', 'default', 216),
  ('40000000-0000-4000-9000-0000000000d0', 'authority-noun', 'authority', 'noun', 'default', 217),
  ('40000000-0000-4000-9000-0000000000d1', 'aware-adjective', 'aware', 'adjective', 'default', 218),
  ('40000000-0000-4000-9000-0000000000d2', 'backwards-verb', 'backwards', 'verb', 'default', 219),
  ('40000000-0000-4000-9000-0000000000d3', 'bake-verb', 'bake', 'verb', 'default', 220),
  ('40000000-0000-4000-9000-0000000000d4', 'balance-noun', 'balance', 'noun', 'default', 221),
  ('40000000-0000-4000-9000-0000000000d5', 'ban-noun', 'ban', 'noun', 'default', 222),
  ('40000000-0000-4000-9000-0000000000d6', 'base-noun', 'base', 'noun', 'default', 223),
  ('40000000-0000-4000-9000-0000000000d7', 'basic-adjective', 'basic', 'adjective', 'default', 224),
  ('40000000-0000-4000-9000-0000000000d8', 'basis-noun', 'basis', 'noun', 'default', 225),
  ('40000000-0000-4000-9000-0000000000d9', 'battery-noun', 'battery', 'noun', 'default', 226),
  ('40000000-0000-4000-9000-0000000000da', 'battle-noun', 'battle', 'noun', 'default', 227),
  ('40000000-0000-4000-9000-0000000000db', 'beauty-noun', 'beauty', 'noun', 'default', 228),
  ('40000000-0000-4000-9000-0000000000dc', 'bee-noun', 'bee', 'noun', 'default', 229),
  ('40000000-0000-4000-9000-0000000000dd', 'belief-noun', 'belief', 'noun', 'default', 230),
  ('40000000-0000-4000-9000-0000000000de', 'bell-noun', 'bell', 'noun', 'default', 231),
  ('40000000-0000-4000-9000-0000000000df', 'bend-noun', 'bend', 'noun', 'default', 232),
  ('40000000-0000-4000-9000-0000000000e0', 'bite-noun', 'bite', 'noun', 'default', 233),
  ('40000000-0000-4000-9000-0000000000e1', 'block-noun', 'block', 'noun', 'default', 234),
  ('40000000-0000-4000-9000-0000000000e2', 'board-verb', 'board', 'verb', 'default', 235),
  ('40000000-0000-4000-9000-0000000000e3', 'bomb-noun', 'bomb', 'noun', 'default', 236),
  ('40000000-0000-4000-9000-0000000000e4', 'border-noun', 'border', 'noun', 'default', 237),
  ('40000000-0000-4000-9000-0000000000e5', 'bother-verb', 'bother', 'verb', 'default', 238),
  ('40000000-0000-4000-9000-0000000000e6', 'branch-noun', 'branch', 'noun', 'default', 239),
  ('40000000-0000-4000-9000-0000000000e7', 'brand-noun', 'brand', 'noun', 'default', 240),
  ('40000000-0000-4000-9000-0000000000e8', 'brave-adjective', 'brave', 'adjective', 'default', 241),
  ('40000000-0000-4000-9000-0000000000e9', 'breath-noun', 'breath', 'noun', 'default', 242),
  ('40000000-0000-4000-9000-0000000000ea', 'breathe-verb', 'breathe', 'verb', 'default', 243),
  ('40000000-0000-4000-9000-0000000000eb', 'breathing-noun', 'breathing', 'noun', 'default', 244),
  ('40000000-0000-4000-9000-0000000000ec', 'bride-noun', 'bride', 'noun', 'default', 245),
  ('40000000-0000-4000-9000-0000000000ed', 'bubble-noun', 'bubble', 'noun', 'default', 246),
  ('40000000-0000-4000-9000-0000000000ee', 'bury-verb', 'bury', 'verb', 'default', 247),
  ('40000000-0000-4000-9000-0000000000ef', 'by-verb', 'by', 'verb', 'default', 248),
  ('40000000-0000-4000-9000-0000000000f0', 'calm-adjective', 'calm', 'adjective', 'default', 249),
  ('40000000-0000-4000-9000-0000000000f1', 'abandon-verb', 'abandon', 'verb', 'default', 250),
  ('40000000-0000-4000-9000-0000000000f2', 'absolute-adjective', 'absolute', 'adjective', 'default', 251),
  ('40000000-0000-4000-9000-0000000000f3', 'acceptable-adjective', 'acceptable', 'adjective', 'default', 252),
  ('40000000-0000-4000-9000-0000000000f4', 'accompany-verb', 'accompany', 'verb', 'default', 253),
  ('40000000-0000-4000-9000-0000000000f5', 'accurate-adjective', 'accurate', 'adjective', 'default', 254),
  ('40000000-0000-4000-9000-0000000000f6', 'accuse-verb', 'accuse', 'verb', 'default', 255),
  ('40000000-0000-4000-9000-0000000000f7', 'acknowledge-verb', 'acknowledge', 'verb', 'default', 256),
  ('40000000-0000-4000-9000-0000000000f8', 'acquire-verb', 'acquire', 'verb', 'default', 257),
  ('40000000-0000-4000-9000-0000000000f9', 'actual-adjective', 'actual', 'adjective', 'default', 258),
  ('40000000-0000-4000-9000-0000000000fa', 'adapt-verb', 'adapt', 'verb', 'default', 259),
  ('40000000-0000-4000-9000-0000000000fb', 'additional-adjective', 'additional', 'adjective', 'default', 260),
  ('40000000-0000-4000-9000-0000000000fc', 'administration-noun', 'administration', 'noun', 'default', 261),
  ('40000000-0000-4000-9000-0000000000fd', 'adopt-verb', 'adopt', 'verb', 'default', 262),
  ('40000000-0000-4000-9000-0000000000fe', 'advance-adjective', 'advance', 'adjective', 'default', 263),
  ('40000000-0000-4000-9000-0000000000ff', 'affair-noun', 'affair', 'noun', 'default', 264),
  ('40000000-0000-4000-9000-000000000100', 'afterwards-verb', 'afterwards', 'verb', 'default', 265),
  ('40000000-0000-4000-9000-000000000101', 'agency-noun', 'agency', 'noun', 'default', 266),
  ('40000000-0000-4000-9000-000000000102', 'agenda-noun', 'agenda', 'noun', 'default', 267),
  ('40000000-0000-4000-9000-000000000103', 'aggressive-adjective', 'aggressive', 'adjective', 'default', 268),
  ('40000000-0000-4000-9000-000000000104', 'aid-noun', 'aid', 'noun', 'default', 269),
  ('40000000-0000-4000-9000-000000000105', 'aircraft-noun', 'aircraft', 'noun', 'default', 270),
  ('40000000-0000-4000-9000-000000000106', 'alter-verb', 'alter', 'verb', 'default', 271),
  ('40000000-0000-4000-9000-000000000107', 'anger-noun', 'anger', 'noun', 'default', 272),
  ('40000000-0000-4000-9000-000000000108', 'angle-noun', 'angle', 'noun', 'default', 273),
  ('40000000-0000-4000-9000-000000000109', 'anniversary-noun', 'anniversary', 'noun', 'default', 274),
  ('40000000-0000-4000-9000-00000000010a', 'annual-adjective', 'annual', 'adjective', 'default', 275),
  ('40000000-0000-4000-9000-00000000010b', 'anxious-adjective', 'anxious', 'adjective', 'default', 276),
  ('40000000-0000-4000-9000-00000000010c', 'apparent-adjective', 'apparent', 'adjective', 'default', 277),
  ('40000000-0000-4000-9000-00000000010d', 'apparently-verb', 'apparently', 'verb', 'default', 278),
  ('40000000-0000-4000-9000-00000000010e', 'appeal-noun', 'appeal', 'noun', 'default', 279),
  ('40000000-0000-4000-9000-00000000010f', 'approach-noun', 'approach', 'noun', 'default', 280),
  ('40000000-0000-4000-9000-000000000110', 'appropriate-adjective', 'appropriate', 'adjective', 'default', 281),
  ('40000000-0000-4000-9000-000000000111', 'approval-noun', 'approval', 'noun', 'default', 282),
  ('40000000-0000-4000-9000-000000000112', 'approve-verb', 'approve', 'verb', 'default', 283),
  ('40000000-0000-4000-9000-000000000113', 'arise-verb', 'arise', 'verb', 'default', 284),
  ('40000000-0000-4000-9000-000000000114', 'armed-adjective', 'armed', 'adjective', 'default', 285),
  ('40000000-0000-4000-9000-000000000115', 'arms-noun', 'arms', 'noun', 'default', 286),
  ('40000000-0000-4000-9000-000000000116', 'artificial-adjective', 'artificial', 'adjective', 'default', 287),
  ('40000000-0000-4000-9000-000000000117', 'artistic-adjective', 'artistic', 'adjective', 'default', 288),
  ('40000000-0000-4000-9000-000000000118', 'ashamed-adjective', 'ashamed', 'adjective', 'default', 289),
  ('40000000-0000-4000-9000-000000000119', 'aspect-noun', 'aspect', 'noun', 'default', 290),
  ('40000000-0000-4000-9000-00000000011a', 'assess-verb', 'assess', 'verb', 'default', 291),
  ('40000000-0000-4000-9000-00000000011b', 'assessment-noun', 'assessment', 'noun', 'default', 292),
  ('40000000-0000-4000-9000-00000000011c', 'associate-verb', 'associate', 'verb', 'default', 293),
  ('40000000-0000-4000-9000-00000000011d', 'associated-adjective', 'associated', 'adjective', 'default', 294),
  ('40000000-0000-4000-9000-00000000011e', 'association-noun', 'association', 'noun', 'default', 295),
  ('40000000-0000-4000-9000-00000000011f', 'assume-verb', 'assume', 'verb', 'default', 296),
  ('40000000-0000-4000-9000-000000000120', 'attempt-noun', 'attempt', 'noun', 'default', 297),
  ('40000000-0000-4000-9000-000000000121', 'bacteria-noun', 'bacteria', 'noun', 'default', 298),
  ('40000000-0000-4000-9000-000000000122', 'barrier-noun', 'barrier', 'noun', 'default', 299),
  ('40000000-0000-4000-9000-000000000123', 'basically-verb', 'basically', 'verb', 'default', 300),
  ('40000000-0000-4000-9000-000000000124', 'beg-verb', 'beg', 'verb', 'default', 301),
  ('40000000-0000-4000-9000-000000000125', 'being-noun', 'being', 'noun', 'default', 302),
  ('40000000-0000-4000-9000-000000000126', 'bent-adjective', 'bent', 'adjective', 'default', 303),
  ('40000000-0000-4000-9000-000000000127', 'bet-noun', 'bet', 'noun', 'default', 304),
  ('40000000-0000-4000-9000-000000000128', 'beyond-verb', 'beyond', 'verb', 'default', 305),
  ('40000000-0000-4000-9000-000000000129', 'bitter-adjective', 'bitter', 'adjective', 'default', 306),
  ('40000000-0000-4000-9000-00000000012a', 'blame-noun', 'blame', 'noun', 'default', 307),
  ('40000000-0000-4000-9000-00000000012b', 'blind-adjective', 'blind', 'adjective', 'default', 308),
  ('40000000-0000-4000-9000-00000000012c', 'bond-noun', 'bond', 'noun', 'default', 309),
  ('40000000-0000-4000-9000-00000000012d', 'breast-noun', 'breast', 'noun', 'default', 310),
  ('40000000-0000-4000-9000-00000000012e', 'brief-adjective', 'brief', 'adjective', 'default', 311),
  ('40000000-0000-4000-9000-00000000012f', 'broad-adjective', 'broad', 'adjective', 'default', 312),
  ('40000000-0000-4000-9000-000000000130', 'broadcast-noun', 'broadcast', 'noun', 'default', 313),
  ('40000000-0000-4000-9000-000000000131', 'budget-noun', 'budget', 'noun', 'default', 314),
  ('40000000-0000-4000-9000-000000000132', 'bullet-noun', 'bullet', 'noun', 'default', 315),
  ('40000000-0000-4000-9000-000000000133', 'bunch-noun', 'bunch', 'noun', 'default', 316),
  ('40000000-0000-4000-9000-000000000134', 'burn-noun', 'burn', 'noun', 'default', 317),
  ('40000000-0000-4000-9000-000000000135', 'bush-noun', 'bush', 'noun', 'default', 318),
  ('40000000-0000-4000-9000-000000000136', 'but-preposition', 'but', 'preposition', 'default', 319),
  ('40000000-0000-4000-9000-000000000137', 'cable-noun', 'cable', 'noun', 'default', 320),
  ('40000000-0000-4000-9000-000000000138', 'calculate-verb', 'calculate', 'verb', 'default', 321),
  ('40000000-0000-4000-9000-000000000139', 'cancel-verb', 'cancel', 'verb', 'default', 322),
  ('40000000-0000-4000-9000-00000000013a', 'cancer-noun', 'cancer', 'noun', 'default', 323),
  ('40000000-0000-4000-9000-00000000013b', 'capable-adjective', 'capable', 'adjective', 'default', 324),
  ('40000000-0000-4000-9000-00000000013c', 'capacity-noun', 'capacity', 'noun', 'default', 325),
  ('40000000-0000-4000-9000-00000000013d', 'capture-noun', 'capture', 'noun', 'default', 326),
  ('40000000-0000-4000-9000-00000000013e', 'cast-noun', 'cast', 'noun', 'default', 327),
  ('40000000-0000-4000-9000-00000000013f', 'catch-noun', 'catch', 'noun', 'default', 328),
  ('40000000-0000-4000-9000-000000000140', 'cell-noun', 'cell', 'noun', 'default', 329)
on conflict (slug) do nothing;

-- 2. Ingest published vocabulary_entry_versions
insert into public.vocabulary_entry_versions (
  id, vocabulary_entry_id, version, term, definition_vi, example_sentence,
  topic, tags, difficulty, status, source_name, licence, published_at
) values
  ('41000000-0000-4000-9000-000000000001', '40000000-0000-4000-9000-000000000001', 1, 'about', 'về, khoảng chừng', 'It costs about $10.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000002', '40000000-0000-4000-9000-000000000002', 1, 'above', 'ở trên, phía trên', 'Put it on the shelf above.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000003', '40000000-0000-4000-9000-000000000003', 1, 'across', 'băng qua, ngang qua', 'It''s too wide. We can''t swim across.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000004', '40000000-0000-4000-9000-000000000004', 1, 'action', 'hành động, hoạt động', 'The time has come for action if these beautiful animals are to survive.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000005', '40000000-0000-4000-9000-000000000005', 1, 'activity', 'hoạt động học tập hoặc sinh hoạt', 'leisure/outdoor/recreational activities', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000006', '40000000-0000-4000-9000-000000000006', 1, 'actor', 'diễn viên nam', 'Both lead actors (= the ones who play the main parts) are outstanding.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000007', '40000000-0000-4000-9000-000000000007', 1, 'actress', 'diễn viên nữ', 'The Oscar-winning actress has taken a break from acting.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000008', '40000000-0000-4000-9000-000000000008', 1, 'add', 'thêm vào, cộng thêm', 'add something, Next add the flour.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000009', '40000000-0000-4000-9000-000000000009', 1, 'address', 'địa chỉ nhà hoặc cơ quan', 'What''s your name and address?', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000000a', '40000000-0000-4000-9000-00000000000a', 1, 'adult', 'người trưởng thành', 'Children must be accompanied by an adult.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000000b', '40000000-0000-4000-9000-00000000000b', 1, 'advice', 'lời khuyên, ý kiến chỉ dẫn', 'expert/practical/professional/medical advice', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000000c', '40000000-0000-4000-9000-00000000000c', 1, 'afraid', 'sợ hãi, lo lắng', 'Don''t be afraid.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'adjective'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000000d', '40000000-0000-4000-9000-00000000000d', 1, 'after', 'sau khi, sau đó', 'We''ll leave after lunch.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'preposition'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000000e', '40000000-0000-4000-9000-00000000000e', 1, 'afternoon', 'buổi chiều', 'this/yesterday/tomorrow afternoon', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000000f', '40000000-0000-4000-9000-00000000000f', 1, 'again', 'lặp lại, một lần nữa', 'This must never happen again.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000010', '40000000-0000-4000-9000-000000000010', 1, 'age', 'tuổi tác, thời đại', 'You''re the same age as my brother.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000011', '40000000-0000-4000-9000-000000000011', 1, 'ago', 'được dùng trong các cách diễn đạt thời gian với thì quá khứ đơn để cho biết điều gì đó đã xảy ra trong quá khứ bao lâu', 'two weeks/months/years ago', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000012', '40000000-0000-4000-9000-000000000012', 1, 'agree', 'đồng ý, tán thành', 'When he said that, I had to agree.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000013', '40000000-0000-4000-9000-000000000013', 1, 'air', 'không khí, bầu trời', 'Let''s go out for some fresh air.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000014', '40000000-0000-4000-9000-000000000014', 1, 'airport', 'sân bay, phi trường', 'Gatwick Airport', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000015', '40000000-0000-4000-9000-000000000015', 1, 'all', 'tất cả, toàn bộ', 'All horses are animals, but not all animals are horses.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'determiner'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000016', '40000000-0000-4000-9000-000000000016', 1, 'also', 'cũng, ngoài ra', 'She''s fluent in French and German. She also speaks a little Italian.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000017', '40000000-0000-4000-9000-000000000017', 1, 'always', 'luôn luôn, lúc nào cũng', 'There''s almost always somebody at home in the evenings.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000018', '40000000-0000-4000-9000-000000000018', 1, 'amazing', 'tuyệt vời, đáng kinh ngạc', 'an amazing feat/story/experience', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'adjective'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000019', '40000000-0000-4000-9000-000000000019', 1, 'and', 'và, cùng với', 'bread and butter', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'conjunction'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000001a', '40000000-0000-4000-9000-00000000001a', 1, 'angry', 'có cảm giác mạnh mẽ về điều gì đó mà bạn rất không thích hoặc về một tình huống không công bằng', 'Her behaviour really made me angry.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'adjective'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000001b', '40000000-0000-4000-9000-00000000001b', 1, 'animal', 'động vật, thú nuôi', 'the animals and birds of South America', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000001c', '40000000-0000-4000-9000-00000000001c', 1, 'another', 'một cái nữa; một điều hoặc một người bổ sung', 'Would you like another drink?', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'determiner'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000001d', '40000000-0000-4000-9000-00000000001d', 1, 'answer', 'câu trả lời, phản hồi', 'I rang the bell, but there was no answer.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000001e', '40000000-0000-4000-9000-00000000001e', 1, 'any', 'dùng với danh từ không đếm được hoặc số nhiều trong câu phủ định và câu hỏi, sau if hoặc if, và sau một số động từ như ngăn chặn, cấm, cấm, v.v. để chỉ một lượng hoặc một số thứ gì đó, dù lớn hay nhỏ', 'I didn''t eat any meat.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'determiner'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000001f', '40000000-0000-4000-9000-00000000001f', 1, 'anyone', 'được dùng thay cho someone trong câu phủ định và trong câu hỏi sau if/whether, và sau các động từ như ngăn chặn, cấm, tránh, v.v.', 'Is anyone there?', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'pronoun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000020', '40000000-0000-4000-9000-000000000020', 1, 'anything', 'dùng thay cho something trong câu phủ định và câu hỏi; sau nếu/liệu; và sau các động từ như ngăn chặn, cấm, tránh, v.v.', 'Would you like anything else?', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'pronoun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000021', '40000000-0000-4000-9000-000000000021', 1, 'apartment', 'một tập hợp các phòng để ở, thường ở một tầng của tòa nhà', 'an apartment building', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000022', '40000000-0000-4000-9000-000000000022', 1, 'apple', 'quả táo', 'Peel and core the apples.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000023', '40000000-0000-4000-9000-000000000023', 1, 'april', 'tháng thứ tư trong năm, giữa tháng ba và tháng năm', 'in April, She was born in April.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000024', '40000000-0000-4000-9000-000000000024', 1, 'area', 'khu vực, diện tích', 'to improve access to services in rural areas', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000025', '40000000-0000-4000-9000-000000000025', 1, 'arm', 'cánh tay', 'He escaped with only a broken arm.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000026', '40000000-0000-4000-9000-000000000026', 1, 'around', 'xung quanh, vòng quanh', 'He arrived around five o''clock.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000027', '40000000-0000-4000-9000-000000000027', 1, 'arrive', 'đến nơi, cập bến', 'I''ll wait until they arrive.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000028', '40000000-0000-4000-9000-000000000028', 1, 'art', 'nghệ thuật, mỹ thuật', 'modern/contemporary art', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000029', '40000000-0000-4000-9000-000000000029', 1, 'article', 'bài báo, điều khoản', 'to read/write/publish an article', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000002a', '40000000-0000-4000-9000-00000000002a', 1, 'artist', 'nghệ sĩ, họa sĩ', 'an exhibition of work by contemporary British artists', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000002b', '40000000-0000-4000-9000-00000000002b', 1, 'as', 'dùng để mô tả ai đó/cái gì đó có vẻ giống ai đó/cái gì khác', 'They were all dressed as clowns.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'preposition'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000002c', '40000000-0000-4000-9000-00000000002c', 1, 'ask', 'hỏi, yêu cầu', 'How old are you—if you don’t mind me/my asking?', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000002d', '40000000-0000-4000-9000-00000000002d', 1, 'at', 'dùng để nói cái gì/ai đó ở đâu hoặc cái gì đó xảy ra ở đâu', 'at the corner of the street', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'preposition'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000002e', '40000000-0000-4000-9000-00000000002e', 1, 'august', 'tháng 8 trong năm, từ tháng 7 đến tháng 9', 'She was born in August.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000002f', '40000000-0000-4000-9000-00000000002f', 1, 'aunt', 'chị gái của cha hoặc mẹ bạn; vợ của chú hoặc dì của bạn', 'Aunt Alice', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000030', '40000000-0000-4000-9000-000000000030', 1, 'autumn', 'mùa trong năm giữa mùa hè và mùa đông, khi lá đổi màu và thời tiết trở nên lạnh hơn', 'in the autumn of something, in the autumn of 2010', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000031', '40000000-0000-4000-9000-000000000031', 1, 'away', 'đến hoặc ở một khoảng cách với ai đó/cái gì đó trong không gian hoặc thời gian', 'The beach is a mile away.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000032', '40000000-0000-4000-9000-000000000032', 1, 'baby', 'em bé sơ sinh', 'The baby''s crying!', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000033', '40000000-0000-4000-9000-000000000033', 1, 'back', 'phía sau, lưng', 'When is he coming back to work?', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000034', '40000000-0000-4000-9000-000000000034', 1, 'bad', 'xấu, tồi tệ', 'I have some bad news for you, I''m afraid.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'adjective'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000035', '40000000-0000-4000-9000-000000000035', 1, 'bag', 'túi xách, cặp sách', 'He was carrying a heavy bag of groceries.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000036', '40000000-0000-4000-9000-000000000036', 1, 'ball', 'quả bóng', 'a golf/tennis/bowling/soccer ball', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000037', '40000000-0000-4000-9000-000000000037', 1, 'banana', 'quả chuối', 'a bunch of bananas', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000038', '40000000-0000-4000-9000-000000000038', 1, 'band', 'ban nhạc, nhóm nhạc', 'a rock/punk/jazz band', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000039', '40000000-0000-4000-9000-000000000039', 1, 'bank', 'ngân hàng, bờ sông', 'I don''t have much money in the bank at the end of the month.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000003a', '40000000-0000-4000-9000-00000000003a', 1, 'bath', 'bồn tắm, việc tắm bồn', 'I''m in the bath!', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000003b', '40000000-0000-4000-9000-00000000003b', 1, 'bathroom', 'phòng tắm', 'Go and wash your hands in the bathroom.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000003c', '40000000-0000-4000-9000-00000000003c', 1, 'be', 'được sử dụng khi bạn đặt tên cho người hoặc đồ vật, mô tả chúng hoặc cung cấp thêm thông tin về chúng', '+ noun, Today is Monday.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000003d', '40000000-0000-4000-9000-00000000003d', 1, 'beach', 'bãi biển', 'on the beach, tourists sunbathing on the beach', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000003e', '40000000-0000-4000-9000-00000000003e', 1, 'beautiful', 'xinh đẹp, tuyệt đẹp', 'a beautiful woman/girl', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'adjective'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000003f', '40000000-0000-4000-9000-00000000003f', 1, 'because', 'bởi vì, do', 'I did it because he told me to.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'conjunction'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000040', '40000000-0000-4000-9000-000000000040', 1, 'become', 'trở thành, trở nên', '+ adj., It soon became apparent that no one was going to come.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000041', '40000000-0000-4000-9000-000000000041', 1, 'bed', 'chiếc giường ngủ', 'a single/double bed', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000042', '40000000-0000-4000-9000-000000000042', 1, 'bedroom', 'phòng ngủ', 'the spare/guest bedroom', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000043', '40000000-0000-4000-9000-000000000043', 1, 'beer', 'bia, đồ uống có cồn', 'a pint/can/bottle of beer', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000044', '40000000-0000-4000-9000-000000000044', 1, 'before', 'sớm hơn ai/cái gì', 'before lunch', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'preposition'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000045', '40000000-0000-4000-9000-000000000045', 1, 'begin', 'bắt đầu, khởi đầu', 'Shall I begin?', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000046', '40000000-0000-4000-9000-000000000046', 1, 'beginning', 'sự khởi đầu, phần mở đầu', 'A story has to have a beginning, middle, and end.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000047', '40000000-0000-4000-9000-000000000047', 1, 'behind', 'ở đằng sau', 'She rode off down the road with the dog running behind.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000048', '40000000-0000-4000-9000-000000000048', 1, 'believe', 'tin tưởng, nghĩ rằng', 'believe somebody, I don''t believe you!', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000049', '40000000-0000-4000-9000-000000000049', 1, 'below', 'ở dưới, thấp hơn', 'They live on the floor below.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000004a', '40000000-0000-4000-9000-00000000004a', 1, 'best', 'tốt nhất, giỏi nhất', 'That''s the best movie I''ve ever seen!', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'adjective'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000004b', '40000000-0000-4000-9000-00000000004b', 1, 'better', 'tốt hơn, khá hơn', 'We''re hoping for better weather tomorrow.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'adjective'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000004c', '40000000-0000-4000-9000-00000000004c', 1, 'between', 'ở giữa hai đối tượng', 'Q comes between P and R in the English alphabet.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'preposition'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000004d', '40000000-0000-4000-9000-00000000004d', 1, 'bicycle', 'xe đạp 2 bánh', 'He got on his bicycle and rode off.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000004e', '40000000-0000-4000-9000-00000000004e', 1, 'big', 'to lớn, vĩ đại', 'a big man/house/increase', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'adjective'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000004f', '40000000-0000-4000-9000-00000000004f', 1, 'bike', 'xe đạp', 'I used to ride my bike around the neighbourhood for hours.', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000050', '40000000-0000-4000-9000-000000000050', 1, 'bill', 'hóa đơn thanh toán', 'the phone/electricity/gas bill', 'daily-life', ARRAY['oxford-3000', 'cefr:a1', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000051', '40000000-0000-4000-9000-000000000051', 1, 'ability', 'khả năng, năng lực thực hiện', 'People with the disease may lose their ability to communicate.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000052', '40000000-0000-4000-9000-000000000052', 1, 'able', 'có thể, có năng lực', 'You must be able to speak French for this job.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'adjective'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000053', '40000000-0000-4000-9000-000000000053', 1, 'abroad', 'ở nước ngoài, ra nước ngoài', 'to go/travel/live/study abroad', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000054', '40000000-0000-4000-9000-000000000054', 1, 'accept', 'chấp nhận, đồng ý tiếp nhận', 'He asked me to marry him and I accepted.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000055', '40000000-0000-4000-9000-000000000055', 1, 'accident', 'tai nạn, rủi ro ngoài ý muốn', 'a car/road/traffic accident', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000056', '40000000-0000-4000-9000-000000000056', 1, 'according to', 'như đã nêu hoặc báo cáo bởi ai đó/cái gì đó', 'According to Mick, it''s a great movie.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'preposition'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000057', '40000000-0000-4000-9000-000000000057', 1, 'achieve', 'đạt được, hoàn thành mục tiêu', 'He had finally achieved success.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000058', '40000000-0000-4000-9000-000000000058', 1, 'act', 'hành vi, đạo luật ban hành', 'act to do something, It is vital that we act to stop the destruction of the rainforests.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000059', '40000000-0000-4000-9000-000000000059', 1, 'active', 'năng động, chủ động', 'Staying physically active in later years can also keep you feeling younger.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'adjective'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000005a', '40000000-0000-4000-9000-00000000005a', 1, 'actually', 'thực sự, trên thực tế', 'What did she actually say?', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000005b', '40000000-0000-4000-9000-00000000005b', 1, 'advantage', 'lợi thế, điểm thuận lợi', 'a distinct/significant/huge advantage', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000005c', '40000000-0000-4000-9000-00000000005c', 1, 'adventure', 'chuyến phiêu lưu, mạo hiểm', 'her adventures travelling in Africa', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000005d', '40000000-0000-4000-9000-00000000005d', 1, 'advertise', 'quảng cáo, thông báo rộng rãi', 'If you want to attract customers you need to advertise.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000005e', '40000000-0000-4000-9000-00000000005e', 1, 'advertisement', 'mục quảng cáo, bài quảng cáo', 'a newspaper/television advertisement', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000005f', '40000000-0000-4000-9000-00000000005f', 1, 'advertising', 'hoạt động và ngành công nghiệp quảng cáo mọi thứ tới mọi người trên truyền hình, báo chí, trên internet, v.v.', 'Cigarette advertising has been banned.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000060', '40000000-0000-4000-9000-000000000060', 1, 'affect', 'ảnh hưởng đến, tác động', 'How will these changes affect us?', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000061', '40000000-0000-4000-9000-000000000061', 1, 'against', 'chống lại, phản đối', 'the fight against terrorism', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'preposition'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000062', '40000000-0000-4000-9000-000000000062', 1, 'ah', 'được sử dụng để thể hiện sự ngạc nhiên, hài lòng hoặc thông cảm hoặc khi bạn không đồng ý với ai đó', 'Ah, there you are!', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'phrase'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000063', '40000000-0000-4000-9000-000000000063', 1, 'airline', 'hãng hàng không', 'an airline pilot/passenger', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000064', '40000000-0000-4000-9000-000000000064', 1, 'alive', 'còn sống, tràn đầy sức sống', 'Is your mother still alive?', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'adjective'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000065', '40000000-0000-4000-9000-000000000065', 1, 'all right', 'chấp nhận được; một cách có thể chấp nhận được', 'Is the coffee all right?', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'adjective'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000066', '40000000-0000-4000-9000-000000000066', 1, 'allow', 'cho phép, cấp quyền', 'allow somebody/something to do something, His parents won''t allow him to stay out late.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000067', '40000000-0000-4000-9000-000000000067', 1, 'almost', 'hầu như, gần như', 'I like almost all of them.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000068', '40000000-0000-4000-9000-000000000068', 1, 'alone', 'cô đơn, một mình', 'not alone in, Tom is not alone in finding Rick hard to work with.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'adjective'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000069', '40000000-0000-4000-9000-000000000069', 1, 'along', 'dọc theo, đi cùng', 'I was just walking along singing to myself.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000006a', '40000000-0000-4000-9000-00000000006a', 1, 'already', 'đã rồi, từ trước đó', '‘Lunch?’ ‘No thanks, I''ve already eaten.’', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000006b', '40000000-0000-4000-9000-00000000006b', 1, 'alternative', 'phương án thay thế, sự lựa chọn', 'The car is too expensive so we''re trying to find a cheaper alternative.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000006c', '40000000-0000-4000-9000-00000000006c', 1, 'although', 'được sử dụng để giới thiệu một tuyên bố làm cho tuyên bố chính trong câu có vẻ đáng ngạc nhiên', 'Although the sun was shining, it wasn''t very warm.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'conjunction'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000006d', '40000000-0000-4000-9000-00000000006d', 1, 'among', 'được bao quanh bởi ai đó/cái gì đó; ở giữa ai/cái gì đó', 'a house among the trees', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'preposition'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000006e', '40000000-0000-4000-9000-00000000006e', 1, 'amount', 'số lượng, khối lượng', 'I was amazed at the amount he could eat.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000006f', '40000000-0000-4000-9000-00000000006f', 1, 'ancient', 'cổ đại, xa xưa', 'Archaeologists are excavating the ruined temples of this ancient civilization.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'adjective'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000070', '40000000-0000-4000-9000-000000000070', 1, 'ankle', 'khớp nối bàn chân với cẳng chân; phần hẹp của chân ngay phía trên khớp mắt cá chân', 'to sprain/break/twist your ankle', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000071', '40000000-0000-4000-9000-000000000071', 1, 'any more', 'thường được dùng ở cuối câu phủ định và ở cuối câu hỏi, với ý nghĩa ‘nữa’', 'She doesn''t live here any more.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000072', '40000000-0000-4000-9000-000000000072', 1, 'anybody', 'được dùng thay cho someone trong câu phủ định và trong câu hỏi sau if/whether và sau các động từ như ngăn chặn, cấm, tránh, v.v.', 'Is there anybody who can help me?', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'pronoun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000073', '40000000-0000-4000-9000-000000000073', 1, 'anyway', 'được sử dụng khi thêm một cái gì đó để hỗ trợ một ý tưởng hoặc lập luận', 'It''s too expensive and anyway the colour doesn''t suit you.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000074', '40000000-0000-4000-9000-000000000074', 1, 'anywhere', 'dùng trong câu phủ định và câu hỏi thay vì ở đâu đó', 'I can''t see it anywhere.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000075', '40000000-0000-4000-9000-000000000075', 1, 'app', 'một phần mềm mà bạn có thể tải xuống thiết bị như điện thoại thông minh hoặc máy tính bảng, chẳng hạn như để tra cứu thông tin hoặc chơi trò chơi', 'You first need to install the app on your device.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000076', '40000000-0000-4000-9000-000000000076', 1, 'appear', 'bắt đầu được nhìn thấy', 'Three days later a rash appeared.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000077', '40000000-0000-4000-9000-000000000077', 1, 'appearance', 'ngoại hình, sự xuất hiện', 'the physical/outward/external appearance of something', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000078', '40000000-0000-4000-9000-000000000078', 1, 'apply', 'nộp đơn, áp dụng', 'You should apply in person/by letter.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000079', '40000000-0000-4000-9000-000000000079', 1, 'architect', 'kiến trúc sư thiết kế', 'The house was designed by architect Louis Kahn.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000007a', '40000000-0000-4000-9000-00000000007a', 1, 'architecture', 'ngành kiến trúc công trình', 'to study architecture', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000007b', '40000000-0000-4000-9000-00000000007b', 1, 'argue', 'nói chuyện giận dữ với ai đó vì bạn không đồng ý với họ', 'My brothers are always arguing.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000007c', '40000000-0000-4000-9000-00000000007c', 1, 'argument', 'cuộc tranh luận, lý lẽ', 'to win/lose an argument', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000007d', '40000000-0000-4000-9000-00000000007d', 1, 'army', 'quân đội chính quy', 'The two opposing armies faced each other across the battlefield.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000007e', '40000000-0000-4000-9000-00000000007e', 1, 'arrange', 'sắp xếp, thu xếp', 'arrange something, The party was arranged quickly.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000007f', '40000000-0000-4000-9000-00000000007f', 1, 'arrangement', 'sự sắp đặt, thỏa thuận', 'Travel and accommodation arrangements have been finalized.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000080', '40000000-0000-4000-9000-000000000080', 1, 'asleep', 'đang ngủ', 'I waited until they were all fast asleep (= sleeping deeply).', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'adjective'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000081', '40000000-0000-4000-9000-000000000081', 1, 'assistant', 'trợ lý, người giúp việc', 'the assistant manager/director/commissioner', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'adjective'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000082', '40000000-0000-4000-9000-000000000082', 1, 'athlete', 'vận động viên thể thao', 'Olympic athletes', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000083', '40000000-0000-4000-9000-000000000083', 1, 'attack', 'một hành động sử dụng bạo lực để cố gắng làm tổn thương hoặc giết ai đó', 'Five people were killed in the attacks that took place last night.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000084', '40000000-0000-4000-9000-000000000084', 1, 'attend', 'có mặt tại một sự kiện', 'We''d like as many people as possible to attend.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000085', '40000000-0000-4000-9000-000000000085', 1, 'attention', 'được sử dụng để yêu cầu mọi người lắng nghe một cái gì đó đang được công bố', 'Attention, please! Passengers for flight KL412 are requested to go to gate 21 immediately.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'phrase'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000086', '40000000-0000-4000-9000-000000000086', 1, 'attractive', 'hấp dẫn, lôi cuốn', 'an attractive woman', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'adjective'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000087', '40000000-0000-4000-9000-000000000087', 1, 'audience', 'khán giả, người theo dõi', 'The audience was/were clapping for 10 minutes.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000088', '40000000-0000-4000-9000-000000000088', 1, 'author', 'tác giả cuốn sách hoặc bài viết', 'Who is your favourite author?', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000089', '40000000-0000-4000-9000-000000000089', 1, 'available', 'có sẵn, rảnh rỗi để sử dụng', 'available resources/data', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'adjective'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000008a', '40000000-0000-4000-9000-00000000008a', 1, 'average', 'trung bình, mức thông thường', 'The average age of participants was 52 years.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'adjective'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000008b', '40000000-0000-4000-9000-00000000008b', 1, 'avoid', 'tránh xa, né tránh', 'avoid something, to avoid conflict/confrontation', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000008c', '40000000-0000-4000-9000-00000000008c', 1, 'award', 'giải thưởng, phần thưởng', 'He was nominated for the best actor award.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000008d', '40000000-0000-4000-9000-00000000008d', 1, 'awful', 'rất tệ hoặc khó chịu', 'That''s an awful colour.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'adjective'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000008e', '40000000-0000-4000-9000-00000000008e', 1, 'background', 'bối cảnh, lý lịch nền tảng', 'somebody''s ethnic/genetic/cultural background', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000008f', '40000000-0000-4000-9000-00000000008f', 1, 'badly', 'rất tệ, một cách nghiêm trọng', 'to play/sing badly', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000090', '40000000-0000-4000-9000-000000000090', 1, 'bar', 'quầy bar, thanh chắn', 'We arranged to meet in a bar called the Flamingo.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000091', '40000000-0000-4000-9000-000000000091', 1, 'baseball', 'môn bóng chày', 'a baseball bat/team/cap/fan/player/game', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000092', '40000000-0000-4000-9000-000000000092', 1, 'based', 'nếu một thứ dựa trên một thứ khác, nó sẽ sử dụng nó hoặc được phát triển từ nó', 'The movie is based on a real-life incident.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'adjective'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000093', '40000000-0000-4000-9000-000000000093', 1, 'basketball', 'một trò chơi được chơi bởi hai đội, mỗi đội gồm năm người, sử dụng một quả bóng lớn mà người chơi cố gắng ném vào lưới cao treo trên vòng tròn', 'a basketball game/coach/team/player', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000094', '40000000-0000-4000-9000-000000000094', 1, 'bean', 'một hạt hoặc vỏ chứa hạt của cây leo, được ăn như một loại rau. Có một số loại đậu và cây trồng trên đó còn được gọi là đậu.', 'green beans', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000095', '40000000-0000-4000-9000-000000000095', 1, 'bear', 'một loài động vật hoang dã nặng nề với bộ lông dày và móng vuốt sắc nhọn (= phần nhọn ở đầu bàn chân của nó). Có rất nhiều loại gấu.', 'a black bear', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000096', '40000000-0000-4000-9000-000000000096', 1, 'beat', 'đánh bại ai đó trong một trò chơi hoặc cuộc thi', 'beat somebody at something, He beat me at chess.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000097', '40000000-0000-4000-9000-000000000097', 1, 'beef', 'thịt đến từ một con bò', 'roast beef', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000098', '40000000-0000-4000-9000-000000000098', 1, 'behave', 'cư xử, hành xử có chừng mực', 'The doctor behaved very unprofessionally.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000099', '40000000-0000-4000-9000-000000000099', 1, 'behaviour', 'hành vi ứng xử', 'good/bad behaviour', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000009a', '40000000-0000-4000-9000-00000000009a', 1, 'belong', 'thuộc về ai hoặc nơi nào', 'Where do these plates belong (= where are they kept)?', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'verb'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000009b', '40000000-0000-4000-9000-00000000009b', 1, 'belt', 'một miếng da, vải, v.v. dài và hẹp mà bạn đeo quanh phần giữa cơ thể', 'to do up/fasten/tighten a belt', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000009c', '40000000-0000-4000-9000-00000000009c', 1, 'benefit', 'lợi ích, trợ cấp xã hội', 'Freedom of information brings great benefits.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000009d', '40000000-0000-4000-9000-00000000009d', 1, 'billion', '1 000 000 000; một nghìn triệu', 'Worldwide sales reached 2.5 billion.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'determiner'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000009e', '40000000-0000-4000-9000-00000000009e', 1, 'bin', 'một thùng chứa mà bạn bỏ rác vào', 'a rubbish bin', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000009f', '40000000-0000-4000-9000-00000000009f', 1, 'biology', 'môn sinh học', 'a degree in biology', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000a0', '40000000-0000-4000-9000-0000000000a0', 1, 'birth', 'thời điểm em bé chào đời; quá trình được sinh ra', 'at birth, The baby weighed three kilos at birth.', 'communication', ARRAY['oxford-3000', 'cefr:a2', 'noun'], 'beginner', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000a1', '40000000-0000-4000-9000-0000000000a1', 1, 'absolutely', 'hoàn toàn, chắc chắn 100%', 'You''re absolutely right.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000a2', '40000000-0000-4000-9000-0000000000a2', 1, 'academic', 'thuộc về học thuật, nghiên cứu', 'high/low academic standards', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'adjective'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000a3', '40000000-0000-4000-9000-0000000000a3', 1, 'access', 'quyền truy cập, tiếp cận', 'High-speed internet access has become a necessity.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000a4', '40000000-0000-4000-9000-0000000000a4', 1, 'accommodation', 'chỗ ở, nơi lưu trú', 'rented/temporary accommodation', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000a5', '40000000-0000-4000-9000-0000000000a5', 1, 'account', 'tài khoản, bản tường thuật', 'I don''t have a bank account.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000a6', '40000000-0000-4000-9000-0000000000a6', 1, 'achievement', 'thành tựu đáng ghi nhận', 'the greatest scientific achievement of the decade', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000a7', '40000000-0000-4000-9000-0000000000a7', 1, 'ad', 'thông báo, hình ảnh hoặc đoạn phim cho mọi người biết về sản phẩm, công việc hoặc dịch vụ', 'The TV ads were first run last year.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000a8', '40000000-0000-4000-9000-0000000000a8', 1, 'addition', 'một thứ được thêm vào một cái gì đó khác', 'All of these technologies are fairly recent additions.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000a9', '40000000-0000-4000-9000-0000000000a9', 1, 'admire', 'tôn trọng ai đó vì những gì họ đã làm hoặc tôn trọng phẩm chất của họ', 'admire somebody/something, I really admire your enthusiasm.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000aa', '40000000-0000-4000-9000-0000000000aa', 1, 'admit', 'thừa nhận, nhận lỗi', 'It was a stupid thing to do, I admit.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000ab', '40000000-0000-4000-9000-0000000000ab', 1, 'advanced', 'nâng cao, cấp tiến', 'Scientists are working on highly advanced technology to replace fossil fuels.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'adjective'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000ac', '40000000-0000-4000-9000-0000000000ac', 1, 'advise', 'nói với ai đó những gì bạn nghĩ họ nên làm trong một tình huống cụ thể', 'advise against doing something, I would strongly advise against going out on your own.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000ad', '40000000-0000-4000-9000-0000000000ad', 1, 'afford', 'có đủ khả năng chi trả tài chính', 'afford something, Can we afford a new car?', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000ae', '40000000-0000-4000-9000-0000000000ae', 1, 'aged', 'ở độ tuổi của', 'They have two children aged six and nine.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'adjective'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000af', '40000000-0000-4000-9000-0000000000af', 1, 'agent', 'người đại diện, đặc vụ', 'Our agent in New York deals with all US sales.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000b0', '40000000-0000-4000-9000-0000000000b0', 1, 'agreement', 'một sự sắp xếp, một lời hứa hoặc một hợp đồng được thực hiện với ai đó', 'an international peace agreement', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000b1', '40000000-0000-4000-9000-0000000000b1', 1, 'ahead', 'tiến xa hơn về không gian hoặc thời gian; ở phía trước', 'I''ll run ahead and warn them.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000b2', '40000000-0000-4000-9000-0000000000b2', 1, 'aim', 'mục tiêu nhắm tới', 'the stated aims of the study', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000b3', '40000000-0000-4000-9000-0000000000b3', 1, 'alarm', 'chuông báo động, sự hoảng hốt', 'She decided to sound the alarm (= warn people that the situation was dangerous).', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000b4', '40000000-0000-4000-9000-0000000000b4', 1, 'album', 'một cuốn sách trong đó bạn lưu giữ những bức ảnh, con tem, v.v.', 'a photo album', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000b5', '40000000-0000-4000-9000-0000000000b5', 1, 'alcohol', 'đồ uống như bia, rượu, v.v. có thể khiến người ta say', 'He never drinks alcohol.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000b6', '40000000-0000-4000-9000-0000000000b6', 1, 'alcoholic', 'kết nối với hoặc có chứa rượu', 'alcoholic drinks/beverages', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'adjective'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000b7', '40000000-0000-4000-9000-0000000000b7', 1, 'amazed', 'rất ngạc nhiên', 'an amazed look', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'adjective'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000b8', '40000000-0000-4000-9000-0000000000b8', 1, 'ambition', 'hoài bão, khát vọng lớn', 'She had fulfilled her lifelong ambition.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000b9', '40000000-0000-4000-9000-0000000000b9', 1, 'ambitious', 'quyết tâm thành công, giàu có, quyền lực, v.v.', 'a fiercely ambitious young manager', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'adjective'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000ba', '40000000-0000-4000-9000-0000000000ba', 1, 'analyse', 'phân tích chi tiết số liệu hoặc dữ kiện', 'analyse something, The job involves collecting and analysing data.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000bb', '40000000-0000-4000-9000-0000000000bb', 1, 'analysis', 'bản phân tích chuyên sâu', 'statistical/data analysis', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000bc', '40000000-0000-4000-9000-0000000000bc', 1, 'announce', 'nói với mọi người điều gì đó một cách chính thức, đặc biệt là về một quyết định, kế hoạch, v.v.', 'announce something, He officially announced his intention to resign at today''s press conference.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000bd', '40000000-0000-4000-9000-0000000000bd', 1, 'announcement', 'thông báo chính thức', 'to make an announcement', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000be', '40000000-0000-4000-9000-0000000000be', 1, 'annoy', 'làm phiền, quấy rầy', 'annoy somebody, His constant joking was beginning to annoy her.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000bf', '40000000-0000-4000-9000-0000000000bf', 1, 'annoyed', 'hơi tức giận', 'annoyed with somebody at/about something, He was beginning to get very annoyed with me about my carelessness.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'adjective'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000c0', '40000000-0000-4000-9000-0000000000c0', 1, 'annoying', 'làm cho ai đó cảm thấy hơi tức giận', 'This interruption is very annoying.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'adjective'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000c1', '40000000-0000-4000-9000-0000000000c1', 1, 'apart', 'cách nhau một khoảng cách, về không gian hoặc thời gian', 'The two houses stood 500 metres apart.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000c2', '40000000-0000-4000-9000-0000000000c2', 1, 'apologize', 'xin lỗi chân thành', 'Why should I apologize?', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000c3', '40000000-0000-4000-9000-0000000000c3', 1, 'application', 'một yêu cầu chính thức (thường được viết) về một điều gì đó, chẳng hạn như một công việc, sự cho phép làm điều gì đó hoặc một vị trí tại trường cao đẳng hoặc đại học', 'a planning/patent/visa application', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000c4', '40000000-0000-4000-9000-0000000000c4', 1, 'appointment', 'sự sắp xếp chính thức để gặp hoặc thăm ai đó vào một thời điểm cụ thể, đặc biệt vì lý do liên quan đến công việc của họ', 'I''ve got a dental appointment at 3 o''clock.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000c5', '40000000-0000-4000-9000-0000000000c5', 1, 'appreciate', 'đánh giá cao, biết ơn sâu sắc', 'Over the years he came to appreciate the beauty and tranquillity of the river.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000c6', '40000000-0000-4000-9000-0000000000c6', 1, 'approximately', 'được sử dụng để chỉ ra rằng một cái gì đó gần như, nhưng không hoàn toàn, chính xác hoặc chính xác', 'The journey took approximately seven hours.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000c7', '40000000-0000-4000-9000-0000000000c7', 1, 'arrest', 'bắt giữ ai đó', 'The police made several arrests.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000c8', '40000000-0000-4000-9000-0000000000c8', 1, 'arrival', 'một hành động đến hoặc được đưa đến một nơi', 'We apologize for the late arrival of the train.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000c9', '40000000-0000-4000-9000-0000000000c9', 1, 'assignment', 'một nhiệm vụ hoặc một phần công việc mà ai đó được giao làm, thường là một phần công việc hoặc nghiên cứu của họ', 'Students are required to complete all homework assignments.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000ca', '40000000-0000-4000-9000-0000000000ca', 1, 'assist', 'giúp ai đó làm gì đó', 'Anyone willing to assist can contact this number.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000cb', '40000000-0000-4000-9000-0000000000cb', 1, 'atmosphere', 'hỗn hợp khí bao quanh trái đất', 'Wind power doesn''t release carbon dioxide into the atmosphere.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000cc', '40000000-0000-4000-9000-0000000000cc', 1, 'attach', 'buộc chặt hoặc nối cái này với cái khác', 'attach something, I attach a copy of my notes for your information.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000cd', '40000000-0000-4000-9000-0000000000cd', 1, 'attitude', 'thái độ đối với sự việc', 'attitude towards somebody/something, These societies have to change their attitudes towards women.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000ce', '40000000-0000-4000-9000-0000000000ce', 1, 'attract', 'thu hút, lôi cuốn sự chú ý', 'be attracted by somebody/something, I had always been attracted by the idea of working abroad.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000cf', '40000000-0000-4000-9000-0000000000cf', 1, 'attraction', 'điểm tham quan hấp dẫn', 'Buckingham Palace is a major tourist attraction.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000d0', '40000000-0000-4000-9000-0000000000d0', 1, 'authority', 'chính quyền, người có thẩm quyền', 'in a position of authority', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000d1', '40000000-0000-4000-9000-0000000000d1', 1, 'aware', 'nhận thức được, biết rõ', 'As you''re aware, this is not a new problem.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'adjective'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000d2', '40000000-0000-4000-9000-0000000000d2', 1, 'backwards', 'hướng tới một địa điểm hoặc vị trí ở phía sau', 'I lost my balance and fell backwards.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000d3', '40000000-0000-4000-9000-0000000000d3', 1, 'bake', 'nấu thức ăn trong lò mà không cần thêm chất béo hoặc chất lỏng; nấu theo cách này', 'bake (something), to bake bread/biscuits/cookies', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000d4', '40000000-0000-4000-9000-0000000000d4', 1, 'balance', 'một tình huống trong đó những thứ khác nhau tồn tại với số lượng bằng nhau, chính xác hoặc tốt', 'This newspaper maintains a good balance in its presentation of different opinions.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000d5', '40000000-0000-4000-9000-0000000000d5', 1, 'ban', 'một quy tắc chính thức nói rằng điều gì đó không được phép', 'a smoking ban', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000d6', '40000000-0000-4000-9000-0000000000d6', 1, 'base', 'căn cứ điểm, nền móng vững chắc', 'The lamp has a heavy base.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000d7', '40000000-0000-4000-9000-0000000000d7', 1, 'basic', 'cơ bản, nền tảng', 'basic information/facts/ideas', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'adjective'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000d8', '40000000-0000-4000-9000-0000000000d8', 1, 'basis', 'nền tảng, căn cứ xác định', 'We are in contact on a regular basis.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000d9', '40000000-0000-4000-9000-0000000000d9', 1, 'battery', 'pin sạc năng lượng', 'to replace the batteries', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000da', '40000000-0000-4000-9000-0000000000da', 1, 'battle', 'trận chiến, sự tranh đấu', 'Napoleon was defeated at the Battle of Waterloo.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000db', '40000000-0000-4000-9000-0000000000db', 1, 'beauty', 'vẻ đẹp, nét duyên dáng', 'beauty of something, the beauty of the sunset/of poetry/of his singing', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000dc', '40000000-0000-4000-9000-0000000000dc', 1, 'bee', 'con ong', 'Bees were buzzing in the clover.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000dd', '40000000-0000-4000-9000-0000000000dd', 1, 'belief', 'niềm tin, đức tin', 'belief in something/somebody, I admire his passionate belief in what he is doing.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000de', '40000000-0000-4000-9000-0000000000de', 1, 'bell', 'cái chuông', 'A peal of church bells rang out in the distance.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000df', '40000000-0000-4000-9000-0000000000df', 1, 'bend', 'một khúc cua hoặc khúc cua, đặc biệt là trên đường hoặc sông', 'a sharp bend in the road', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000e0', '40000000-0000-4000-9000-0000000000e0', 1, 'bite', 'một hành động cắn', 'The dog gave me a playful bite.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000e1', '40000000-0000-4000-9000-0000000000e1', 1, 'block', 'khối bê tông, chặn đường đi', 'The houses are made of concrete blocks with tin roofs.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000e2', '40000000-0000-4000-9000-0000000000e2', 1, 'board', 'tấm bảng, hội đồng quản trị', 'Passengers are waiting to board.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000e3', '40000000-0000-4000-9000-0000000000e3', 1, 'bomb', 'một loại vũ khí được thiết kế để phát nổ vào một thời điểm cụ thể hoặc khi nó bị rơi hoặc ném', 'a bomb goes off/explodes', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000e4', '40000000-0000-4000-9000-0000000000e4', 1, 'border', 'biên giới giữa các quốc gia', 'I live in a small town in the US, near the Canadian border.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000e5', '40000000-0000-4000-9000-0000000000e5', 1, 'bother', 'bận tâm, làm phiền lòng', '‘Shall I wait?’ ‘No, don''t bother’.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000e6', '40000000-0000-4000-9000-0000000000e6', 1, 'branch', 'chi nhánh, cành cây', 'She climbed the tree and hid in the branches.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000e7', '40000000-0000-4000-9000-0000000000e7', 1, 'brand', 'một loại sản phẩm, dịch vụ, v.v. được sản xuất hoặc cung cấp bởi một công ty cụ thể dưới một tên cụ thể', 'a well-known brand of toothpaste', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000e8', '40000000-0000-4000-9000-0000000000e8', 1, 'brave', 'dũng cảm, gan dạ', 'brave men and women', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'adjective'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000e9', '40000000-0000-4000-9000-0000000000e9', 1, 'breath', 'không khí bạn hít vào phổi và gửi đi lần nữa', 'His breath smelt of garlic.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000ea', '40000000-0000-4000-9000-0000000000ea', 1, 'breathe', 'đưa không khí vào phổi và đưa nó ra ngoài qua mũi hoặc miệng', 'He breathed deeply before speaking again.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000eb', '40000000-0000-4000-9000-0000000000eb', 1, 'breathing', 'hành động đưa không khí vào phổi và đưa nó ra ngoài lần nữa', 'Her breathing became steady and she fell asleep.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000ec', '40000000-0000-4000-9000-0000000000ec', 1, 'bride', 'một người phụ nữ trong ngày cưới, hoặc ngay trước hoặc ngay sau ngày cưới', 'a toast to the bride and groom', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000ed', '40000000-0000-4000-9000-0000000000ed', 1, 'bubble', 'một quả cầu không khí hoặc khí trong chất lỏng, hoặc một quả cầu không khí bên trong một chất rắn như thủy tinh', 'champagne bubbles', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'noun'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000ee', '40000000-0000-4000-9000-0000000000ee', 1, 'bury', 'đặt xác chết xuống đất', 'bury somebody/something, They killed her and buried her body.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000ef', '40000000-0000-4000-9000-0000000000ef', 1, 'by', 'quá khứ', 'Just drive by. Don''t stop.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'verb'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000f0', '40000000-0000-4000-9000-0000000000f0', 1, 'calm', 'không hào hứng, lo lắng hay buồn bã', 'It is important to keep calm in an emergency.', 'academic-prep', ARRAY['oxford-3000', 'cefr:b1', 'adjective'], 'intermediate', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000f1', '40000000-0000-4000-9000-0000000000f1', 1, 'abandon', 'từ bỏ, ruồng bỏ không chăm sóc', 'abandon somebody, The baby had been abandoned by its mother.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'verb'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000f2', '40000000-0000-4000-9000-0000000000f2', 1, 'absolute', 'tổng thể và đầy đủ', 'I''ve joined a class for absolute beginners.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'adjective'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000f3', '40000000-0000-4000-9000-0000000000f3', 1, 'acceptable', 'được hầu hết mọi người trong xã hội đồng ý hoặc chấp thuận', 'Children must learn socially acceptable behaviour.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'adjective'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000f4', '40000000-0000-4000-9000-0000000000f4', 1, 'accompany', 'đồng hành, đi cùng ai đó', 'accompany somebody/something + adv./prep., His wife accompanied him on the trip.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'verb'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000f5', '40000000-0000-4000-9000-0000000000f5', 1, 'accurate', 'chính xác, không có sai sót', 'an accurate description/picture of something', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'adjective'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000f6', '40000000-0000-4000-9000-0000000000f6', 1, 'accuse', 'buộc tội, cáo buộc hành vi vi phạm', 'accuse somebody of something, to accuse somebody of murder/a crime', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'verb'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000f7', '40000000-0000-4000-9000-0000000000f7', 1, 'acknowledge', 'thừa nhận sự thật, tri ân đóng góp', 'acknowledge something, She refuses to acknowledge the need for reform.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'verb'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000f8', '40000000-0000-4000-9000-0000000000f8', 1, 'acquire', 'tiếp thu kỹ năng hoặc mua lại tài sản', 'She has acquired a good knowledge of English.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'verb'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000f9', '40000000-0000-4000-9000-0000000000f9', 1, 'actual', 'được sử dụng để nhấn mạnh một cái gì đó là có thật hoặc tồn tại trong thực tế', 'James looks younger than his wife but in actual fact (= really) he is five years older.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'adjective'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000fa', '40000000-0000-4000-9000-0000000000fa', 1, 'adapt', 'thay đổi hành vi của bạn để giải quyết thành công hơn với một tình huống mới', 'It''s amazing how soon you adapt.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'verb'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000fb', '40000000-0000-4000-9000-0000000000fb', 1, 'additional', 'nhiều hơn lần đầu tiên được đề cập hoặc như thường lệ', 'additional resources/funds/security/funding/costs', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'adjective'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000fc', '40000000-0000-4000-9000-0000000000fc', 1, 'administration', 'các hoạt động được thực hiện nhằm lập kế hoạch, tổ chức và điều hành một doanh nghiệp, trường học hoặc tổ chức khác', 'Administration costs are passed on to the customer.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000fd', '40000000-0000-4000-9000-0000000000fd', 1, 'adopt', 'nhận nuôi, tiếp nhận chính sách', 'a campaign to encourage childless couples to adopt', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'verb'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000fe', '40000000-0000-4000-9000-0000000000fe', 1, 'advance', 'tiến bộ, nâng cao trình độ', 'Please give us advance warning of any changes.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'adjective'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-0000000000ff', '40000000-0000-4000-9000-0000000000ff', 1, 'affair', 'sự kiện được công chúng quan tâm hoặc có tầm quan trọng về mặt chính trị', 'world/international affairs', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000100', '40000000-0000-4000-9000-000000000100', 1, 'afterwards', 'vào thời điểm sau đó; sau một sự kiện đã được đề cập', 'Afterwards she was sorry for what she''d said.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'verb'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000101', '40000000-0000-4000-9000-000000000101', 1, 'agency', 'cơ quan, đại lý dịch vụ', 'She works for an advertising agency.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000102', '40000000-0000-4000-9000-000000000102', 1, 'agenda', 'chương trình nghị sự, lịch trình', 'We have a very full agenda of issues to discuss.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000103', '40000000-0000-4000-9000-000000000103', 1, 'aggressive', 'hung hăng, quyết liệt', 'Seals have been known to exhibit aggressive behaviour towards swimmers.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'adjective'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000104', '40000000-0000-4000-9000-000000000104', 1, 'aid', 'tiền, thực phẩm, v.v. được gửi để giúp đỡ các nước có hoàn cảnh khó khăn', 'humanitarian/food/medical aid', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000105', '40000000-0000-4000-9000-000000000105', 1, 'aircraft', 'bất kỳ phương tiện nào có thể bay và chở hàng hóa hoặc hành khách', 'fighter/transport/military aircraft', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000106', '40000000-0000-4000-9000-000000000106', 1, 'alter', 'thay đổi, điều chỉnh nhỏ', 'Prices did not alter significantly during 2019.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'verb'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000107', '40000000-0000-4000-9000-000000000107', 1, 'anger', 'cảm giác mạnh mẽ mà bạn có khi có điều gì đó xảy ra mà bạn cho là tồi tệ và không công bằng', 'She had to find a way to express her pent-up anger.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000108', '40000000-0000-4000-9000-000000000108', 1, 'angle', 'khoảng cách giữa hai đường hoặc bề mặt nối với nhau, được đo bằng độ', 'a 45° angle', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000109', '40000000-0000-4000-9000-000000000109', 1, 'anniversary', 'ngày kỷ niệm hàng năm', 'on the anniversary of his wife’s death', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000010a', '40000000-0000-4000-9000-00000000010a', 1, 'annual', 'xảy ra hoặc thực hiện mỗi năm một lần', 'an annual meeting/event/report/conference', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'adjective'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000010b', '40000000-0000-4000-9000-00000000010b', 1, 'anxious', 'lo âu, bồn chồn lo lắng', 'The bus was late and Sue began to get anxious.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'adjective'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000010c', '40000000-0000-4000-9000-00000000010c', 1, 'apparent', 'rõ ràng, dễ thấy bề ngoài', 'Their devotion was apparent.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'adjective'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000010d', '40000000-0000-4000-9000-00000000010d', 1, 'apparently', 'theo những gì bạn đã nghe hoặc đọc; theo cách một cái gì đó xuất hiện', 'Apparently they are getting divorced soon.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'verb'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000010e', '40000000-0000-4000-9000-00000000010e', 1, 'appeal', 'kháng cáo, sức hút lôi cuốn', 'appeal for something, to launch a TV appeal for donations to the charity', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000010f', '40000000-0000-4000-9000-00000000010f', 1, 'approach', 'cách tiếp cận, phương pháp xử lý', 'She took the wrong approach in her dealings with them.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000110', '40000000-0000-4000-9000-000000000110', 1, 'appropriate', 'phù hợp, thích đáng trong hoàn cảnh', 'an appropriate response/measure/method', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'adjective'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000111', '40000000-0000-4000-9000-000000000111', 1, 'approval', 'sự phê duyệt, tán thành chính thức', 'She desperately wanted to win her father''s approval.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000112', '40000000-0000-4000-9000-000000000112', 1, 'approve', 'phê chuẩn, đồng thuận', 'I told my mother I wanted to leave school but she didn''t approve.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'verb'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000113', '40000000-0000-4000-9000-000000000113', 1, 'arise', 'xảy ra ; bắt đầu tồn tại', 'An opportunity arose to work in the United States.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'verb'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000114', '40000000-0000-4000-9000-000000000114', 1, 'armed', 'được vũ trang vũ khí', 'an armed robbery', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'adjective'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000115', '40000000-0000-4000-9000-000000000115', 1, 'arms', 'vũ khí, đặc biệt là được sử dụng bởi quân đội, hải quân, v.v.', 'arms and ammunition', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000116', '40000000-0000-4000-9000-000000000116', 1, 'artificial', 'nhân tạo do con người tạo ra', 'an artificial limb/flower/sweetener/fertilizer', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'adjective'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000117', '40000000-0000-4000-9000-000000000117', 1, 'artistic', 'kết nối với nghệ thuật hoặc nghệ sĩ', 'the artistic works of the period', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'adjective'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000118', '40000000-0000-4000-9000-000000000118', 1, 'ashamed', 'cảm thấy xấu hổ hoặc cảm thấy xấu hổ về ai đó/điều gì đó hoặc vì điều gì đó bạn đã làm', 'ashamed of something, She was deeply ashamed of her behaviour at the party.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'adjective'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000119', '40000000-0000-4000-9000-000000000119', 1, 'aspect', 'khía cạnh, phương diện vấn đề', 'aspect of something, The book aims to cover all aspects of city life.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000011a', '40000000-0000-4000-9000-00000000011a', 1, 'assess', 'đánh giá, định giá trị', 'assess somebody/something, Accurately assessing environmental impacts is very complex.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'verb'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000011b', '40000000-0000-4000-9000-00000000011b', 1, 'assessment', 'sự đánh giá kết quả', 'a detailed assessment of the risks involved', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000011c', '40000000-0000-4000-9000-00000000011c', 1, 'associate', 'liên kết, cộng tác làm việc', 'associate somebody/something with somebody/something, I always associate the smell of baking with my childhood.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'verb'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000011d', '40000000-0000-4000-9000-00000000011d', 1, 'associated', 'nếu một thứ được liên kết với một thứ khác, thì hai thứ đó được kết nối với nhau bởi vì chúng xảy ra cùng nhau hoặc một thứ gây ra thứ kia', 'associated with doing something, the risks associated with taking drugs', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'adjective'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000011e', '40000000-0000-4000-9000-00000000011e', 1, 'association', 'hiệp hội, tổ chức liên kết', 'Do you belong to any professional or trade associations?', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000011f', '40000000-0000-4000-9000-00000000011f', 1, 'assume', 'giả định, cho rằng mà chưa kiểm chứng', 'assume (that)…, It is reasonable to assume (that) the economy will continue to improve.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'verb'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000120', '40000000-0000-4000-9000-000000000120', 1, 'attempt', 'nỗ lực, cố gắng thực hiện', 'I passed my driving test at the first attempt.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000121', '40000000-0000-4000-9000-000000000121', 1, 'bacteria', 'những dạng sống đơn giản và nhỏ bé nhất. Vi khuẩn tồn tại với số lượng lớn trong không khí, nước và đất, cũng như trong các sinh vật và thực vật sống và chết, và thường là nguyên nhân gây bệnh.', 'Neither chilling nor freezing kills all bacteria.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000122', '40000000-0000-4000-9000-000000000122', 1, 'barrier', 'rào cản, chướng ngại vật', 'The crowd had to stand behind barriers.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000123', '40000000-0000-4000-9000-000000000123', 1, 'basically', 'theo những cách quan trọng nhất mà không xem xét những điều ít quan trọng hơn', 'I think we are basically saying the same thing.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'verb'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000124', '40000000-0000-4000-9000-000000000124', 1, 'beg', 'yêu cầu ai đó một điều gì đó đặc biệt một cách lo lắng bởi vì bạn muốn hoặc cần nó rất nhiều', 'Now you have to beg and plead.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'verb'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000125', '40000000-0000-4000-9000-000000000125', 1, 'being', 'sự tồn tại', 'The Irish Free State came into being in 1922.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000126', '40000000-0000-4000-9000-000000000126', 1, 'bent', 'không thẳng', 'a piece of bent wire', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'adjective'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000127', '40000000-0000-4000-9000-000000000127', 1, 'bet', 'một sự sắp xếp để mạo hiểm tiền bạc, v.v. do kết quả của một sự kiện cụ thể; số tiền mà bạn gặp rủi ro theo cách này', 'to win/lose a bet', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000128', '40000000-0000-4000-9000-000000000128', 1, 'beyond', 'ở phía bên kia; tiếp tục', 'Snowdon and the mountains beyond were covered in snow.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'verb'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000129', '40000000-0000-4000-9000-000000000129', 1, 'bitter', 'có mùi vị mạnh, khó chịu; không ngọt ngào', 'Black coffee leaves a bitter taste in the mouth.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'adjective'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000012a', '40000000-0000-4000-9000-00000000012a', 1, 'blame', 'đổ lỗi, khiển trách trách nhiệm', 'Why do I always get the blame for everything that goes wrong?', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000012b', '40000000-0000-4000-9000-00000000012b', 1, 'blind', 'không thể nhìn thấy', 'Doctors think he will go blind.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'adjective'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000012c', '40000000-0000-4000-9000-00000000012c', 1, 'bond', 'mối liên kết tình cảm, trái phiếu', 'the bond that links us', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000012d', '40000000-0000-4000-9000-00000000012d', 1, 'breast', 'một trong hai phần mềm tròn ở phía trước cơ thể người phụ nữ sản xuất sữa khi cô ấy sinh con', 'She put the baby to her breast.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000012e', '40000000-0000-4000-9000-00000000012e', 1, 'brief', 'chỉ kéo dài một thời gian ngắn; ngắn', 'a brief visit/meeting/conversation', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'adjective'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000012f', '40000000-0000-4000-9000-00000000012f', 1, 'broad', 'rộng', 'a broad street/avenue/river', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'adjective'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000130', '40000000-0000-4000-9000-000000000130', 1, 'broadcast', 'một chương trình phát thanh hoặc truyền hình', '(British English), a party political broadcast (= for example, before an election)', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000131', '40000000-0000-4000-9000-000000000131', 1, 'budget', 'ngân sách chi tiêu', 'an annual budget of £10 million', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000132', '40000000-0000-4000-9000-000000000132', 1, 'bullet', 'một vật kim loại nhỏ được bắn ra từ súng', 'He was found to have a single bullet wound in his chest.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000133', '40000000-0000-4000-9000-000000000133', 1, 'bunch', 'một số thứ cùng loại đang phát triển hoặc gắn chặt với nhau', 'a bunch of bananas, grapes, etc.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000134', '40000000-0000-4000-9000-000000000134', 1, 'burn', 'đốt cháy, vết bỏng', 'to have minor/severe/third-degree burns', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000135', '40000000-0000-4000-9000-000000000135', 1, 'bush', 'một loại cây mọc dày đặc với nhiều thân cứng mọc lên từ rễ', 'a rose/holly bush', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000136', '40000000-0000-4000-9000-000000000136', 1, 'but', 'ngoại trừ; ngoài', 'We''ve had nothing but trouble with this car.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'preposition'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000137', '40000000-0000-4000-9000-000000000137', 1, 'cable', 'một bộ dây, được bọc bằng nhựa hoặc cao su, mang điện, tín hiệu điện thoại, v.v.', 'fibre-optic cable', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000138', '40000000-0000-4000-9000-000000000138', 1, 'calculate', 'tính toán số liệu toán học', 'calculate something, An independent valuer will calculate the value of your property.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'verb'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000139', '40000000-0000-4000-9000-000000000139', 1, 'cancel', 'quyết định rằng điều gì đó đã được sắp xếp bây giờ sẽ không diễn ra', 'All flights have been cancelled because of bad weather.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'verb'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000013a', '40000000-0000-4000-9000-00000000013a', 1, 'cancer', 'một căn bệnh nghiêm trọng trong đó sự phát triển của các tế bào, còn gọi là ung thư, hình thành trong cơ thể và tiêu diệt các tế bào cơ thể bình thường. Bệnh thường gây tử vong.', 'breast/lung cancer', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000013b', '40000000-0000-4000-9000-00000000013b', 1, 'capable', 'có khả năng hoặc phẩm chất cần thiết để làm một cái gì đó', 'capable of something, You are capable of better work than this.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'adjective'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000013c', '40000000-0000-4000-9000-00000000013c', 1, 'capacity', 'số lượng đồ vật hoặc con người mà một thùng chứa hoặc không gian có thể chứa được', 'a fuel tank with a maximum capacity of 50 litres', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000013d', '40000000-0000-4000-9000-00000000013d', 1, 'capture', 'hành động bắt ai/cái gì hoặc bị bắt', 'He evaded capture for three days.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000013e', '40000000-0000-4000-9000-00000000013e', 1, 'cast', 'tất cả những người diễn trong một vở kịch hoặc một bộ phim', 'an all-star cast (= including many well-known actors)', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-00000000013f', '40000000-0000-4000-9000-00000000013f', 1, 'catch', 'một hành động bắt một cái gì đó, ví dụ như một quả bóng', 'Roger made some brilliant catches at today''s game.', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now()),
  ('41000000-0000-4000-9000-000000000140', '40000000-0000-4000-9000-000000000140', 1, 'cell', 'đơn vị nhỏ nhất của vật chất sống có thể tự tồn tại. Tất cả thực vật và động vật đều được cấu tạo từ tế bào.', 'red and white blood cells', 'academic-core', ARRAY['oxford-3000', 'cefr:b2', 'noun'], 'advanced', 'published', 'Oxford 3000 & CEFR Dataset', 'Open Educational Use', now())
on conflict (id) do nothing;

commit;


