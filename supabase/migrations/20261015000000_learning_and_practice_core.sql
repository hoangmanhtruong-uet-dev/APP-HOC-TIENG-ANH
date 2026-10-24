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
