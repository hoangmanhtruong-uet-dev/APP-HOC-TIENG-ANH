ALTER TABLE public.dictation_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dictation_sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dictation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dictation_progress ENABLE ROW LEVEL SECURITY;

-- Exercises: public read
CREATE POLICY "Exercises are viewable by everyone"
  ON public.dictation_exercises FOR SELECT
  USING (is_published = true);

-- Sentences: public read
CREATE POLICY "Sentences are viewable by everyone"
  ON public.dictation_sentences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dictation_exercises
      WHERE id = exercise_id AND is_published = true
    )
  );

-- Attempts: user own data only
CREATE POLICY "Users can insert own attempts"
  ON public.dictation_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own attempts"
  ON public.dictation_attempts FOR SELECT
  USING (auth.uid() = user_id);

-- Progress: user own data only
CREATE POLICY "Users can manage own progress"
  ON public.dictation_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
