-- Hàm tính điểm server-side
CREATE OR REPLACE FUNCTION public.fn_submit_dictation_answer(
  p_user_id UUID,
  p_exercise_id UUID,
  p_sentence_id UUID,
  p_user_input TEXT,
  p_time_spent INT DEFAULT 0,
  p_replay_count SMALLINT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_correct_text TEXT;
  v_correct_words TEXT[];
  v_user_words TEXT[];
  v_correct_count INT := 0;
  v_total_words INT;
  v_accuracy DECIMAL(5,2);
  v_attempt_id UUID;
  v_word TEXT;
  v_i INT;
BEGIN
  -- Lấy text đúng
  SELECT text INTO v_correct_text
  FROM public.dictation_sentences
  WHERE id = p_sentence_id AND exercise_id = p_exercise_id;

  IF v_correct_text IS NULL THEN
    RETURN jsonb_build_object('error', 'Sentence not found');
  END IF;

  -- Normalize: lowercase, trim, remove extra spaces, remove punctuation
  v_correct_text := lower(trim(regexp_replace(
    regexp_replace(v_correct_text, '[^\w\s'']', '', 'g'),
    '\s+', ' ', 'g'
  )));
  p_user_input := lower(trim(regexp_replace(
    regexp_replace(p_user_input, '[^\w\s'']', '', 'g'),
    '\s+', ' ', 'g'
  )));

  v_correct_words := string_to_array(v_correct_text, ' ');
  v_user_words := string_to_array(p_user_input, ' ');
  v_total_words := array_length(v_correct_words, 1);

  -- So sánh từng từ (simple word-by-word matching)
  IF v_total_words > 0 THEN
    FOR v_i IN 1..LEAST(array_length(v_user_words, 1), v_total_words) LOOP
      IF v_user_words[v_i] = v_correct_words[v_i] THEN
        v_correct_count := v_correct_count + 1;
      END IF;
    END LOOP;
  END IF;

  v_accuracy := CASE WHEN v_total_words > 0
    THEN ROUND((v_correct_count::DECIMAL / v_total_words) * 100, 2)
    ELSE 0 END;

  -- Insert attempt
  INSERT INTO public.dictation_attempts (
    user_id, exercise_id, sentence_id, user_input,
    accuracy_score, correct_words, total_words,
    time_spent_seconds, replay_count
  ) VALUES (
    p_user_id, p_exercise_id, p_sentence_id, p_user_input,
    v_accuracy, v_correct_count, v_total_words,
    p_time_spent, p_replay_count
  ) RETURNING id INTO v_attempt_id;

  -- Upsert progress
  INSERT INTO public.dictation_progress (
    user_id, exercise_id, best_score, latest_score,
    attempts_count, completed_sentences, total_sentences, last_attempted_at
  )
  SELECT
    p_user_id, p_exercise_id, v_accuracy, v_accuracy,
    1,
    1,
    de.total_sentences,
    now()
  FROM public.dictation_exercises de WHERE de.id = p_exercise_id
  ON CONFLICT (user_id, exercise_id) DO UPDATE SET
    best_score = GREATEST(dictation_progress.best_score, v_accuracy),
    latest_score = v_accuracy,
    attempts_count = dictation_progress.attempts_count + 1,
    completed_sentences = (
      SELECT COUNT(DISTINCT da.sentence_id)
      FROM public.dictation_attempts da
      WHERE da.user_id = p_user_id
        AND da.exercise_id = p_exercise_id
        AND da.accuracy_score >= 80
    ),
    completed = (
      SELECT COUNT(DISTINCT da.sentence_id) >= de2.total_sentences
      FROM public.dictation_attempts da,
           public.dictation_exercises de2
      WHERE da.user_id = p_user_id
        AND da.exercise_id = p_exercise_id
        AND da.accuracy_score >= 80
        AND de2.id = p_exercise_id
    ),
    last_attempted_at = now();

  RETURN jsonb_build_object(
    'attempt_id', v_attempt_id,
    'accuracy_score', v_accuracy,
    'correct_words', v_correct_count,
    'total_words', v_total_words,
    'correct_text', v_correct_text,
    'user_input_normalized', p_user_input
  );
END;
$$;

-- Hàm lấy thống kê user
CREATE OR REPLACE FUNCTION public.fn_get_user_dictation_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_exercises_attempted', COUNT(DISTINCT exercise_id),
    'total_exercises_completed', COUNT(DISTINCT exercise_id) FILTER (WHERE completed = true),
    'average_best_score', ROUND(COALESCE(AVG(best_score), 0), 2),
    'total_attempts', COALESCE(SUM(attempts_count), 0),
    'last_practiced', MAX(last_attempted_at)
  ) INTO v_result
  FROM public.dictation_progress
  WHERE user_id = p_user_id;

  RETURN v_result;
END;
$$;
