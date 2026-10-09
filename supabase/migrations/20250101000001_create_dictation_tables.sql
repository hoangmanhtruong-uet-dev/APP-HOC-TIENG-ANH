-- Bảng bài tập nghe
CREATE TABLE public.dictation_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  difficulty SMALLINT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  audio_url TEXT NOT NULL,
  audio_url_low TEXT,  -- fallback chất lượng thấp
  thumbnail_url TEXT,
  total_sentences INT NOT NULL DEFAULT 0,
  duration_seconds INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exercises_category ON public.dictation_exercises(category);
CREATE INDEX idx_exercises_difficulty ON public.dictation_exercises(difficulty);
CREATE INDEX idx_exercises_published ON public.dictation_exercises(is_published, created_at DESC);

-- Bảng câu trong bài tập
CREATE TABLE public.dictation_sentences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.dictation_exercises(id) ON DELETE CASCADE,
  order_index SMALLINT NOT NULL,
  text TEXT NOT NULL,
  start_time DECIMAL(8,3) NOT NULL,  -- giây, chính xác ms
  end_time DECIMAL(8,3) NOT NULL,
  hint TEXT,  -- gợi ý (optional)
  UNIQUE(exercise_id, order_index)
);

CREATE INDEX idx_sentences_exercise ON public.dictation_sentences(exercise_id, order_index);

-- Bảng lưu từng lần submit câu
CREATE TABLE public.dictation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.dictation_exercises(id) ON DELETE CASCADE,
  sentence_id UUID NOT NULL REFERENCES public.dictation_sentences(id) ON DELETE CASCADE,
  user_input TEXT NOT NULL,
  accuracy_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  correct_words INT NOT NULL DEFAULT 0,
  total_words INT NOT NULL DEFAULT 0,
  time_spent_seconds INT DEFAULT 0,
  replay_count SMALLINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attempts_user_exercise ON public.dictation_attempts(user_id, exercise_id, created_at DESC);
CREATE INDEX idx_attempts_user ON public.dictation_attempts(user_id, created_at DESC);

-- Bảng tổng hợp tiến độ
CREATE TABLE public.dictation_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.dictation_exercises(id) ON DELETE CASCADE,
  best_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  latest_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  attempts_count INT NOT NULL DEFAULT 0,
  completed_sentences INT NOT NULL DEFAULT 0,
  total_sentences INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  last_attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise_id)
);

CREATE INDEX idx_progress_user ON public.dictation_progress(user_id, completed, last_attempted_at DESC);
