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

-- Insert sample exercise
INSERT INTO public.dictation_exercises (id, title, description, category, difficulty, audio_url, total_sentences, duration_seconds, is_published)
VALUES
  ('11111111-1111-1111-1111-111111111111',
   'Daily Conversation: At the Coffee Shop',
   'Luyện nghe đoạn hội thoại tại quán cà phê. Phù hợp cho người mới bắt đầu.',
   'daily', 2,
   'https://res.cloudinary.com/dwyxdr3q1/video/upload/v1704100000/coffee_shop_audio.mp3',
   5, 45, true);

-- Insert sentences for the exercise
INSERT INTO public.dictation_sentences (exercise_id, order_index, text, start_time, end_time, hint)
VALUES
  ('11111111-1111-1111-1111-111111111111', 0, 'Good morning, can I have a cup of coffee please?', 0.000, 3.500, 'Câu chào buổi sáng và gọi đồ uống'),
  ('11111111-1111-1111-1111-111111111111', 1, 'Sure, would you like it black or with milk?', 4.000, 7.200, 'Nhân viên hỏi về cách pha'),
  ('11111111-1111-1111-1111-111111111111', 2, 'I would like it with milk and two sugars.', 7.800, 11.000, 'Khách trả lời yêu cầu'),
  ('11111111-1111-1111-1111-111111111111', 3, 'That will be three dollars and fifty cents.', 11.500, 14.800, 'Nhân viên báo giá tiền'),
  ('11111111-1111-1111-1111-111111111111', 4, 'Here you go. Thank you and have a nice day!', 15.200, 18.500, 'Kết thúc hội thoại');

begin;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  locale text not null default 'vi-VN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length_check check (
    display_name is null
    or (
      char_length(display_name) between 1 and 100
      and display_name = btrim(display_name)
    )
  ),
  constraint profiles_timezone_length_check check (
    char_length(timezone) between 1 and 100
  ),
  constraint profiles_locale_length_check check (
    char_length(locale) between 2 and 35
  )
);

comment on table public.profiles is
  'Private learner profiles linked one-to-one with Supabase Auth users.';
comment on column public.profiles.display_name is
  'Learner-facing name. Email remains sourced from auth.users.';

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

create policy "Authenticated users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Authenticated users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_profile_updated_at() from public, anon, authenticated;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profile_updated_at();

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_display_name text;
begin
  profile_display_name := nullif(
    btrim(
      left(
        coalesce(
          new.raw_user_meta_data ->> 'display_name',
          new.raw_user_meta_data ->> 'full_name',
          ''
        ),
        100
      )
    ),
    ''
  );

  insert into public.profiles (id, display_name)
  values (new.id, profile_display_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

insert into public.profiles (id, display_name, created_at, updated_at)
select
  users.id,
  nullif(
    btrim(
      left(
        coalesce(
          users.raw_user_meta_data ->> 'display_name',
          users.raw_user_meta_data ->> 'full_name',
          ''
        ),
        100
      )
    ),
    ''
  ),
  coalesce(users.created_at, now()),
  coalesce(users.updated_at, users.created_at, now())
from auth.users as users
on conflict (id) do nothing;

commit;

begin;

create table public.learner_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  test_type text,
  current_band numeric(2, 1),
  target_band numeric(2, 1),
  target_exam_date date,
  daily_study_minutes smallint,
  study_days_per_week smallint,
  priority_skills text[] not null default array[]::text[],
  primary_goal text,
  onboarding_step smallint not null default 1,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learner_profiles_test_type_check check (
    test_type is null
    or test_type in ('academic', 'general_training')
  ),
  constraint learner_profiles_current_band_check check (
    current_band is null
    or (
      current_band between 0.0 and 9.0
      and mod(current_band * 2, 1) = 0
    )
  ),
  constraint learner_profiles_target_band_check check (
    target_band is null
    or (
      target_band between 0.0 and 9.0
      and mod(target_band * 2, 1) = 0
    )
  ),
  constraint learner_profiles_daily_study_minutes_check check (
    daily_study_minutes is null
    or daily_study_minutes in (15, 30, 45, 60, 90, 120)
  ),
  constraint learner_profiles_study_days_per_week_check check (
    study_days_per_week is null
    or study_days_per_week between 1 and 7
  ),
  constraint learner_profiles_priority_skills_allowed_values_check check (
    priority_skills <@ array[
      'listening',
      'reading',
      'writing',
      'speaking'
    ]::text[]
  ),
  constraint learner_profiles_priority_skills_unique_check check (
    cardinality(priority_skills) =
      (case when 'listening' = any(priority_skills) then 1 else 0 end)
      + (case when 'reading' = any(priority_skills) then 1 else 0 end)
      + (case when 'writing' = any(priority_skills) then 1 else 0 end)
      + (case when 'speaking' = any(priority_skills) then 1 else 0 end)
  ),
  constraint learner_profiles_primary_goal_check check (
    primary_goal is null
    or primary_goal in (
      'university',
      'graduation',
      'study_abroad',
      'work',
      'immigration',
      'personal_development',
      'other'
    )
  ),
  constraint learner_profiles_onboarding_step_check check (
    onboarding_step between 1 and 8
  ),
  constraint learner_profiles_completion_integrity_check check (
    onboarding_completed_at is null
    or (
      test_type is not null
      and target_band is not null
      and daily_study_minutes is not null
      and study_days_per_week is not null
      and cardinality(priority_skills) between 1 and 4
      and primary_goal is not null
      and onboarding_step = 8
      and onboarding_completed_at >= created_at
    )
  )
);

comment on table public.learner_profiles is
  'Private IELTS onboarding and personalization preferences owned one-to-one by a profile.';
comment on column public.learner_profiles.onboarding_step is
  'Next or current onboarding step, from 1 through the review step 8.';
comment on column public.learner_profiles.onboarding_completed_at is
  'Server-controlled completion timestamp; clients cannot write this column directly.';

alter table public.learner_profiles enable row level security;

revoke all on table public.learner_profiles from anon, authenticated;
grant select on table public.learner_profiles to authenticated;
grant insert (
  user_id,
  test_type,
  current_band,
  target_band,
  target_exam_date,
  daily_study_minutes,
  study_days_per_week,
  priority_skills,
  primary_goal,
  onboarding_step
) on table public.learner_profiles to authenticated;
grant update (
  user_id,
  test_type,
  current_band,
  target_band,
  target_exam_date,
  daily_study_minutes,
  study_days_per_week,
  priority_skills,
  primary_goal,
  onboarding_step
) on table public.learner_profiles to authenticated;

create policy "Authenticated users can read their own learner profile"
on public.learner_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Authenticated users can create their own learner profile"
on public.learner_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Authenticated users can update their own learner profile"
on public.learner_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create trigger set_learner_profiles_updated_at
before update on public.learner_profiles
for each row
execute function public.set_profile_updated_at();

create function public.validate_learner_exam_date()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  learner_today date;
begin
  if new.target_exam_date is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and new.target_exam_date is not distinct from old.target_exam_date then
    return new;
  end if;

  select (now() at time zone profiles.timezone)::date
  into learner_today
  from public.profiles as profiles
  where profiles.id = new.user_id;

  if learner_today is null then
    raise exception using
      errcode = '23503',
      message = 'learner profile requires an existing public profile';
  end if;

  if new.target_exam_date < learner_today then
    raise exception using
      errcode = '23514',
      message = 'target_exam_date must not be in the past';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_learner_exam_date()
from public, anon, authenticated;

create trigger validate_learner_profiles_exam_date
before insert or update of target_exam_date on public.learner_profiles
for each row
execute function public.validate_learner_exam_date();

create function public.complete_learner_onboarding()
returns public.learner_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  learner_profile public.learner_profiles;
  learner_today date;
begin
  actor_id := (select auth.uid());

  if actor_id is null then
    raise exception using
      errcode = '28000',
      message = 'authentication required';
  end if;

  select learner_profiles.*
  into learner_profile
  from public.learner_profiles as learner_profiles
  where learner_profiles.user_id = actor_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'learner profile not found';
  end if;

  if learner_profile.test_type is null
    or learner_profile.target_band is null
    or learner_profile.daily_study_minutes is null
    or learner_profile.study_days_per_week is null
    or cardinality(learner_profile.priority_skills) not between 1 and 4
    or learner_profile.primary_goal is null then
    raise exception using
      errcode = '23514',
      message = 'learner profile is incomplete';
  end if;

  if learner_profile.target_exam_date is not null then
    select (now() at time zone profiles.timezone)::date
    into learner_today
    from public.profiles as profiles
    where profiles.id = actor_id;

    if learner_today is null
      or learner_profile.target_exam_date < learner_today then
      raise exception using
        errcode = '23514',
        message = 'target_exam_date must not be in the past';
    end if;
  end if;

  update public.learner_profiles
  set
    onboarding_step = 8,
    onboarding_completed_at = coalesce(onboarding_completed_at, now())
  where user_id = actor_id
  returning * into learner_profile;

  return learner_profile;
end;
$$;

revoke all on function public.complete_learner_onboarding()
from public, anon, authenticated;
grant execute on function public.complete_learner_onboarding()
to authenticated;

commit;

begin;

create schema if not exists private;
revoke all on schema private from public;

create table public.learning_modules (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  skill text not null,
  test_type text not null,
  difficulty text not null,
  display_order integer not null,
  status text not null default 'draft',
  estimated_minutes smallint not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_modules_slug_check check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 1 and 100
  ),
  constraint learning_modules_title_check check (
    btrim(title) <> '' and char_length(title) <= 160
  ),
  constraint learning_modules_description_check check (
    btrim(description) <> '' and char_length(description) <= 1200
  ),
  constraint learning_modules_skill_check check (
    skill in (
      'foundations',
      'listening',
      'reading',
      'writing',
      'speaking',
      'vocabulary',
      'grammar'
    )
  ),
  constraint learning_modules_test_type_check check (
    test_type in ('academic', 'general_training', 'both')
  ),
  constraint learning_modules_difficulty_check check (
    difficulty in ('beginner', 'intermediate', 'advanced')
  ),
  constraint learning_modules_display_order_check check (
    display_order between 1 and 10000
  ),
  constraint learning_modules_status_check check (
    status in ('draft', 'in_review', 'published', 'archived')
  ),
  constraint learning_modules_estimated_minutes_check check (
    estimated_minutes between 1 and 600
  ),
  constraint learning_modules_publication_check check (
    (
      status in ('draft', 'in_review')
      and published_at is null
    )
    or (
      status in ('published', 'archived')
      and published_at is not null
    )
  )
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.learning_modules (id) on delete restrict,
  slug text not null,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lessons_slug_check check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 1 and 100
  ),
  constraint lessons_display_order_check check (
    display_order between 1 and 10000
  ),
  constraint lessons_module_slug_unique unique (module_id, slug),
  constraint lessons_module_display_order_unique unique (module_id, display_order)
);

create table public.lesson_versions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete restrict,
  version integer not null,
  title text not null,
  summary text not null,
  difficulty text not null,
  estimated_minutes smallint not null,
  status text not null default 'draft',
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_versions_version_check check (version between 1 and 10000),
  constraint lesson_versions_title_check check (
    btrim(title) <> '' and char_length(title) <= 180
  ),
  constraint lesson_versions_summary_check check (
    btrim(summary) <> '' and char_length(summary) <= 1200
  ),
  constraint lesson_versions_difficulty_check check (
    difficulty in ('beginner', 'intermediate', 'advanced')
  ),
  constraint lesson_versions_estimated_minutes_check check (
    estimated_minutes between 1 and 240
  ),
  constraint lesson_versions_status_check check (
    status in ('draft', 'in_review', 'published', 'archived')
  ),
  constraint lesson_versions_publication_check check (
    (
      status in ('draft', 'in_review')
      and published_at is null
      and archived_at is null
    )
    or (
      status = 'published'
      and published_at is not null
      and archived_at is null
    )
    or (
      status = 'archived'
      and published_at is not null
      and archived_at is not null
      and archived_at >= published_at
    )
  ),
  constraint lesson_versions_lesson_version_unique unique (lesson_id, version),
  constraint lesson_versions_lesson_id_id_unique unique (lesson_id, id)
);

create unique index lesson_versions_one_published_per_lesson_idx
on public.lesson_versions (lesson_id)
where status = 'published';

create table public.lesson_sections (
  id uuid primary key default gen_random_uuid(),
  lesson_version_id uuid not null references public.lesson_versions (id) on delete restrict,
  section_type text not null,
  title text,
  body_markdown text not null,
  display_order integer not null,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_sections_type_check check (
    section_type in ('text', 'example', 'checklist', 'tip', 'warning', 'summary')
  ),
  constraint lesson_sections_title_check check (
    title is null or (btrim(title) <> '' and char_length(title) <= 180)
  ),
  constraint lesson_sections_body_check check (
    btrim(body_markdown) <> '' and char_length(body_markdown) <= 20000
  ),
  constraint lesson_sections_display_order_check check (
    display_order between 1 and 10000
  ),
  constraint lesson_sections_version_order_unique unique (
    lesson_version_id,
    display_order
  ),
  constraint lesson_sections_version_id_id_unique unique (
    lesson_version_id,
    id
  )
);

create table public.learner_lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete restrict,
  lesson_version_id uuid not null,
  status text not null default 'in_progress',
  current_section_id uuid,
  progress_percent numeric(5, 2) not null default 0,
  started_at timestamptz not null default now(),
  last_accessed_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id),
  constraint learner_lesson_progress_version_fkey foreign key (
    lesson_id,
    lesson_version_id
  ) references public.lesson_versions (lesson_id, id) on delete restrict,
  constraint learner_lesson_progress_current_section_fkey foreign key (
    lesson_version_id,
    current_section_id
  ) references public.lesson_sections (lesson_version_id, id) on delete restrict,
  constraint learner_lesson_progress_status_check check (
    status in ('in_progress', 'completed')
  ),
  constraint learner_lesson_progress_percent_check check (
    progress_percent between 0 and 100
  ),
  constraint learner_lesson_progress_time_check check (
    last_accessed_at >= started_at
    and (completed_at is null or completed_at >= started_at)
  ),
  constraint learner_lesson_progress_completion_check check (
    (
      status = 'in_progress'
      and progress_percent < 100
      and completed_at is null
    )
    or (
      status = 'completed'
      and progress_percent = 100
      and completed_at is not null
    )
  )
);

create table public.learner_section_progress (
  user_id uuid not null,
  lesson_id uuid not null,
  lesson_version_id uuid not null,
  section_id uuid not null,
  last_viewed_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, section_id),
  constraint learner_section_progress_lesson_fkey foreign key (
    user_id,
    lesson_id
  ) references public.learner_lesson_progress (user_id, lesson_id) on delete cascade,
  constraint learner_section_progress_version_fkey foreign key (
    lesson_id,
    lesson_version_id
  ) references public.lesson_versions (lesson_id, id) on delete restrict,
  constraint learner_section_progress_section_fkey foreign key (
    lesson_version_id,
    section_id
  ) references public.lesson_sections (lesson_version_id, id) on delete restrict,
  constraint learner_section_progress_time_check check (
    completed_at is null or completed_at >= created_at
  )
);

comment on table public.learning_modules is
  'Version-controlled learning catalog groups. Learners can only discover published modules compatible with their IELTS test type.';
comment on table public.lessons is
  'Stable lesson identities and ordering within a learning module.';
comment on table public.lesson_versions is
  'Immutable published lesson snapshots. A lesson has at most one currently published version.';
comment on table public.lesson_sections is
  'Ordered Markdown sections belonging to one immutable lesson version. Raw HTML is not supported by the application renderer.';
comment on table public.learner_lesson_progress is
  'Private learner resume and completion state. Calculated fields are writable only through hardened RPCs.';
comment on table public.learner_section_progress is
  'Private section-level evidence used to calculate required-section completion.';

create index learning_modules_published_catalog_idx
on public.learning_modules (test_type, display_order, id)
where status = 'published';

create index lesson_versions_lesson_status_version_idx
on public.lesson_versions (lesson_id, status, version desc);

create index learner_lesson_progress_user_status_accessed_idx
on public.learner_lesson_progress (
  user_id,
  status,
  last_accessed_at desc
);

create index learner_lesson_progress_version_idx
on public.learner_lesson_progress (lesson_id, lesson_version_id);

create index learner_lesson_progress_current_section_idx
on public.learner_lesson_progress (lesson_version_id, current_section_id)
where current_section_id is not null;

create index learner_section_progress_user_lesson_idx
on public.learner_section_progress (user_id, lesson_id, completed_at);

create index learner_section_progress_version_idx
on public.learner_section_progress (lesson_id, lesson_version_id);

create index learner_section_progress_section_idx
on public.learner_section_progress (lesson_version_id, section_id);

create trigger set_learning_modules_updated_at
before update on public.learning_modules
for each row execute function public.set_profile_updated_at();

create trigger set_lessons_updated_at
before update on public.lessons
for each row execute function public.set_profile_updated_at();

create trigger set_lesson_versions_updated_at
before update on public.lesson_versions
for each row execute function public.set_profile_updated_at();

create trigger set_lesson_sections_updated_at
before update on public.lesson_sections
for each row execute function public.set_profile_updated_at();

create trigger set_learner_lesson_progress_updated_at
before update on public.learner_lesson_progress
for each row execute function public.set_profile_updated_at();

create trigger set_learner_section_progress_updated_at
before update on public.learner_section_progress
for each row execute function public.set_profile_updated_at();

create function public.protect_published_lesson_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status in ('published', 'archived') then
      raise exception using
        errcode = '55000',
        message = 'published lesson versions are immutable';
    end if;
    return old;
  end if;

  if old.status = 'archived' then
    raise exception using
      errcode = '55000',
      message = 'archived lesson versions are immutable';
  end if;

  if old.status = 'published' then
    if new.status = 'archived'
      and new.lesson_id is not distinct from old.lesson_id
      and new.version is not distinct from old.version
      and new.title is not distinct from old.title
      and new.summary is not distinct from old.summary
      and new.difficulty is not distinct from old.difficulty
      and new.estimated_minutes is not distinct from old.estimated_minutes
      and new.published_at is not distinct from old.published_at
      and new.archived_at is not null then
      return new;
    end if;

    raise exception using
      errcode = '55000',
      message = 'published lesson versions are immutable';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_published_lesson_version()
from public, anon, authenticated;

create trigger protect_published_lesson_versions
before update or delete on public.lesson_versions
for each row execute function public.protect_published_lesson_version();

create function public.protect_published_lesson_section()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_version_id uuid;
  target_status text;
begin
  target_version_id := case when tg_op = 'DELETE'
    then old.lesson_version_id
    else new.lesson_version_id
  end;

  select lesson_versions.status
  into target_status
  from public.lesson_versions as lesson_versions
  where lesson_versions.id = target_version_id;

  if target_status in ('published', 'archived') then
    raise exception using
      errcode = '55000',
      message = 'sections of published lesson versions are immutable';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_published_lesson_section()
from public, anon, authenticated;

create trigger protect_published_lesson_sections
before insert or update or delete on public.lesson_sections
for each row execute function public.protect_published_lesson_section();

create function public.validate_lesson_version_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  required_section_count integer;
begin
  if new.status = 'published' and old.status <> 'published' then
    select count(*)::integer
    into required_section_count
    from public.lesson_sections as lesson_sections
    where lesson_sections.lesson_version_id = new.id
      and lesson_sections.is_required;

    if required_section_count = 0 then
      raise exception using
        errcode = '23514',
        message = 'a published lesson version requires at least one required section';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_lesson_version_publication()
from public, anon, authenticated;

create trigger validate_lesson_version_before_publish
before update on public.lesson_versions
for each row execute function public.validate_lesson_version_publication();

alter table public.learning_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_versions enable row level security;
alter table public.lesson_sections enable row level security;
alter table public.learner_lesson_progress enable row level security;
alter table public.learner_section_progress enable row level security;

revoke all on table public.learning_modules from anon, authenticated;
revoke all on table public.lessons from anon, authenticated;
revoke all on table public.lesson_versions from anon, authenticated;
revoke all on table public.lesson_sections from anon, authenticated;
revoke all on table public.learner_lesson_progress from anon, authenticated;
revoke all on table public.learner_section_progress from anon, authenticated;

grant select on table public.learning_modules to authenticated;
grant select on table public.lessons to authenticated;
grant select on table public.lesson_versions to authenticated;
grant select on table public.lesson_sections to authenticated;
grant select on table public.learner_lesson_progress to authenticated;
grant select on table public.learner_section_progress to authenticated;

create function private.module_is_accessible(target_module_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select
      (
        learning_modules.status = 'published'
        and learning_modules.published_at <= now()
        and exists (
          select 1
          from public.learner_profiles
          where learner_profiles.user_id = (select auth.uid())
            and learner_profiles.onboarding_completed_at is not null
            and (
              learning_modules.test_type = 'both'
              or learning_modules.test_type = learner_profiles.test_type
            )
        )
      )
      or (
        learning_modules.status = 'archived'
        and exists (
          select 1
          from public.lessons
          join public.learner_lesson_progress
            on learner_lesson_progress.lesson_id = lessons.id
          where lessons.module_id = learning_modules.id
            and learner_lesson_progress.user_id = (select auth.uid())
        )
      )
    from public.learning_modules
    where learning_modules.id = target_module_id
  ), false);
$$;

create function private.lesson_is_accessible(target_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.lessons
      join public.lesson_versions
        on lesson_versions.lesson_id = lessons.id
      where lessons.id = target_lesson_id
        and lesson_versions.status = 'published'
        and lesson_versions.published_at <= now()
        and (select private.module_is_accessible(lessons.module_id))
    )
    or exists (
      select 1
      from public.learner_lesson_progress
      where learner_lesson_progress.user_id = (select auth.uid())
        and learner_lesson_progress.lesson_id = target_lesson_id
    );
$$;

create function private.lesson_version_is_accessible(target_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.lesson_versions
      join public.lessons on lessons.id = lesson_versions.lesson_id
      where lesson_versions.id = target_version_id
        and lesson_versions.status = 'published'
        and lesson_versions.published_at <= now()
        and (select private.module_is_accessible(lessons.module_id))
    )
    or exists (
      select 1
      from public.learner_lesson_progress
      join public.lesson_versions
        on lesson_versions.id = learner_lesson_progress.lesson_version_id
      where learner_lesson_progress.user_id = (select auth.uid())
        and learner_lesson_progress.lesson_version_id = target_version_id
        and lesson_versions.status in ('published', 'archived')
    );
$$;

create function private.section_is_accessible(target_section_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lesson_sections
    where lesson_sections.id = target_section_id
      and (select private.lesson_version_is_accessible(
        lesson_sections.lesson_version_id
      ))
  );
$$;

revoke all on function private.module_is_accessible(uuid)
from public, anon, authenticated;
revoke all on function private.lesson_is_accessible(uuid)
from public, anon, authenticated;
revoke all on function private.lesson_version_is_accessible(uuid)
from public, anon, authenticated;
revoke all on function private.section_is_accessible(uuid)
from public, anon, authenticated;

grant usage on schema private to authenticated;
grant execute on function private.module_is_accessible(uuid) to authenticated;
grant execute on function private.lesson_is_accessible(uuid) to authenticated;
grant execute on function private.lesson_version_is_accessible(uuid) to authenticated;
grant execute on function private.section_is_accessible(uuid) to authenticated;

create policy "Learners can read accessible learning modules"
on public.learning_modules
for select
to authenticated
using ((select private.module_is_accessible(id)));

create policy "Learners can read accessible lessons"
on public.lessons
for select
to authenticated
using ((select private.lesson_is_accessible(id)));

create policy "Learners can read accessible lesson versions"
on public.lesson_versions
for select
to authenticated
using ((select private.lesson_version_is_accessible(id)));

create policy "Learners can read accessible lesson sections"
on public.lesson_sections
for select
to authenticated
using ((select private.section_is_accessible(id)));

create policy "Learners can read their own lesson progress"
on public.learner_lesson_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Learners can read their own section progress"
on public.learner_section_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

create function public.open_lesson_section(
  p_lesson_id uuid,
  p_section_id uuid default null
)
returns public.learner_lesson_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  target_version_id uuid;
  target_section_id uuid;
  lesson_progress public.learner_lesson_progress;
begin
  actor_id := (select auth.uid());
  if actor_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;

  perform 1
  from public.profiles
  where profiles.id = actor_id
  for update;

  select learner_lesson_progress.*
  into lesson_progress
  from public.learner_lesson_progress
  where learner_lesson_progress.user_id = actor_id
    and learner_lesson_progress.lesson_id = p_lesson_id
  for update;

  if found then
    target_version_id := lesson_progress.lesson_version_id;
  else
    select lesson_versions.id
    into target_version_id
    from public.lesson_versions
    join public.lessons on lessons.id = lesson_versions.lesson_id
    where lessons.id = p_lesson_id
      and lesson_versions.status = 'published'
      and lesson_versions.published_at <= now()
      and (select private.module_is_accessible(lessons.module_id))
    order by lesson_versions.version desc
    limit 1;

    if target_version_id is null then
      raise exception using errcode = 'P0002', message = 'lesson not found';
    end if;
  end if;

  if not (select private.lesson_version_is_accessible(target_version_id)) then
    raise exception using errcode = 'P0002', message = 'lesson not found';
  end if;

  if p_section_id is null then
    target_section_id := coalesce(lesson_progress.current_section_id, (
      select lesson_sections.id
      from public.lesson_sections
      where lesson_sections.lesson_version_id = target_version_id
      order by lesson_sections.display_order, lesson_sections.id
      limit 1
    ));
  else
    target_section_id := p_section_id;
  end if;

  if target_section_id is null or not exists (
    select 1
    from public.lesson_sections
    where lesson_sections.id = target_section_id
      and lesson_sections.lesson_version_id = target_version_id
  ) then
    raise exception using errcode = '23503', message = 'section does not belong to lesson';
  end if;

  if lesson_progress.user_id is null then
    insert into public.learner_lesson_progress (
      user_id,
      lesson_id,
      lesson_version_id,
      current_section_id
    ) values (
      actor_id,
      p_lesson_id,
      target_version_id,
      target_section_id
    )
    returning * into lesson_progress;
  else
    update public.learner_lesson_progress
    set
      current_section_id = target_section_id,
      last_accessed_at = now()
    where user_id = actor_id
      and lesson_id = p_lesson_id
    returning * into lesson_progress;
  end if;

  insert into public.learner_section_progress (
    user_id,
    lesson_id,
    lesson_version_id,
    section_id,
    last_viewed_at
  ) values (
    actor_id,
    p_lesson_id,
    target_version_id,
    target_section_id,
    now()
  )
  on conflict (user_id, section_id) do update
  set last_viewed_at = excluded.last_viewed_at;

  return lesson_progress;
end;
$$;

create function public.complete_lesson_section(
  p_lesson_id uuid,
  p_section_id uuid
)
returns public.learner_lesson_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  lesson_progress public.learner_lesson_progress;
  required_count integer;
  completed_required_count integer;
  calculated_percent numeric(5, 2);
begin
  actor_id := (select auth.uid());
  if actor_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;

  lesson_progress := public.open_lesson_section(p_lesson_id, p_section_id);

  insert into public.learner_section_progress (
    user_id,
    lesson_id,
    lesson_version_id,
    section_id,
    last_viewed_at,
    completed_at
  ) values (
    actor_id,
    p_lesson_id,
    lesson_progress.lesson_version_id,
    p_section_id,
    now(),
    now()
  )
  on conflict (user_id, section_id) do update
  set
    last_viewed_at = excluded.last_viewed_at,
    completed_at = coalesce(
      learner_section_progress.completed_at,
      excluded.completed_at
    );

  select
    count(*) filter (where lesson_sections.is_required)::integer,
    count(*) filter (
      where lesson_sections.is_required
        and learner_section_progress.completed_at is not null
    )::integer
  into required_count, completed_required_count
  from public.lesson_sections
  left join public.learner_section_progress
    on learner_section_progress.user_id = actor_id
    and learner_section_progress.section_id = lesson_sections.id
  where lesson_sections.lesson_version_id = lesson_progress.lesson_version_id;

  if required_count <= 0 then
    raise exception using
      errcode = '23514',
      message = 'lesson requires at least one required section';
  end if;

  calculated_percent := round(
    completed_required_count::numeric * 100 / required_count,
    2
  );

  update public.learner_lesson_progress
  set
    current_section_id = p_section_id,
    last_accessed_at = now(),
    status = case
      when completed_required_count = required_count then 'completed'
      else status
    end,
    progress_percent = case
      when status = 'completed'
        or completed_required_count = required_count then 100
      else calculated_percent
    end,
    completed_at = case
      when completed_required_count = required_count
        then coalesce(completed_at, now())
      else completed_at
    end
  where user_id = actor_id
    and lesson_id = p_lesson_id
  returning * into lesson_progress;

  return lesson_progress;
end;
$$;

revoke all on function public.open_lesson_section(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.complete_lesson_section(uuid, uuid)
from public, anon, authenticated;

grant execute on function public.open_lesson_section(uuid, uuid)
to authenticated;
grant execute on function public.complete_lesson_section(uuid, uuid)
to authenticated;

commit;

begin;

create table public.exercise_sets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  domain text not null,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercise_sets_slug_check check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 1 and 100
  ),
  constraint exercise_sets_domain_check check (
    domain in ('vocabulary', 'grammar')
  ),
  constraint exercise_sets_display_order_check check (
    display_order between 1 and 10000
  )
);

create table public.exercise_set_versions (
  id uuid primary key default gen_random_uuid(),
  exercise_set_id uuid not null references public.exercise_sets (id) on delete restrict,
  version integer not null,
  title text not null,
  summary text not null,
  instructions_markdown text not null,
  difficulty text not null,
  status text not null default 'draft',
  allow_review boolean not null default true,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercise_set_versions_version_check check (version between 1 and 10000),
  constraint exercise_set_versions_title_check check (
    btrim(title) <> '' and char_length(title) <= 180
  ),
  constraint exercise_set_versions_summary_check check (
    btrim(summary) <> '' and char_length(summary) <= 1200
  ),
  constraint exercise_set_versions_instructions_check check (
    btrim(instructions_markdown) <> ''
    and char_length(instructions_markdown) <= 10000
  ),
  constraint exercise_set_versions_difficulty_check check (
    difficulty in ('beginner', 'intermediate', 'advanced')
  ),
  constraint exercise_set_versions_status_check check (
    status in ('draft', 'in_review', 'published', 'archived')
  ),
  constraint exercise_set_versions_publication_check check (
    (
      status in ('draft', 'in_review')
      and published_at is null
      and archived_at is null
    )
    or (
      status = 'published'
      and published_at is not null
      and archived_at is null
    )
    or (
      status = 'archived'
      and published_at is not null
      and archived_at is not null
      and archived_at >= published_at
    )
  ),
  constraint exercise_set_versions_set_version_unique unique (exercise_set_id, version),
  constraint exercise_set_versions_set_id_id_unique unique (exercise_set_id, id)
);

create unique index exercise_set_versions_one_published_idx
on public.exercise_set_versions (exercise_set_id)
where status = 'published';

create table public.exercise_questions (
  id uuid primary key default gen_random_uuid(),
  exercise_set_version_id uuid not null references public.exercise_set_versions (id) on delete restrict,
  position integer not null,
  question_type text not null,
  prompt_markdown text not null,
  points smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercise_questions_position_check check (position between 1 and 1000),
  constraint exercise_questions_type_check check (
    question_type in ('single_choice', 'multiple_choice', 'true_false', 'short_text')
  ),
  constraint exercise_questions_prompt_check check (
    btrim(prompt_markdown) <> '' and char_length(prompt_markdown) <= 10000
  ),
  constraint exercise_questions_points_check check (points between 1 and 100),
  constraint exercise_questions_version_position_unique unique (
    exercise_set_version_id,
    position
  ),
  constraint exercise_questions_version_id_id_unique unique (
    exercise_set_version_id,
    id
  )
);

create table public.exercise_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.exercise_questions (id) on delete restrict,
  position integer not null,
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercise_options_position_check check (position between 1 and 100),
  constraint exercise_options_label_check check (
    btrim(label) <> '' and char_length(label) <= 1000
  ),
  constraint exercise_options_question_position_unique unique (question_id, position),
  constraint exercise_options_question_id_id_unique unique (question_id, id)
);

create table private.exercise_answer_keys (
  question_id uuid primary key references public.exercise_questions (id) on delete restrict,
  case_sensitive boolean not null default false,
  explanation_markdown text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercise_answer_keys_explanation_check check (
    btrim(explanation_markdown) <> ''
    and char_length(explanation_markdown) <= 10000
  )
);

create table private.exercise_correct_options (
  question_id uuid not null,
  option_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (question_id, option_id),
  constraint exercise_correct_options_option_fkey foreign key (question_id, option_id)
    references public.exercise_options (question_id, id) on delete restrict,
  constraint exercise_correct_options_key_fkey foreign key (question_id)
    references private.exercise_answer_keys (question_id) on delete restrict
);

create table private.exercise_correct_text_answers (
  question_id uuid not null references private.exercise_answer_keys (question_id) on delete restrict,
  answer_text text not null,
  normalized_answer text not null,
  created_at timestamptz not null default now(),
  primary key (question_id, normalized_answer),
  constraint exercise_correct_text_answers_text_check check (
    btrim(answer_text) <> '' and char_length(answer_text) <= 1000
  ),
  constraint exercise_correct_text_answers_normalized_check check (
    btrim(normalized_answer) <> '' and char_length(normalized_answer) <= 1000
  )
);

create table public.vocabulary_entries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  normalized_term text not null,
  part_of_speech text not null,
  sense_key text not null default 'default',
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vocabulary_entries_slug_check check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 1 and 100
  ),
  constraint vocabulary_entries_normalized_term_check check (
    normalized_term = lower(btrim(normalized_term))
    and normalized_term <> ''
    and char_length(normalized_term) <= 160
  ),
  constraint vocabulary_entries_part_of_speech_check check (
    part_of_speech in (
      'noun', 'verb', 'adjective', 'adverb', 'preposition',
      'conjunction', 'pronoun', 'determiner', 'phrase'
    )
  ),
  constraint vocabulary_entries_sense_key_check check (
    sense_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(sense_key) between 1 and 80
  ),
  constraint vocabulary_entries_display_order_check check (
    display_order between 1 and 10000
  ),
  constraint vocabulary_entries_canonical_unique unique (
    normalized_term,
    part_of_speech,
    sense_key
  )
);

create table public.vocabulary_entry_versions (
  id uuid primary key default gen_random_uuid(),
  vocabulary_entry_id uuid not null references public.vocabulary_entries (id) on delete restrict,
  version integer not null,
  term text not null,
  definition_vi text not null,
  example_sentence text not null,
  topic text not null,
  tags text[] not null default '{}',
  difficulty text not null,
  status text not null default 'draft',
  related_exercise_set_id uuid references public.exercise_sets (id) on delete set null,
  source_name text not null default 'Project-authored',
  licence text not null default 'Original project content',
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vocabulary_entry_versions_version_check check (version between 1 and 10000),
  constraint vocabulary_entry_versions_term_check check (
    btrim(term) <> '' and char_length(term) <= 160
  ),
  constraint vocabulary_entry_versions_definition_check check (
    btrim(definition_vi) <> '' and char_length(definition_vi) <= 2000
  ),
  constraint vocabulary_entry_versions_example_check check (
    btrim(example_sentence) <> '' and char_length(example_sentence) <= 2000
  ),
  constraint vocabulary_entry_versions_topic_check check (
    topic ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(topic) between 1 and 80
  ),
  constraint vocabulary_entry_versions_tags_check check (
    cardinality(tags) between 1 and 12
  ),
  constraint vocabulary_entry_versions_difficulty_check check (
    difficulty in ('beginner', 'intermediate', 'advanced')
  ),
  constraint vocabulary_entry_versions_status_check check (
    status in ('draft', 'in_review', 'published', 'archived')
  ),
  constraint vocabulary_entry_versions_source_check check (
    btrim(source_name) <> '' and btrim(licence) <> ''
  ),
  constraint vocabulary_entry_versions_publication_check check (
    (status in ('draft', 'in_review') and published_at is null and archived_at is null)
    or (status = 'published' and published_at is not null and archived_at is null)
    or (
      status = 'archived' and published_at is not null and archived_at is not null
      and archived_at >= published_at
    )
  ),
  constraint vocabulary_entry_versions_entry_version_unique unique (
    vocabulary_entry_id,
    version
  )
);

create unique index vocabulary_entry_versions_one_published_idx
on public.vocabulary_entry_versions (vocabulary_entry_id)
where status = 'published';

create table public.grammar_topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grammar_topics_slug_check check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 1 and 100
  ),
  constraint grammar_topics_display_order_check check (
    display_order between 1 and 10000
  )
);

create table public.grammar_topic_versions (
  id uuid primary key default gen_random_uuid(),
  grammar_topic_id uuid not null references public.grammar_topics (id) on delete restrict,
  version integer not null,
  title text not null,
  explanation_markdown text not null,
  examples jsonb not null,
  common_mistakes jsonb not null,
  difficulty text not null,
  status text not null default 'draft',
  related_exercise_set_id uuid references public.exercise_sets (id) on delete set null,
  source_name text not null default 'Project-authored',
  licence text not null default 'Original project content',
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grammar_topic_versions_version_check check (version between 1 and 10000),
  constraint grammar_topic_versions_title_check check (
    btrim(title) <> '' and char_length(title) <= 180
  ),
  constraint grammar_topic_versions_explanation_check check (
    btrim(explanation_markdown) <> '' and char_length(explanation_markdown) <= 20000
  ),
  constraint grammar_topic_versions_examples_check check (
    jsonb_typeof(examples) = 'array' and jsonb_array_length(examples) between 1 and 20
  ),
  constraint grammar_topic_versions_mistakes_check check (
    jsonb_typeof(common_mistakes) = 'array'
    and jsonb_array_length(common_mistakes) between 1 and 20
  ),
  constraint grammar_topic_versions_difficulty_check check (
    difficulty in ('beginner', 'intermediate', 'advanced')
  ),
  constraint grammar_topic_versions_status_check check (
    status in ('draft', 'in_review', 'published', 'archived')
  ),
  constraint grammar_topic_versions_source_check check (
    btrim(source_name) <> '' and btrim(licence) <> ''
  ),
  constraint grammar_topic_versions_publication_check check (
    (status in ('draft', 'in_review') and published_at is null and archived_at is null)
    or (status = 'published' and published_at is not null and archived_at is null)
    or (
      status = 'archived' and published_at is not null and archived_at is not null
      and archived_at >= published_at
    )
  ),
  constraint grammar_topic_versions_topic_version_unique unique (
    grammar_topic_id,
    version
  )
);

create unique index grammar_topic_versions_one_published_idx
on public.grammar_topic_versions (grammar_topic_id)
where status = 'published';

create table public.learner_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_set_id uuid not null references public.exercise_sets (id) on delete restrict,
  exercise_set_version_id uuid not null,
  status text not null default 'in_progress',
  start_idempotency_key text not null,
  current_question_position integer not null default 1,
  score smallint,
  max_score smallint,
  started_at timestamptz not null default now(),
  last_saved_at timestamptz not null default now(),
  submitted_at timestamptz,
  scored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learner_attempts_version_fkey foreign key (
    exercise_set_id,
    exercise_set_version_id
  ) references public.exercise_set_versions (exercise_set_id, id) on delete restrict,
  constraint learner_attempts_id_version_unique unique (id, exercise_set_version_id),
  constraint learner_attempts_status_check check (
    status in ('in_progress', 'scored', 'abandoned')
  ),
  constraint learner_attempts_idempotency_check check (
    btrim(start_idempotency_key) <> '' and char_length(start_idempotency_key) <= 200
  ),
  constraint learner_attempts_position_check check (
    current_question_position between 1 and 1000
  ),
  constraint learner_attempts_score_check check (
    (score is null and max_score is null)
    or (score between 0 and max_score and max_score > 0)
  ),
  constraint learner_attempts_state_check check (
    (
      status = 'in_progress'
      and score is null and max_score is null
      and submitted_at is null and scored_at is null
    )
    or (
      status = 'scored'
      and score is not null and max_score is not null
      and submitted_at is not null and scored_at is not null
      and scored_at >= submitted_at
    )
    or (
      status = 'abandoned'
      and score is null and max_score is null
      and submitted_at is null and scored_at is null
    )
  ),
  constraint learner_attempts_user_start_key_unique unique (
    user_id,
    start_idempotency_key
  )
);

create unique index learner_attempts_one_active_set_idx
on public.learner_attempts (user_id, exercise_set_id)
where status = 'in_progress';

create table public.learner_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null,
  exercise_set_version_id uuid not null,
  question_id uuid not null,
  answer_text text,
  client_revision integer not null,
  is_correct boolean,
  awarded_points smallint,
  saved_at timestamptz not null default now(),
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learner_answers_attempt_version_fkey foreign key (
    attempt_id,
    exercise_set_version_id
  ) references public.learner_attempts (id, exercise_set_version_id) on delete cascade,
  constraint learner_answers_question_version_fkey foreign key (
    exercise_set_version_id,
    question_id
  ) references public.exercise_questions (exercise_set_version_id, id) on delete restrict,
  constraint learner_answers_attempt_question_unique unique (attempt_id, question_id),
  constraint learner_answers_attempt_question_id_unique unique (attempt_id, question_id, id),
  constraint learner_answers_text_check check (
    answer_text is null or char_length(answer_text) <= 2000
  ),
  constraint learner_answers_revision_check check (client_revision between 0 and 2147483647),
  constraint learner_answers_score_check check (
    (is_correct is null and awarded_points is null and finalized_at is null)
    or (is_correct is not null and awarded_points is not null and awarded_points >= 0 and finalized_at is not null)
  )
);

create table public.learner_answer_options (
  answer_id uuid not null,
  attempt_id uuid not null,
  question_id uuid not null,
  option_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (answer_id, option_id),
  constraint learner_answer_options_answer_fkey foreign key (
    attempt_id,
    question_id,
    answer_id
  ) references public.learner_answers (attempt_id, question_id, id) on delete cascade,
  constraint learner_answer_options_option_fkey foreign key (question_id, option_id)
    references public.exercise_options (question_id, id) on delete restrict
);

create index exercise_set_versions_status_idx
on public.exercise_set_versions (status, exercise_set_id, version desc);
create index exercise_questions_version_position_idx
on public.exercise_questions (exercise_set_version_id, position, id);
create index exercise_options_question_position_idx
on public.exercise_options (question_id, position, id);
create index vocabulary_entry_versions_catalog_idx
on public.vocabulary_entry_versions (status, topic, difficulty, vocabulary_entry_id);
create index grammar_topic_versions_catalog_idx
on public.grammar_topic_versions (status, difficulty, grammar_topic_id);
create index learner_attempts_user_status_recent_idx
on public.learner_attempts (user_id, status, updated_at desc);
create index learner_attempts_version_idx
on public.learner_attempts (exercise_set_version_id, user_id);
create index learner_answers_attempt_idx
on public.learner_answers (attempt_id, question_id);
create index learner_answer_options_attempt_idx
on public.learner_answer_options (attempt_id, question_id);

create trigger set_exercise_sets_updated_at before update on public.exercise_sets
for each row execute function public.set_profile_updated_at();
create trigger set_exercise_set_versions_updated_at before update on public.exercise_set_versions
for each row execute function public.set_profile_updated_at();
create trigger set_exercise_questions_updated_at before update on public.exercise_questions
for each row execute function public.set_profile_updated_at();
create trigger set_exercise_options_updated_at before update on public.exercise_options
for each row execute function public.set_profile_updated_at();
create trigger set_exercise_answer_keys_updated_at before update on private.exercise_answer_keys
for each row execute function public.set_profile_updated_at();
create trigger set_vocabulary_entries_updated_at before update on public.vocabulary_entries
for each row execute function public.set_profile_updated_at();
create trigger set_vocabulary_entry_versions_updated_at before update on public.vocabulary_entry_versions
for each row execute function public.set_profile_updated_at();
create trigger set_grammar_topics_updated_at before update on public.grammar_topics
for each row execute function public.set_profile_updated_at();
create trigger set_grammar_topic_versions_updated_at before update on public.grammar_topic_versions
for each row execute function public.set_profile_updated_at();
create trigger set_learner_attempts_updated_at before update on public.learner_attempts
for each row execute function public.set_profile_updated_at();
create trigger set_learner_answers_updated_at before update on public.learner_answers
for each row execute function public.set_profile_updated_at();

create function private.exercise_version_status_for_question(target_question_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select versions.status
  from public.exercise_questions as questions
  join public.exercise_set_versions as versions
    on versions.id = questions.exercise_set_version_id
  where questions.id = target_question_id;
$$;

revoke all on function private.exercise_version_status_for_question(uuid)
from public, anon, authenticated;

create function public.protect_exercise_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_status text;
  target_version_id uuid;
begin
  if tg_table_name = 'exercise_set_versions' then
    if tg_op = 'DELETE' and old.status in ('published', 'archived') then
      raise exception using errcode = '55000', message = 'published exercise versions are immutable';
    end if;
    if tg_op = 'UPDATE' and old.status = 'archived' then
      raise exception using errcode = '55000', message = 'archived exercise versions are immutable';
    end if;
    if tg_op = 'UPDATE' and old.status = 'published' then
      if new.status = 'archived'
        and new.exercise_set_id is not distinct from old.exercise_set_id
        and new.version is not distinct from old.version
        and new.title is not distinct from old.title
        and new.summary is not distinct from old.summary
        and new.instructions_markdown is not distinct from old.instructions_markdown
        and new.difficulty is not distinct from old.difficulty
        and new.allow_review is not distinct from old.allow_review
        and new.published_at is not distinct from old.published_at
        and new.archived_at is not null then
        return new;
      end if;
      raise exception using errcode = '55000', message = 'published exercise versions are immutable';
    end if;
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_table_name = 'exercise_questions' then
    target_version_id := case when tg_op = 'DELETE' then old.exercise_set_version_id else new.exercise_set_version_id end;
  elsif tg_table_name = 'exercise_options' then
    select questions.exercise_set_version_id into target_version_id
    from public.exercise_questions as questions
    where questions.id = case when tg_op = 'DELETE' then old.question_id else new.question_id end;
  else
    raise exception using errcode = 'P0001', message = 'unsupported exercise content table';
  end if;

  select versions.status into target_status
  from public.exercise_set_versions as versions
  where versions.id = target_version_id;

  if target_status in ('published', 'archived') then
    raise exception using errcode = '55000', message = 'published exercise content is immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.protect_exercise_content()
from public, anon, authenticated;

create trigger protect_exercise_set_versions
before update or delete on public.exercise_set_versions
for each row execute function public.protect_exercise_content();
create trigger protect_exercise_questions
before insert or update or delete on public.exercise_questions
for each row execute function public.protect_exercise_content();
create trigger protect_exercise_options
before insert or update or delete on public.exercise_options
for each row execute function public.protect_exercise_content();

create function private.protect_exercise_answers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_question_id uuid;
  target_status text;
begin
  target_question_id := case when tg_op = 'DELETE' then old.question_id else new.question_id end;
  target_status := private.exercise_version_status_for_question(target_question_id);
  if target_status in ('published', 'archived') then
    raise exception using errcode = '55000', message = 'published exercise answer keys are immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.protect_exercise_answers()
from public, anon, authenticated;

create trigger protect_exercise_answer_keys
before insert or update or delete on private.exercise_answer_keys
for each row execute function private.protect_exercise_answers();
create trigger protect_exercise_correct_options
before insert or update or delete on private.exercise_correct_options
for each row execute function private.protect_exercise_answers();
create trigger protect_exercise_correct_text_answers
before insert or update or delete on private.exercise_correct_text_answers
for each row execute function private.protect_exercise_answers();

create function public.validate_exercise_version_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  question_count integer;
  invalid_count integer;
begin
  if new.status <> 'published' or old.status = 'published' then
    return new;
  end if;

  select count(*)::integer into question_count
  from public.exercise_questions as questions
  where questions.exercise_set_version_id = new.id;

  if question_count = 0 then
    raise exception using errcode = '23514', message = 'a published exercise requires at least one question';
  end if;

  select count(*)::integer into invalid_count
  from public.exercise_questions as questions
  where questions.exercise_set_version_id = new.id
    and not exists (
      select 1 from private.exercise_answer_keys as keys where keys.question_id = questions.id
    );
  if invalid_count > 0 then
    raise exception using errcode = '23514', message = 'every published question requires an answer key';
  end if;

  select count(*)::integer into invalid_count
  from public.exercise_questions as questions
  where questions.exercise_set_version_id = new.id
    and (
      (questions.question_type in ('single_choice', 'true_false') and (
        (select count(*) from public.exercise_options as options where options.question_id = questions.id) < 2
        or (select count(*) from private.exercise_correct_options as correct where correct.question_id = questions.id) <> 1
        or exists (select 1 from private.exercise_correct_text_answers as texts where texts.question_id = questions.id)
      ))
      or (questions.question_type = 'multiple_choice' and (
        (select count(*) from public.exercise_options as options where options.question_id = questions.id) < 2
        or (select count(*) from private.exercise_correct_options as correct where correct.question_id = questions.id) < 1
        or exists (select 1 from private.exercise_correct_text_answers as texts where texts.question_id = questions.id)
      ))
      or (questions.question_type = 'short_text' and (
        exists (select 1 from public.exercise_options as options where options.question_id = questions.id)
        or exists (select 1 from private.exercise_correct_options as correct where correct.question_id = questions.id)
        or not exists (select 1 from private.exercise_correct_text_answers as texts where texts.question_id = questions.id)
      ))
    );
  if invalid_count > 0 then
    raise exception using errcode = '23514', message = 'published questions have invalid answer configuration';
  end if;

  if (
    select min(questions.position) <> 1 or max(questions.position) <> count(*)
    from public.exercise_questions as questions
    where questions.exercise_set_version_id = new.id
  ) then
    raise exception using errcode = '23514', message = 'published question positions must be contiguous';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_exercise_version_publication()
from public, anon, authenticated;

create trigger validate_exercise_version_before_publish
before update on public.exercise_set_versions
for each row execute function public.validate_exercise_version_publication();

create function public.protect_versioned_learning_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.status in ('published', 'archived') then
    raise exception using errcode = '55000', message = 'published learning content is immutable';
  end if;
  if tg_op = 'UPDATE' and old.status = 'archived' then
    raise exception using errcode = '55000', message = 'archived learning content is immutable';
  end if;
  if tg_op = 'UPDATE' and old.status = 'published' then
    if new.status = 'archived'
      and to_jsonb(new) - array['status', 'archived_at', 'updated_at']
        is not distinct from to_jsonb(old) - array['status', 'archived_at', 'updated_at']
      and new.archived_at is not null then
      return new;
    end if;
    raise exception using errcode = '55000', message = 'published learning content is immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.protect_versioned_learning_content()
from public, anon, authenticated;

create trigger protect_vocabulary_entry_versions
before update or delete on public.vocabulary_entry_versions
for each row execute function public.protect_versioned_learning_content();
create trigger protect_grammar_topic_versions
before update or delete on public.grammar_topic_versions
for each row execute function public.protect_versioned_learning_content();

alter table public.exercise_sets enable row level security;
alter table public.exercise_set_versions enable row level security;
alter table public.exercise_questions enable row level security;
alter table public.exercise_options enable row level security;
alter table public.vocabulary_entries enable row level security;
alter table public.vocabulary_entry_versions enable row level security;
alter table public.grammar_topics enable row level security;
alter table public.grammar_topic_versions enable row level security;
alter table public.learner_attempts enable row level security;
alter table public.learner_answers enable row level security;
alter table public.learner_answer_options enable row level security;

revoke all on table public.exercise_sets from anon, authenticated;
revoke all on table public.exercise_set_versions from anon, authenticated;
revoke all on table public.exercise_questions from anon, authenticated;
revoke all on table public.exercise_options from anon, authenticated;
revoke all on table public.vocabulary_entries from anon, authenticated;
revoke all on table public.vocabulary_entry_versions from anon, authenticated;
revoke all on table public.grammar_topics from anon, authenticated;
revoke all on table public.grammar_topic_versions from anon, authenticated;
revoke all on table public.learner_attempts from anon, authenticated;
revoke all on table public.learner_answers from anon, authenticated;
revoke all on table public.learner_answer_options from anon, authenticated;
revoke all on table private.exercise_answer_keys from public, anon, authenticated;
revoke all on table private.exercise_correct_options from public, anon, authenticated;
revoke all on table private.exercise_correct_text_answers from public, anon, authenticated;

grant select on table public.exercise_sets to authenticated;
grant select on table public.exercise_set_versions to authenticated;
grant select on table public.exercise_questions to authenticated;
grant select on table public.exercise_options to authenticated;
grant select on table public.vocabulary_entries to authenticated;
grant select on table public.vocabulary_entry_versions to authenticated;
grant select on table public.grammar_topics to authenticated;
grant select on table public.grammar_topic_versions to authenticated;
grant select on table public.learner_attempts to authenticated;
grant select on table public.learner_answers to authenticated;
grant select on table public.learner_answer_options to authenticated;

create function private.completed_learner_exists()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.learner_profiles
    where learner_profiles.user_id = (select auth.uid())
      and learner_profiles.onboarding_completed_at is not null
  );
$$;

create function private.exercise_version_is_accessible(target_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.exercise_set_versions as versions
    where versions.id = target_version_id
      and versions.status = 'published'
      and versions.published_at <= now()
      and (select private.completed_learner_exists())
  ) or exists (
    select 1 from public.learner_attempts as attempts
    where attempts.user_id = (select auth.uid())
      and attempts.exercise_set_version_id = target_version_id
  );
$$;

create function private.exercise_set_is_accessible(target_set_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.exercise_set_versions as versions
    where versions.exercise_set_id = target_set_id
      and (select private.exercise_version_is_accessible(versions.id))
  );
$$;

create function private.question_is_accessible(target_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.exercise_questions as questions
    where questions.id = target_question_id
      and (select private.exercise_version_is_accessible(questions.exercise_set_version_id))
  );
$$;

create function private.vocabulary_version_is_accessible(target_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vocabulary_entry_versions as versions
    where versions.id = target_version_id
      and versions.status = 'published'
      and versions.published_at <= now()
      and (select private.completed_learner_exists())
  );
$$;

create function private.grammar_version_is_accessible(target_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.grammar_topic_versions as versions
    where versions.id = target_version_id
      and versions.status = 'published'
      and versions.published_at <= now()
      and (select private.completed_learner_exists())
  );
$$;

revoke all on function private.completed_learner_exists() from public, anon, authenticated;
revoke all on function private.exercise_version_is_accessible(uuid) from public, anon, authenticated;
revoke all on function private.exercise_set_is_accessible(uuid) from public, anon, authenticated;
revoke all on function private.question_is_accessible(uuid) from public, anon, authenticated;
revoke all on function private.vocabulary_version_is_accessible(uuid) from public, anon, authenticated;
revoke all on function private.grammar_version_is_accessible(uuid) from public, anon, authenticated;

grant execute on function private.completed_learner_exists() to authenticated;
grant execute on function private.exercise_version_is_accessible(uuid) to authenticated;
grant execute on function private.exercise_set_is_accessible(uuid) to authenticated;
grant execute on function private.question_is_accessible(uuid) to authenticated;
grant execute on function private.vocabulary_version_is_accessible(uuid) to authenticated;
grant execute on function private.grammar_version_is_accessible(uuid) to authenticated;

create policy "Learners can read accessible exercise sets"
on public.exercise_sets for select to authenticated
using ((select private.exercise_set_is_accessible(id)));
create policy "Learners can read accessible exercise versions"
on public.exercise_set_versions for select to authenticated
using ((select private.exercise_version_is_accessible(id)));
create policy "Learners can read accessible exercise questions"
on public.exercise_questions for select to authenticated
using ((select private.exercise_version_is_accessible(exercise_set_version_id)));
create policy "Learners can read accessible exercise options"
on public.exercise_options for select to authenticated
using ((select private.question_is_accessible(question_id)));
create policy "Learners can read published vocabulary identities"
on public.vocabulary_entries for select to authenticated
using (exists (
  select 1 from public.vocabulary_entry_versions as versions
  where versions.vocabulary_entry_id = vocabulary_entries.id
    and (select private.vocabulary_version_is_accessible(versions.id))
));
create policy "Learners can read published vocabulary versions"
on public.vocabulary_entry_versions for select to authenticated
using ((select private.vocabulary_version_is_accessible(id)));
create policy "Learners can read published grammar identities"
on public.grammar_topics for select to authenticated
using (exists (
  select 1 from public.grammar_topic_versions as versions
  where versions.grammar_topic_id = grammar_topics.id
    and (select private.grammar_version_is_accessible(versions.id))
));
create policy "Learners can read published grammar versions"
on public.grammar_topic_versions for select to authenticated
using ((select private.grammar_version_is_accessible(id)));
create policy "Learners can read their own attempts"
on public.learner_attempts for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Learners can read their own answers"
on public.learner_answers for select to authenticated
using (exists (
  select 1 from public.learner_attempts as attempts
  where attempts.id = learner_answers.attempt_id
    and attempts.user_id = (select auth.uid())
));
create policy "Learners can read their own answer selections"
on public.learner_answer_options for select to authenticated
using (exists (
  select 1 from public.learner_attempts as attempts
  where attempts.id = learner_answer_options.attempt_id
    and attempts.user_id = (select auth.uid())
));

create function private.normalize_exact_answer(value text, case_sensitive boolean)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when value is null then null
    when case_sensitive then pg_catalog.regexp_replace(pg_catalog.btrim(value), '[[:space:]]+', ' ', 'g')
    else pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(value), '[[:space:]]+', ' ', 'g'))
  end;
$$;

revoke all on function private.normalize_exact_answer(text, boolean)
from public, anon, authenticated;

create function public.start_exercise_attempt(
  p_exercise_slug text,
  p_idempotency_key text
)
returns public.learner_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_set_id uuid;
  target_version_id uuid;
  result public.learner_attempts;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_exercise_slug is null or p_exercise_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception using errcode = '22023', message = 'invalid exercise slug';
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  if not (select private.completed_learner_exists()) then
    raise exception using errcode = '42501', message = 'completed onboarding required';
  end if;

  select sets.id, versions.id into target_set_id, target_version_id
  from public.exercise_sets as sets
  join public.exercise_set_versions as versions on versions.exercise_set_id = sets.id
  where sets.slug = p_exercise_slug
    and versions.status = 'published'
    and versions.published_at <= now();
  if target_version_id is null then
    raise exception using errcode = 'P0002', message = 'exercise not found';
  end if;

  select attempts.* into result
  from public.learner_attempts as attempts
  where attempts.user_id = actor_id
    and attempts.start_idempotency_key = p_idempotency_key;
  if found then return result; end if;

  insert into public.learner_attempts (
    user_id, exercise_set_id, exercise_set_version_id, start_idempotency_key
  ) values (
    actor_id, target_set_id, target_version_id, p_idempotency_key
  )
  on conflict (user_id, exercise_set_id) where status = 'in_progress'
  do update set last_saved_at = now(), updated_at = now()
  returning * into result;

  return result;
end;
$$;

create function public.save_exercise_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_selected_option_ids uuid[],
  p_answer_text text,
  p_client_revision integer
)
returns public.learner_answers
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_attempt public.learner_attempts;
  target_question public.exercise_questions;
  result public.learner_answers;
  normalized_options uuid[];
  stored_options uuid[];
  input_count integer;
  distinct_count integer;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_client_revision is null or p_client_revision < 0 then
    raise exception using errcode = '22023', message = 'invalid client revision';
  end if;

  select attempts.* into target_attempt
  from public.learner_attempts as attempts
  where attempts.id = p_attempt_id and attempts.user_id = actor_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'attempt not found'; end if;
  if target_attempt.status <> 'in_progress' then
    raise exception using errcode = '55000', message = 'submitted attempt is immutable';
  end if;

  select questions.* into target_question
  from public.exercise_questions as questions
  where questions.id = p_question_id
    and questions.exercise_set_version_id = target_attempt.exercise_set_version_id;
  if not found then raise exception using errcode = '22023', message = 'question is not part of attempt'; end if;

  input_count := cardinality(coalesce(p_selected_option_ids, '{}'::uuid[]));
  select count(distinct option_id)::integer,
         coalesce(array_agg(distinct option_id order by option_id), '{}'::uuid[])
  into distinct_count, normalized_options
  from unnest(coalesce(p_selected_option_ids, '{}'::uuid[])) as selected(option_id);
  if input_count <> distinct_count then
    raise exception using errcode = '22023', message = 'duplicate selected option';
  end if;
  if exists (
    select 1 from unnest(normalized_options) as selected(option_id)
    where not exists (
      select 1 from public.exercise_options as options
      where options.id = selected.option_id and options.question_id = target_question.id
    )
  ) then
    raise exception using errcode = '22023', message = 'invalid selected option';
  end if;

  if target_question.question_type in ('single_choice', 'true_false') then
    if distinct_count <> 1 or nullif(btrim(coalesce(p_answer_text, '')), '') is not null then
      raise exception using errcode = '22023', message = 'one option is required';
    end if;
  elsif target_question.question_type = 'multiple_choice' then
    if distinct_count < 1 or nullif(btrim(coalesce(p_answer_text, '')), '') is not null then
      raise exception using errcode = '22023', message = 'one or more options are required';
    end if;
  elsif target_question.question_type = 'short_text' then
    if distinct_count <> 0 or nullif(btrim(coalesce(p_answer_text, '')), '') is null then
      raise exception using errcode = '22023', message = 'a text answer is required';
    end if;
  end if;

  select answers.* into result
  from public.learner_answers as answers
  where answers.attempt_id = target_attempt.id and answers.question_id = target_question.id;
  if found and p_client_revision <= result.client_revision then
    select coalesce(array_agg(options.option_id order by options.option_id), '{}'::uuid[])
    into stored_options
    from public.learner_answer_options as options
    where options.answer_id = result.id;
    if p_client_revision = result.client_revision
      and result.answer_text is not distinct from nullif(btrim(coalesce(p_answer_text, '')), '')
      and stored_options = normalized_options then
      return result;
    end if;
    raise exception using errcode = '40001', message = 'stale or conflicting answer revision';
  end if;

  insert into public.learner_answers (
    attempt_id, exercise_set_version_id, question_id, answer_text, client_revision, saved_at
  ) values (
    target_attempt.id,
    target_attempt.exercise_set_version_id,
    target_question.id,
    nullif(btrim(coalesce(p_answer_text, '')), ''),
    p_client_revision,
    now()
  )
  on conflict (attempt_id, question_id) do update set
    answer_text = excluded.answer_text,
    client_revision = excluded.client_revision,
    saved_at = excluded.saved_at
  returning * into result;

  delete from public.learner_answer_options where answer_id = result.id;
  insert into public.learner_answer_options (answer_id, attempt_id, question_id, option_id)
  select result.id, target_attempt.id, target_question.id, option_id
  from unnest(normalized_options) as selected(option_id);

  update public.learner_attempts set
    current_question_position = target_question.position,
    last_saved_at = now()
  where id = target_attempt.id;
  return result;
end;
$$;

create function public.submit_exercise_attempt(p_attempt_id uuid)
returns public.learner_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_attempt public.learner_attempts;
  answer_record record;
  correct boolean;
  awarded smallint;
  total_score integer := 0;
  total_max integer;
  selected_count integer;
  correct_count integer;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  select attempts.* into target_attempt
  from public.learner_attempts as attempts
  where attempts.id = p_attempt_id and attempts.user_id = actor_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'attempt not found'; end if;
  if target_attempt.status = 'scored' then return target_attempt; end if;
  if target_attempt.status <> 'in_progress' then
    raise exception using errcode = '55000', message = 'attempt cannot be submitted';
  end if;

  insert into public.learner_answers (
    attempt_id, exercise_set_version_id, question_id, answer_text, client_revision
  )
  select target_attempt.id, target_attempt.exercise_set_version_id, questions.id, null, 0
  from public.exercise_questions as questions
  where questions.exercise_set_version_id = target_attempt.exercise_set_version_id
  on conflict (attempt_id, question_id) do nothing;

  for answer_record in
    select answers.id as answer_id, answers.answer_text, questions.id as question_id,
      questions.question_type, questions.points, keys.case_sensitive
    from public.learner_answers as answers
    join public.exercise_questions as questions on questions.id = answers.question_id
    join private.exercise_answer_keys as keys on keys.question_id = questions.id
    where answers.attempt_id = target_attempt.id
    order by questions.position
  loop
    correct := false;
    if answer_record.question_type in ('single_choice', 'true_false', 'multiple_choice') then
      select count(*)::integer into selected_count
      from public.learner_answer_options as selections
      where selections.answer_id = answer_record.answer_id;
      select count(*)::integer into correct_count
      from private.exercise_correct_options as expected
      where expected.question_id = answer_record.question_id;
      correct := selected_count = correct_count
        and not exists (
          select 1 from public.learner_answer_options as selections
          where selections.answer_id = answer_record.answer_id
            and not exists (
              select 1 from private.exercise_correct_options as expected
              where expected.question_id = answer_record.question_id
                and expected.option_id = selections.option_id
            )
        );
    else
      correct := exists (
        select 1 from private.exercise_correct_text_answers as expected
        where expected.question_id = answer_record.question_id
          and expected.normalized_answer = private.normalize_exact_answer(
            answer_record.answer_text,
            answer_record.case_sensitive
          )
      );
    end if;
    awarded := case when correct then answer_record.points else 0 end;
    total_score := total_score + awarded;
    update public.learner_answers set
      is_correct = correct,
      awarded_points = awarded,
      finalized_at = now()
    where id = answer_record.answer_id;
  end loop;

  select sum(questions.points)::integer into total_max
  from public.exercise_questions as questions
  where questions.exercise_set_version_id = target_attempt.exercise_set_version_id;
  if total_max is null or total_max <= 0 then
    raise exception using errcode = '23514', message = 'exercise has no scorable questions';
  end if;

  update public.learner_attempts set
    status = 'scored', score = total_score, max_score = total_max,
    submitted_at = now(), scored_at = now(), last_saved_at = now()
  where id = target_attempt.id
  returning * into target_attempt;
  return target_attempt;
end;
$$;

create function public.get_exercise_attempt_result(p_attempt_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_attempt public.learner_attempts;
  review_allowed boolean;
  result jsonb;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  select attempts.* into target_attempt
  from public.learner_attempts as attempts
  where attempts.id = p_attempt_id and attempts.user_id = actor_id;
  if not found then raise exception using errcode = 'P0002', message = 'attempt not found'; end if;
  if target_attempt.status <> 'scored' then
    raise exception using errcode = '55000', message = 'result is not available before submit';
  end if;
  select versions.allow_review into review_allowed
  from public.exercise_set_versions as versions
  where versions.id = target_attempt.exercise_set_version_id;

  select jsonb_build_object(
    'attemptId', target_attempt.id,
    'exerciseSetId', target_attempt.exercise_set_id,
    'exerciseSetVersionId', target_attempt.exercise_set_version_id,
    'status', target_attempt.status,
    'score', target_attempt.score,
    'maxScore', target_attempt.max_score,
    'submittedAt', target_attempt.submitted_at,
    'reviewAllowed', review_allowed,
    'questions', coalesce(jsonb_agg(
      jsonb_build_object(
        'questionId', questions.id,
        'position', questions.position,
        'questionType', questions.question_type,
        'promptMarkdown', questions.prompt_markdown,
        'points', questions.points,
        'answerText', answers.answer_text,
        'selectedOptionIds', coalesce((
          select jsonb_agg(selections.option_id order by selections.option_id)
          from public.learner_answer_options as selections
          where selections.answer_id = answers.id
        ), '[]'::jsonb),
        'isCorrect', answers.is_correct,
        'awardedPoints', answers.awarded_points,
        'correctOptionIds', case when review_allowed then coalesce((
          select jsonb_agg(expected.option_id order by expected.option_id)
          from private.exercise_correct_options as expected
          where expected.question_id = questions.id
        ), '[]'::jsonb) else null end,
        'acceptedTextAnswers', case when review_allowed then coalesce((
          select jsonb_agg(expected.answer_text order by expected.answer_text)
          from private.exercise_correct_text_answers as expected
          where expected.question_id = questions.id
        ), '[]'::jsonb) else null end,
        'explanationMarkdown', case when review_allowed then keys.explanation_markdown else null end
      ) order by questions.position
    ), '[]'::jsonb)
  ) into result
  from public.exercise_questions as questions
  join public.learner_answers as answers
    on answers.question_id = questions.id and answers.attempt_id = target_attempt.id
  join private.exercise_answer_keys as keys on keys.question_id = questions.id
  where questions.exercise_set_version_id = target_attempt.exercise_set_version_id;
  return result;
end;
$$;

revoke all on function public.start_exercise_attempt(text, text) from public, anon, authenticated;
revoke all on function public.save_exercise_answer(uuid, uuid, uuid[], text, integer) from public, anon, authenticated;
revoke all on function public.submit_exercise_attempt(uuid) from public, anon, authenticated;
revoke all on function public.get_exercise_attempt_result(uuid) from public, anon, authenticated;
grant execute on function public.start_exercise_attempt(text, text) to authenticated;
grant execute on function public.save_exercise_answer(uuid, uuid, uuid[], text, integer) to authenticated;
grant execute on function public.submit_exercise_attempt(uuid) to authenticated;
grant execute on function public.get_exercise_attempt_result(uuid) to authenticated;

comment on table private.exercise_answer_keys is
  'Hidden scoring configuration. It is not exposed through the Data API and has no learner grants.';
comment on table public.learner_attempts is
  'Owner-scoped attempt snapshots. Score and state are written only by hardened database functions.';
comment on function public.submit_exercise_attempt(uuid) is
  'Idempotently locks and scores one owner attempt from its immutable published exercise version.';

commit;

begin;

insert into public.exercise_sets (id, slug, domain, display_order)
select seed.id::uuid, seed.slug, seed.domain, seed.display_order
from (values
  ('30000000-0000-4000-8000-000000000001', 'academic-vocabulary-foundations', 'vocabulary', 1),
  ('30000000-0000-4000-8000-000000000002', 'grammar-accuracy-foundations', 'grammar', 2),
  ('30000000-0000-4000-8000-000000000003', 'draft-content-review', 'grammar', 99)
) as seed (id, slug, domain, display_order)
where not exists (
  select 1 from public.exercise_sets as existing where existing.id = seed.id::uuid
);

insert into public.exercise_set_versions (
  id, exercise_set_id, version, title, summary, instructions_markdown,
  difficulty, status, allow_review
)
select
  seed.id::uuid,
  seed.exercise_set_id::uuid,
  seed.version,
  seed.title,
  seed.summary,
  seed.instructions_markdown,
  seed.difficulty,
  seed.status,
  seed.allow_review
from (values
  (
    '31000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    1,
    'Academic Vocabulary Foundations',
    'Practice a small set of original academic words used in IELTS learning contexts.',
    'Answer all four questions. Your work is saved after each answer, and explanations open after submission.',
    'beginner',
    'draft',
    true
  ),
  (
    '31000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000002',
    1,
    'Grammar Accuracy Foundations',
    'Check subject-verb agreement, articles and sentence control.',
    'Choose or type the most accurate answer. Scoring is exact and does not use AI.',
    'beginner',
    'draft',
    true
  ),
  (
    '31000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000003',
    1,
    'Draft Grammar Review',
    'Unpublished fixture used to prove draft content remains hidden.',
    'This content must never appear to learners before publication.',
    'beginner',
    'draft',
    false
  )
) as seed (
  id, exercise_set_id, version, title, summary, instructions_markdown,
  difficulty, status, allow_review
)
where not exists (
  select 1 from public.exercise_set_versions as existing where existing.id = seed.id::uuid
);

insert into public.exercise_questions (
  id, exercise_set_version_id, position, question_type, prompt_markdown, points
)
select
  seed.id::uuid,
  seed.exercise_set_version_id::uuid,
  seed.position,
  seed.question_type,
  seed.prompt_markdown,
  seed.points
from (values
  ('32000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 1, 'single_choice', 'Which meaning best matches **mitigate**?', 1),
  ('32000000-0000-4000-8000-000000000002', '31000000-0000-4000-8000-000000000001', 2, 'multiple_choice', 'Select the two words that can positively describe a well-written argument.', 2),
  ('32000000-0000-4000-8000-000000000003', '31000000-0000-4000-8000-000000000001', 3, 'true_false', '**Allocate** can mean to distribute a limited resource for a particular purpose.', 1),
  ('32000000-0000-4000-8000-000000000004', '31000000-0000-4000-8000-000000000001', 4, 'short_text', 'Complete with one seeded vocabulary word: “Better planning can ___ the risk of delay.”', 1),
  ('32000000-0000-4000-8000-000000000005', '31000000-0000-4000-8000-000000000002', 1, 'single_choice', 'Choose the sentence with correct subject-verb agreement.', 1),
  ('32000000-0000-4000-8000-000000000006', '31000000-0000-4000-8000-000000000002', 2, 'multiple_choice', 'Select both sentences with correct article use.', 2),
  ('32000000-0000-4000-8000-000000000007', '31000000-0000-4000-8000-000000000002', 3, 'true_false', 'Every uncountable noun should be preceded by **a** or **an**.', 1),
  ('32000000-0000-4000-8000-000000000008', '31000000-0000-4000-8000-000000000002', 4, 'short_text', 'Complete the sentence with the correct verb: “The evidence ___ that the policy is effective.”', 1)
) as seed (id, exercise_set_version_id, position, question_type, prompt_markdown, points)
where not exists (
  select 1 from public.exercise_questions as existing where existing.id = seed.id::uuid
);

insert into public.exercise_options (id, question_id, position, label)
select seed.id::uuid, seed.question_id::uuid, seed.position, seed.label
from (values
  ('33000000-0000-4000-8000-000000000001', '32000000-0000-4000-8000-000000000001', 1, 'To make a harmful effect less severe'),
  ('33000000-0000-4000-8000-000000000002', '32000000-0000-4000-8000-000000000001', 2, 'To measure something precisely'),
  ('33000000-0000-4000-8000-000000000003', '32000000-0000-4000-8000-000000000001', 3, 'To remove every limitation'),
  ('33000000-0000-4000-8000-000000000004', '32000000-0000-4000-8000-000000000002', 1, 'coherent'),
  ('33000000-0000-4000-8000-000000000005', '32000000-0000-4000-8000-000000000002', 2, 'compelling'),
  ('33000000-0000-4000-8000-000000000006', '32000000-0000-4000-8000-000000000002', 3, 'prevalent'),
  ('33000000-0000-4000-8000-000000000007', '32000000-0000-4000-8000-000000000002', 4, 'limited'),
  ('33000000-0000-4000-8000-000000000008', '32000000-0000-4000-8000-000000000003', 1, 'True'),
  ('33000000-0000-4000-8000-000000000009', '32000000-0000-4000-8000-000000000003', 2, 'False'),
  ('33000000-0000-4000-8000-000000000010', '32000000-0000-4000-8000-000000000005', 1, 'The number of applicants increases each year.'),
  ('33000000-0000-4000-8000-000000000011', '32000000-0000-4000-8000-000000000005', 2, 'The number of applicants increase each year.'),
  ('33000000-0000-4000-8000-000000000012', '32000000-0000-4000-8000-000000000005', 3, 'A range of options is available to students.'),
  ('33000000-0000-4000-8000-000000000013', '32000000-0000-4000-8000-000000000006', 1, 'The study offers a useful explanation.'),
  ('33000000-0000-4000-8000-000000000014', '32000000-0000-4000-8000-000000000006', 2, 'Education can improve social mobility.'),
  ('33000000-0000-4000-8000-000000000015', '32000000-0000-4000-8000-000000000006', 3, 'The education is always a solution.'),
  ('33000000-0000-4000-8000-000000000016', '32000000-0000-4000-8000-000000000006', 4, 'A evidence supports the claim.'),
  ('33000000-0000-4000-8000-000000000017', '32000000-0000-4000-8000-000000000007', 1, 'True'),
  ('33000000-0000-4000-8000-000000000018', '32000000-0000-4000-8000-000000000007', 2, 'False')
) as seed (id, question_id, position, label)
where not exists (
  select 1 from public.exercise_options as existing where existing.id = seed.id::uuid
);

insert into private.exercise_answer_keys (question_id, case_sensitive, explanation_markdown)
select seed.question_id::uuid, seed.case_sensitive, seed.explanation_markdown
from (values
  ('32000000-0000-4000-8000-000000000001', false, '**Mitigate** means to reduce the severity or impact of something harmful.'),
  ('32000000-0000-4000-8000-000000000002', false, '**Coherent** describes clear logical organization; **compelling** describes something persuasive.'),
  ('32000000-0000-4000-8000-000000000003', false, '**Allocate** commonly means to assign or distribute a resource for a purpose.'),
  ('32000000-0000-4000-8000-000000000004', false, '**Mitigate** fits because planning can reduce the risk rather than remove it completely.'),
  ('32000000-0000-4000-8000-000000000005', false, 'The head noun **number** is singular, so it takes **increases**.'),
  ('32000000-0000-4000-8000-000000000006', false, 'Use **a** for one non-specific countable explanation. General abstract **education** takes no article here.'),
  ('32000000-0000-4000-8000-000000000007', false, 'Uncountable nouns usually do not take **a/an**. Their determiner depends on meaning and context.'),
  ('32000000-0000-4000-8000-000000000008', false, 'The singular subject **evidence** takes the singular verb **suggests**.')
) as seed (question_id, case_sensitive, explanation_markdown)
where not exists (
  select 1 from private.exercise_answer_keys as existing
  where existing.question_id = seed.question_id::uuid
);

insert into private.exercise_correct_options (question_id, option_id)
select seed.question_id::uuid, seed.option_id::uuid
from (values
  ('32000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000001'),
  ('32000000-0000-4000-8000-000000000002', '33000000-0000-4000-8000-000000000004'),
  ('32000000-0000-4000-8000-000000000002', '33000000-0000-4000-8000-000000000005'),
  ('32000000-0000-4000-8000-000000000003', '33000000-0000-4000-8000-000000000008'),
  ('32000000-0000-4000-8000-000000000005', '33000000-0000-4000-8000-000000000010'),
  ('32000000-0000-4000-8000-000000000006', '33000000-0000-4000-8000-000000000013'),
  ('32000000-0000-4000-8000-000000000006', '33000000-0000-4000-8000-000000000014'),
  ('32000000-0000-4000-8000-000000000007', '33000000-0000-4000-8000-000000000018')
) as seed (question_id, option_id)
where not exists (
  select 1 from private.exercise_correct_options as existing
  where existing.question_id = seed.question_id::uuid
    and existing.option_id = seed.option_id::uuid
);

insert into private.exercise_correct_text_answers (
  question_id, answer_text, normalized_answer
)
select seed.question_id::uuid, seed.answer_text, seed.normalized_answer
from (values
  ('32000000-0000-4000-8000-000000000004', 'mitigate', 'mitigate'),
  ('32000000-0000-4000-8000-000000000008', 'suggests', 'suggests')
) as seed (question_id, answer_text, normalized_answer)
where not exists (
  select 1 from private.exercise_correct_text_answers as existing
  where existing.question_id = seed.question_id::uuid
    and existing.normalized_answer = seed.normalized_answer
);

update public.exercise_set_versions
set status = 'published', published_at = '2026-07-16T00:00:00Z'
where id in (
  '31000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000002'
)
and status = 'draft';

insert into public.vocabulary_entries (
  id, slug, normalized_term, part_of_speech, sense_key, display_order
)
select
  seed.id::uuid,
  seed.slug,
  seed.normalized_term,
  seed.part_of_speech,
  seed.sense_key,
  seed.display_order
from (values
  ('40000000-0000-4000-8000-000000000001', 'sustainable', 'sustainable', 'adjective', 'long-term', 1),
  ('40000000-0000-4000-8000-000000000002', 'mitigate', 'mitigate', 'verb', 'reduce-harm', 2),
  ('40000000-0000-4000-8000-000000000003', 'prevalent', 'prevalent', 'adjective', 'widespread', 3),
  ('40000000-0000-4000-8000-000000000004', 'allocate', 'allocate', 'verb', 'assign-resource', 4),
  ('40000000-0000-4000-8000-000000000005', 'compelling', 'compelling', 'adjective', 'persuasive', 5),
  ('40000000-0000-4000-8000-000000000006', 'coherent', 'coherent', 'adjective', 'logical', 6),
  ('40000000-0000-4000-8000-000000000007', 'constraint', 'constraint', 'noun', 'limitation', 7),
  ('40000000-0000-4000-8000-000000000008', 'evaluate', 'evaluate', 'verb', 'assess', 8)
) as seed (id, slug, normalized_term, part_of_speech, sense_key, display_order)
where not exists (
  select 1 from public.vocabulary_entries as existing where existing.id = seed.id::uuid
);

insert into public.vocabulary_entry_versions (
  id, vocabulary_entry_id, version, term, definition_vi, example_sentence,
  topic, tags, difficulty, status, related_exercise_set_id
)
select
  seed.id::uuid,
  seed.vocabulary_entry_id::uuid,
  seed.version,
  seed.term,
  seed.definition_vi,
  seed.example_sentence,
  seed.topic,
  seed.tags,
  seed.difficulty,
  seed.status,
  seed.related_exercise_set_id::uuid
from (values
  ('41000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 1, 'sustainable', 'có thể duy trì lâu dài mà không làm cạn kiệt nguồn lực', 'The city needs a sustainable transport plan that remains affordable over time.', 'environment', array['academic', 'policy'], 'beginner', 'draft', '30000000-0000-4000-8000-000000000001'),
  ('41000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 1, 'mitigate', 'làm giảm mức độ nghiêm trọng hoặc tác hại', 'Early intervention can mitigate the effects of prolonged learning loss.', 'society', array['academic', 'cause-effect'], 'intermediate', 'draft', '30000000-0000-4000-8000-000000000001'),
  ('41000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 1, 'prevalent', 'phổ biến hoặc thường gặp trong một nhóm hay khu vực', 'Remote work is increasingly prevalent in knowledge-based industries.', 'work', array['academic', 'trend'], 'intermediate', 'draft', '30000000-0000-4000-8000-000000000001'),
  ('41000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000004', 1, 'allocate', 'phân bổ nguồn lực cho một mục đích cụ thể', 'Schools should allocate enough time to guided reading practice.', 'education', array['academic', 'resource'], 'beginner', 'draft', '30000000-0000-4000-8000-000000000001'),
  ('41000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000005', 1, 'compelling', 'thuyết phục mạnh nhờ lý lẽ hoặc bằng chứng rõ', 'The writer presents a compelling case for safer public spaces.', 'writing', array['argument', 'evaluation'], 'intermediate', 'draft', '30000000-0000-4000-8000-000000000001'),
  ('41000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000006', 1, 'coherent', 'mạch lạc, có các ý kết nối theo trình tự hợp lý', 'A coherent paragraph develops one central idea from start to finish.', 'writing', array['cohesion', 'argument'], 'beginner', 'draft', '30000000-0000-4000-8000-000000000001'),
  ('41000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000007', 1, 'constraint', 'điều kiện hoặc giới hạn làm thu hẹp lựa chọn', 'Limited funding is a major constraint on the research programme.', 'research', array['academic', 'limitation'], 'intermediate', 'draft', '30000000-0000-4000-8000-000000000001'),
  ('41000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000008', 1, 'evaluate', 'đánh giá chất lượng hoặc giá trị dựa trên tiêu chí', 'Readers should evaluate whether each claim is supported by evidence.', 'study-skills', array['academic', 'critical-thinking'], 'beginner', 'draft', '30000000-0000-4000-8000-000000000001')
) as seed (
  id, vocabulary_entry_id, version, term, definition_vi, example_sentence,
  topic, tags, difficulty, status, related_exercise_set_id
)
where not exists (
  select 1 from public.vocabulary_entry_versions as existing where existing.id = seed.id::uuid
);

update public.vocabulary_entry_versions
set status = 'published', published_at = '2026-07-16T00:00:00Z'
where id between '41000000-0000-4000-8000-000000000001' and '41000000-0000-4000-8000-000000000008'
and status = 'draft';

insert into public.grammar_topics (id, slug, display_order)
select seed.id::uuid, seed.slug, seed.display_order
from (values
  ('50000000-0000-4000-8000-000000000001', 'subject-verb-agreement', 1),
  ('50000000-0000-4000-8000-000000000002', 'articles-in-academic-writing', 2),
  ('50000000-0000-4000-8000-000000000003', 'controlled-complex-sentences', 3)
) as seed (id, slug, display_order)
where not exists (
  select 1 from public.grammar_topics as existing where existing.id = seed.id::uuid
);

insert into public.grammar_topic_versions (
  id, grammar_topic_id, version, title, explanation_markdown, examples,
  common_mistakes, difficulty, status, related_exercise_set_id
)
select
  seed.id::uuid,
  seed.grammar_topic_id::uuid,
  seed.version,
  seed.title,
  seed.explanation_markdown,
  seed.examples::jsonb,
  seed.common_mistakes::jsonb,
  seed.difficulty,
  seed.status,
  seed.related_exercise_set_id::uuid
from (values
  (
    '51000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    1,
    'Subject-verb agreement',
    'Find the **head noun** of the subject before choosing the verb. Extra phrases between the subject and verb do not change the number of the head noun.',
    '[{"correct":"The number of applicants increases each year.","note":"The head noun number is singular."},{"correct":"A range of options is available.","note":"Range is the head noun."}]',
    '[{"wrong":"The number of applicants increase each year.","correction":"Use increases because number is singular."}]',
    'beginner',
    'draft',
    '30000000-0000-4000-8000-000000000002'
  ),
  (
    '51000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000002',
    1,
    'Articles in academic writing',
    'Use **a/an** for one non-specific countable noun, **the** for a specific or already identified noun, and no article for many general plural or uncountable ideas.',
    '[{"correct":"The study offers a useful explanation.","note":"Explanation is singular and non-specific."},{"correct":"Education can improve mobility.","note":"Education is a general uncountable idea."}]',
    '[{"wrong":"A evidence supports the claim.","correction":"Evidence is uncountable; do not use a."}]',
    'beginner',
    'draft',
    '30000000-0000-4000-8000-000000000002'
  ),
  (
    '51000000-0000-4000-8000-000000000003',
    '50000000-0000-4000-8000-000000000003',
    1,
    'Controlled complex sentences',
    'A complex sentence needs one independent clause and at least one dependent clause. Choose the relationship first, then use a connector that expresses it accurately.',
    '[{"correct":"Although the policy is costly, it may reduce long-term demand.","note":"Although introduces a contrast clause."},{"correct":"Cities invest in transit because congestion is expensive.","note":"Because introduces a reason."}]',
    '[{"wrong":"Although the policy is costly. It may reduce demand.","correction":"Join the dependent clause to the independent clause."}]',
    'intermediate',
    'draft',
    '30000000-0000-4000-8000-000000000002'
  )
) as seed (
  id, grammar_topic_id, version, title, explanation_markdown, examples,
  common_mistakes, difficulty, status, related_exercise_set_id
)
where not exists (
  select 1 from public.grammar_topic_versions as existing where existing.id = seed.id::uuid
);

update public.grammar_topic_versions
set status = 'published', published_at = '2026-07-16T00:00:00Z'
where id between '51000000-0000-4000-8000-000000000001' and '51000000-0000-4000-8000-000000000003'
and status = 'draft';

commit;

begin;

alter table public.exercise_sets
  drop constraint exercise_sets_domain_check;

alter table public.exercise_sets
  add constraint exercise_sets_domain_check check (
    domain in ('vocabulary', 'grammar', 'reading')
  );

alter table public.exercise_questions
  drop constraint exercise_questions_type_check;

alter table public.exercise_questions
  add constraint exercise_questions_type_check check (
    question_type in (
      'single_choice',
      'multiple_choice',
      'true_false',
      'short_text',
      'true_false_not_given',
      'matching_headings',
      'summary_completion'
    )
  );

create table public.reading_passages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  test_type text not null,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_passages_slug_check check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 1 and 120
  ),
  constraint reading_passages_test_type_check check (
    test_type in ('academic', 'general_training', 'both')
  ),
  constraint reading_passages_display_order_check check (
    display_order between 1 and 10000
  )
);

create table public.reading_passage_versions (
  id uuid primary key default gen_random_uuid(),
  reading_passage_id uuid not null references public.reading_passages (id) on delete restrict,
  version integer not null,
  title text not null,
  summary text not null,
  difficulty text not null,
  status text not null default 'draft',
  source_name text not null,
  source_url text,
  licence text not null,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_passage_versions_version_check check (version between 1 and 10000),
  constraint reading_passage_versions_title_check check (
    btrim(title) <> '' and char_length(title) <= 220
  ),
  constraint reading_passage_versions_summary_check check (
    btrim(summary) <> '' and char_length(summary) <= 1600
  ),
  constraint reading_passage_versions_difficulty_check check (
    difficulty in ('beginner', 'intermediate', 'advanced')
  ),
  constraint reading_passage_versions_status_check check (
    status in ('draft', 'in_review', 'published', 'archived')
  ),
  constraint reading_passage_versions_source_check check (
    btrim(source_name) <> ''
    and char_length(source_name) <= 300
    and btrim(licence) <> ''
    and char_length(licence) <= 300
    and (
      source_url is null
      or source_url ~ '^https://'
    )
  ),
  constraint reading_passage_versions_publication_check check (
    (
      status in ('draft', 'in_review')
      and published_at is null
      and archived_at is null
    )
    or (
      status = 'published'
      and published_at is not null
      and archived_at is null
    )
    or (
      status = 'archived'
      and published_at is not null
      and archived_at is not null
      and archived_at >= published_at
    )
  ),
  constraint reading_passage_versions_identity_version_unique unique (
    reading_passage_id,
    version
  ),
  constraint reading_passage_versions_identity_id_unique unique (
    reading_passage_id,
    id
  )
);

create unique index reading_passage_versions_one_published_idx
on public.reading_passage_versions (reading_passage_id)
where status = 'published';

create table public.reading_passage_sections (
  id uuid primary key default gen_random_uuid(),
  reading_passage_version_id uuid not null references public.reading_passage_versions (id) on delete restrict,
  position integer not null,
  heading text,
  body_markdown text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_passage_sections_position_check check (position between 1 and 100),
  constraint reading_passage_sections_heading_check check (
    heading is null or (btrim(heading) <> '' and char_length(heading) <= 220)
  ),
  constraint reading_passage_sections_body_check check (
    btrim(body_markdown) <> '' and char_length(body_markdown) <= 30000
  ),
  constraint reading_passage_sections_version_position_unique unique (
    reading_passage_version_id,
    position
  ),
  constraint reading_passage_sections_version_id_unique unique (
    reading_passage_version_id,
    id
  )
);

create table public.reading_practice_versions (
  exercise_set_version_id uuid primary key references public.exercise_set_versions (id) on delete restrict,
  reading_passage_version_id uuid not null unique references public.reading_passage_versions (id) on delete restrict,
  time_limit_seconds integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_practice_versions_time_limit_check check (
    time_limit_seconds between 60 and 7200
  ),
  constraint reading_practice_versions_pair_unique unique (
    exercise_set_version_id,
    reading_passage_version_id
  )
);

create table public.reading_question_groups (
  id uuid primary key default gen_random_uuid(),
  exercise_set_version_id uuid not null,
  reading_passage_version_id uuid not null,
  passage_section_id uuid,
  position integer not null,
  group_type text not null,
  title text not null,
  instructions_markdown text not null,
  max_answer_words smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_question_groups_practice_fkey foreign key (
    exercise_set_version_id,
    reading_passage_version_id
  ) references public.reading_practice_versions (
    exercise_set_version_id,
    reading_passage_version_id
  ) on delete restrict,
  constraint reading_question_groups_section_fkey foreign key (
    reading_passage_version_id,
    passage_section_id
  ) references public.reading_passage_sections (
    reading_passage_version_id,
    id
  ) on delete restrict,
  constraint reading_question_groups_position_check check (position between 1 and 100),
  constraint reading_question_groups_type_check check (
    group_type in (
      'multiple_choice',
      'true_false_not_given',
      'matching_headings',
      'summary_completion'
    )
  ),
  constraint reading_question_groups_title_check check (
    btrim(title) <> '' and char_length(title) <= 220
  ),
  constraint reading_question_groups_instructions_check check (
    btrim(instructions_markdown) <> ''
    and char_length(instructions_markdown) <= 10000
  ),
  constraint reading_question_groups_answer_words_check check (
    (
      group_type = 'summary_completion'
      and max_answer_words between 1 and 10
    )
    or (
      group_type <> 'summary_completion'
      and max_answer_words is null
    )
  ),
  constraint reading_question_groups_version_position_unique unique (
    exercise_set_version_id,
    position
  ),
  constraint reading_question_groups_version_id_unique unique (
    exercise_set_version_id,
    id
  )
);

alter table public.exercise_questions
  add column reading_question_group_id uuid;

alter table public.exercise_questions
  add constraint exercise_questions_reading_group_fkey foreign key (
    exercise_set_version_id,
    reading_question_group_id
  ) references public.reading_question_groups (
    exercise_set_version_id,
    id
  ) on delete restrict;

alter table public.learner_attempts
  add column reading_time_limit_seconds integer,
  add column expires_at timestamptz;

alter table public.learner_attempts
  add constraint learner_attempts_reading_timer_check check (
    (
      reading_time_limit_seconds is null
      and expires_at is null
    )
    or (
      reading_time_limit_seconds between 60 and 7200
      and expires_at is not null
      and expires_at > started_at
      and expires_at <= started_at + interval '2 hours'
    )
  );

create index reading_passage_versions_catalog_idx
on public.reading_passage_versions (status, difficulty, reading_passage_id, version desc);

create index reading_passage_sections_version_position_idx
on public.reading_passage_sections (reading_passage_version_id, position, id);

create index reading_practice_versions_passage_idx
on public.reading_practice_versions (reading_passage_version_id, exercise_set_version_id);

create index reading_question_groups_version_position_idx
on public.reading_question_groups (exercise_set_version_id, position, id);

create index reading_question_groups_section_idx
on public.reading_question_groups (reading_passage_version_id, passage_section_id)
where passage_section_id is not null;

create index exercise_questions_reading_group_idx
on public.exercise_questions (reading_question_group_id, position)
where reading_question_group_id is not null;

create index learner_attempts_reading_expiry_idx
on public.learner_attempts (user_id, expires_at)
where status = 'in_progress' and expires_at is not null;

create trigger set_reading_passages_updated_at
before update on public.reading_passages
for each row execute function public.set_profile_updated_at();

create trigger set_reading_passage_versions_updated_at
before update on public.reading_passage_versions
for each row execute function public.set_profile_updated_at();

create trigger set_reading_passage_sections_updated_at
before update on public.reading_passage_sections
for each row execute function public.set_profile_updated_at();

create trigger set_reading_practice_versions_updated_at
before update on public.reading_practice_versions
for each row execute function public.set_profile_updated_at();

create trigger set_reading_question_groups_updated_at
before update on public.reading_question_groups
for each row execute function public.set_profile_updated_at();

create function public.protect_reading_passage_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.status in ('published', 'archived') then
    raise exception using errcode = '55000', message = 'published reading passage versions are immutable';
  end if;
  if tg_op = 'UPDATE' and old.status = 'archived' then
    raise exception using errcode = '55000', message = 'archived reading passage versions are immutable';
  end if;
  if tg_op = 'UPDATE' and old.status = 'published' then
    if new.status = 'archived'
      and to_jsonb(new) - array['status', 'archived_at', 'updated_at']
        is not distinct from to_jsonb(old) - array['status', 'archived_at', 'updated_at']
      and new.archived_at is not null then
      return new;
    end if;
    raise exception using errcode = '55000', message = 'published reading passage versions are immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.protect_reading_passage_version()
from public, anon, authenticated;

create trigger protect_reading_passage_versions
before update or delete on public.reading_passage_versions
for each row execute function public.protect_reading_passage_version();

create function public.protect_reading_child_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  passage_version_id uuid;
  exercise_version_id uuid;
  passage_status text;
  exercise_status text;
begin
  if tg_table_name = 'reading_passage_sections' then
    passage_version_id := case when tg_op = 'DELETE'
      then old.reading_passage_version_id else new.reading_passage_version_id end;
  elsif tg_table_name = 'reading_practice_versions' then
    passage_version_id := case when tg_op = 'DELETE'
      then old.reading_passage_version_id else new.reading_passage_version_id end;
    exercise_version_id := case when tg_op = 'DELETE'
      then old.exercise_set_version_id else new.exercise_set_version_id end;
  elsif tg_table_name = 'reading_question_groups' then
    passage_version_id := case when tg_op = 'DELETE'
      then old.reading_passage_version_id else new.reading_passage_version_id end;
    exercise_version_id := case when tg_op = 'DELETE'
      then old.exercise_set_version_id else new.exercise_set_version_id end;
  else
    raise exception using errcode = 'P0001', message = 'unsupported reading content table';
  end if;

  select versions.status into passage_status
  from public.reading_passage_versions as versions
  where versions.id = passage_version_id;

  if exercise_version_id is not null then
    select versions.status into exercise_status
    from public.exercise_set_versions as versions
    where versions.id = exercise_version_id;
  end if;

  if passage_status in ('published', 'archived')
    or exercise_status in ('published', 'archived') then
    raise exception using errcode = '55000', message = 'published reading content is immutable';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.protect_reading_child_content()
from public, anon, authenticated;

create trigger protect_reading_passage_sections
before insert or update or delete on public.reading_passage_sections
for each row execute function public.protect_reading_child_content();

create trigger protect_reading_practice_versions
before insert or update or delete on public.reading_practice_versions
for each row execute function public.protect_reading_child_content();

create trigger protect_reading_question_groups
before insert or update or delete on public.reading_question_groups
for each row execute function public.protect_reading_child_content();

create function public.validate_reading_passage_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  section_count integer;
begin
  if new.status <> 'published' or old.status = 'published' then
    return new;
  end if;

  select count(*)::integer into section_count
  from public.reading_passage_sections as sections
  where sections.reading_passage_version_id = new.id;

  if section_count = 0 then
    raise exception using errcode = '23514', message = 'a published reading passage requires at least one section';
  end if;

  if (
    select min(sections.position) <> 1 or max(sections.position) <> count(*)
    from public.reading_passage_sections as sections
    where sections.reading_passage_version_id = new.id
  ) then
    raise exception using errcode = '23514', message = 'published reading section positions must be contiguous';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_reading_passage_publication()
from public, anon, authenticated;

create trigger validate_reading_passage_before_publish
before update on public.reading_passage_versions
for each row execute function public.validate_reading_passage_publication();

create function private.reading_passage_version_is_accessible(target_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.reading_passage_versions as versions
    join public.reading_passages as passages
      on passages.id = versions.reading_passage_id
    join public.learner_profiles as learners
      on learners.user_id = (select auth.uid())
    where versions.id = target_version_id
      and versions.status = 'published'
      and versions.published_at <= now()
      and learners.onboarding_completed_at is not null
      and (
        passages.test_type = 'both'
        or passages.test_type = learners.test_type
      )
  ) or exists (
    select 1
    from public.learner_attempts as attempts
    join public.reading_practice_versions as practice
      on practice.exercise_set_version_id = attempts.exercise_set_version_id
    where attempts.user_id = (select auth.uid())
      and practice.reading_passage_version_id = target_version_id
  );
$$;

create function private.reading_passage_is_accessible(target_passage_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.reading_passage_versions as versions
    where versions.reading_passage_id = target_passage_id
      and (select private.reading_passage_version_is_accessible(versions.id))
  );
$$;

create function private.reading_section_is_accessible(target_section_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.reading_passage_sections as sections
    where sections.id = target_section_id
      and (select private.reading_passage_version_is_accessible(sections.reading_passage_version_id))
  );
$$;

create function private.reading_practice_version_is_accessible(target_exercise_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.reading_practice_versions as practice
    join public.exercise_set_versions as versions
      on versions.id = practice.exercise_set_version_id
    where practice.exercise_set_version_id = target_exercise_version_id
      and (
        (
          versions.status = 'published'
          and versions.published_at <= now()
          and (select private.reading_passage_version_is_accessible(practice.reading_passage_version_id))
        )
        or exists (
          select 1
          from public.learner_attempts as attempts
          where attempts.user_id = (select auth.uid())
            and attempts.exercise_set_version_id = target_exercise_version_id
        )
      )
  );
$$;

create function private.reading_question_group_is_accessible(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.reading_question_groups as groups
    where groups.id = target_group_id
      and (select private.reading_practice_version_is_accessible(groups.exercise_set_version_id))
  );
$$;

revoke all on function private.reading_passage_version_is_accessible(uuid)
from public, anon, authenticated;
revoke all on function private.reading_passage_is_accessible(uuid)
from public, anon, authenticated;
revoke all on function private.reading_section_is_accessible(uuid)
from public, anon, authenticated;
revoke all on function private.reading_practice_version_is_accessible(uuid)
from public, anon, authenticated;
revoke all on function private.reading_question_group_is_accessible(uuid)
from public, anon, authenticated;

grant execute on function private.reading_passage_version_is_accessible(uuid) to authenticated;
grant execute on function private.reading_passage_is_accessible(uuid) to authenticated;
grant execute on function private.reading_section_is_accessible(uuid) to authenticated;
grant execute on function private.reading_practice_version_is_accessible(uuid) to authenticated;
grant execute on function private.reading_question_group_is_accessible(uuid) to authenticated;

create or replace function private.exercise_version_is_accessible(target_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.exercise_set_versions as versions
    join public.exercise_sets as sets on sets.id = versions.exercise_set_id
    where versions.id = target_version_id
      and versions.status = 'published'
      and versions.published_at <= now()
      and (select private.completed_learner_exists())
      and (
        sets.domain <> 'reading'
        or (select private.reading_practice_version_is_accessible(versions.id))
      )
  ) or exists (
    select 1
    from public.learner_attempts as attempts
    where attempts.user_id = (select auth.uid())
      and attempts.exercise_set_version_id = target_version_id
  );
$$;

revoke all on function private.exercise_version_is_accessible(uuid)
from public, anon, authenticated;
grant execute on function private.exercise_version_is_accessible(uuid) to authenticated;

alter table public.reading_passages enable row level security;
alter table public.reading_passage_versions enable row level security;
alter table public.reading_passage_sections enable row level security;
alter table public.reading_practice_versions enable row level security;
alter table public.reading_question_groups enable row level security;

revoke all on table public.reading_passages from anon, authenticated;
revoke all on table public.reading_passage_versions from anon, authenticated;
revoke all on table public.reading_passage_sections from anon, authenticated;
revoke all on table public.reading_practice_versions from anon, authenticated;
revoke all on table public.reading_question_groups from anon, authenticated;

grant select on table public.reading_passages to authenticated;
grant select on table public.reading_passage_versions to authenticated;
grant select on table public.reading_passage_sections to authenticated;
grant select on table public.reading_practice_versions to authenticated;
grant select on table public.reading_question_groups to authenticated;

create policy "Learners can read accessible reading passages"
on public.reading_passages for select to authenticated
using ((select private.reading_passage_is_accessible(id)));

create policy "Learners can read accessible reading passage versions"
on public.reading_passage_versions for select to authenticated
using ((select private.reading_passage_version_is_accessible(id)));

create policy "Learners can read accessible reading sections"
on public.reading_passage_sections for select to authenticated
using ((select private.reading_passage_version_is_accessible(reading_passage_version_id)));

create policy "Learners can read accessible reading practice versions"
on public.reading_practice_versions for select to authenticated
using ((select private.reading_practice_version_is_accessible(exercise_set_version_id)));

create policy "Learners can read accessible reading question groups"
on public.reading_question_groups for select to authenticated
using ((select private.reading_practice_version_is_accessible(exercise_set_version_id)));

create or replace function public.validate_exercise_version_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  question_count integer;
  invalid_count integer;
  target_domain text;
  group_count integer;
begin
  if new.status <> 'published' or old.status = 'published' then
    return new;
  end if;

  select sets.domain into target_domain
  from public.exercise_sets as sets
  where sets.id = new.exercise_set_id;

  select count(*)::integer into question_count
  from public.exercise_questions as questions
  where questions.exercise_set_version_id = new.id;

  if question_count = 0 then
    raise exception using errcode = '23514', message = 'a published exercise requires at least one question';
  end if;

  select count(*)::integer into invalid_count
  from public.exercise_questions as questions
  where questions.exercise_set_version_id = new.id
    and not exists (
      select 1 from private.exercise_answer_keys as keys where keys.question_id = questions.id
    );
  if invalid_count > 0 then
    raise exception using errcode = '23514', message = 'every published question requires an answer key';
  end if;

  select count(*)::integer into invalid_count
  from public.exercise_questions as questions
  where questions.exercise_set_version_id = new.id
    and (
      (questions.question_type in (
        'single_choice', 'true_false', 'true_false_not_given', 'matching_headings'
      ) and (
        (select count(*) from public.exercise_options as options where options.question_id = questions.id) < 2
        or (select count(*) from private.exercise_correct_options as correct where correct.question_id = questions.id) <> 1
        or exists (select 1 from private.exercise_correct_text_answers as texts where texts.question_id = questions.id)
      ))
      or (questions.question_type = 'multiple_choice' and (
        (select count(*) from public.exercise_options as options where options.question_id = questions.id) < 2
        or (select count(*) from private.exercise_correct_options as correct where correct.question_id = questions.id) < 1
        or exists (select 1 from private.exercise_correct_text_answers as texts where texts.question_id = questions.id)
      ))
      or (questions.question_type in ('short_text', 'summary_completion') and (
        exists (select 1 from public.exercise_options as options where options.question_id = questions.id)
        or exists (select 1 from private.exercise_correct_options as correct where correct.question_id = questions.id)
        or not exists (select 1 from private.exercise_correct_text_answers as texts where texts.question_id = questions.id)
      ))
    );
  if invalid_count > 0 then
    raise exception using errcode = '23514', message = 'published questions have invalid answer configuration';
  end if;

  if (
    select min(questions.position) <> 1 or max(questions.position) <> count(*)
    from public.exercise_questions as questions
    where questions.exercise_set_version_id = new.id
  ) then
    raise exception using errcode = '23514', message = 'published question positions must be contiguous';
  end if;

  if target_domain = 'reading' then
    if not exists (
      select 1
      from public.reading_practice_versions as practice
      join public.reading_passage_versions as passages
        on passages.id = practice.reading_passage_version_id
      where practice.exercise_set_version_id = new.id
        and passages.status = 'published'
        and passages.published_at <= now()
    ) then
      raise exception using errcode = '23514', message = 'a published reading exercise requires a published passage snapshot';
    end if;

    select count(*)::integer into group_count
    from public.reading_question_groups as groups
    where groups.exercise_set_version_id = new.id;
    if group_count = 0 then
      raise exception using errcode = '23514', message = 'a published reading exercise requires question groups';
    end if;

    if (
      select min(groups.position) <> 1 or max(groups.position) <> count(*)
      from public.reading_question_groups as groups
      where groups.exercise_set_version_id = new.id
    ) then
      raise exception using errcode = '23514', message = 'published reading group positions must be contiguous';
    end if;

    if exists (
      select 1
      from public.exercise_questions as questions
      left join public.reading_question_groups as groups
        on groups.id = questions.reading_question_group_id
       and groups.exercise_set_version_id = questions.exercise_set_version_id
      where questions.exercise_set_version_id = new.id
        and (
          groups.id is null
          or groups.group_type <> questions.question_type
        )
    ) then
      raise exception using errcode = '23514', message = 'reading questions require a matching question group';
    end if;
  elsif exists (
    select 1
    from public.exercise_questions as questions
    where questions.exercise_set_version_id = new.id
      and questions.reading_question_group_id is not null
  ) then
    raise exception using errcode = '23514', message = 'non-reading exercises cannot use reading question groups';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_exercise_version_publication()
from public, anon, authenticated;

create or replace function public.start_exercise_attempt(
  p_exercise_slug text,
  p_idempotency_key text
)
returns public.learner_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_set_id uuid;
  target_version_id uuid;
  target_time_limit integer;
  attempt_started_at timestamptz := now();
  result public.learner_attempts;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_exercise_slug is null or p_exercise_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception using errcode = '22023', message = 'invalid exercise slug';
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  if not (select private.completed_learner_exists()) then
    raise exception using errcode = '42501', message = 'completed onboarding required';
  end if;

  select sets.id, versions.id, practice.time_limit_seconds
  into target_set_id, target_version_id, target_time_limit
  from public.exercise_sets as sets
  join public.exercise_set_versions as versions on versions.exercise_set_id = sets.id
  left join public.reading_practice_versions as practice
    on practice.exercise_set_version_id = versions.id
  where sets.slug = p_exercise_slug
    and versions.status = 'published'
    and versions.published_at <= now()
    and (select private.exercise_version_is_accessible(versions.id));
  if target_version_id is null then
    raise exception using errcode = 'P0002', message = 'exercise not found';
  end if;

  select attempts.* into result
  from public.learner_attempts as attempts
  where attempts.user_id = actor_id
    and attempts.start_idempotency_key = p_idempotency_key;
  if found then
    if result.exercise_set_id <> target_set_id then
      raise exception using errcode = '23505', message = 'idempotency key belongs to another exercise';
    end if;
    return result;
  end if;

  insert into public.learner_attempts (
    user_id,
    exercise_set_id,
    exercise_set_version_id,
    start_idempotency_key,
    started_at,
    reading_time_limit_seconds,
    expires_at
  ) values (
    actor_id,
    target_set_id,
    target_version_id,
    p_idempotency_key,
    attempt_started_at,
    target_time_limit,
    case when target_time_limit is null then null
      else attempt_started_at + make_interval(secs => target_time_limit) end
  )
  on conflict (user_id, exercise_set_id) where status = 'in_progress'
  do update set last_saved_at = now(), updated_at = now()
  returning * into result;

  return result;
end;
$$;

create or replace function public.save_exercise_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_selected_option_ids uuid[],
  p_answer_text text,
  p_client_revision integer
)
returns public.learner_answers
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_attempt public.learner_attempts;
  target_question public.exercise_questions;
  result public.learner_answers;
  normalized_options uuid[];
  stored_options uuid[];
  input_count integer;
  distinct_count integer;
  maximum_words integer;
  answer_word_count integer;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_client_revision is null or p_client_revision < 0 then
    raise exception using errcode = '22023', message = 'invalid client revision';
  end if;

  select attempts.* into target_attempt
  from public.learner_attempts as attempts
  where attempts.id = p_attempt_id and attempts.user_id = actor_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'attempt not found'; end if;
  if target_attempt.status <> 'in_progress' then
    raise exception using errcode = '55000', message = 'submitted attempt is immutable';
  end if;

  select questions.* into target_question
  from public.exercise_questions as questions
  where questions.id = p_question_id
    and questions.exercise_set_version_id = target_attempt.exercise_set_version_id;
  if not found then raise exception using errcode = '22023', message = 'question is not part of attempt'; end if;

  input_count := cardinality(coalesce(p_selected_option_ids, '{}'::uuid[]));
  select count(distinct option_id)::integer,
         coalesce(array_agg(distinct option_id order by option_id), '{}'::uuid[])
  into distinct_count, normalized_options
  from unnest(coalesce(p_selected_option_ids, '{}'::uuid[])) as selected(option_id);
  if input_count <> distinct_count then
    raise exception using errcode = '22023', message = 'duplicate selected option';
  end if;
  if exists (
    select 1 from unnest(normalized_options) as selected(option_id)
    where not exists (
      select 1 from public.exercise_options as options
      where options.id = selected.option_id and options.question_id = target_question.id
    )
  ) then
    raise exception using errcode = '22023', message = 'invalid selected option';
  end if;

  if target_question.question_type in (
    'single_choice', 'true_false', 'true_false_not_given', 'matching_headings'
  ) then
    if distinct_count <> 1 or nullif(btrim(coalesce(p_answer_text, '')), '') is not null then
      raise exception using errcode = '22023', message = 'one option is required';
    end if;
  elsif target_question.question_type = 'multiple_choice' then
    if distinct_count < 1 or nullif(btrim(coalesce(p_answer_text, '')), '') is not null then
      raise exception using errcode = '22023', message = 'one or more options are required';
    end if;
  elsif target_question.question_type in ('short_text', 'summary_completion') then
    if distinct_count <> 0 or nullif(btrim(coalesce(p_answer_text, '')), '') is null then
      raise exception using errcode = '22023', message = 'a text answer is required';
    end if;
    if target_question.question_type = 'summary_completion' then
      select groups.max_answer_words into maximum_words
      from public.reading_question_groups as groups
      where groups.id = target_question.reading_question_group_id;
      answer_word_count := cardinality(
        regexp_split_to_array(btrim(p_answer_text), '[[:space:]]+')
      );
      if maximum_words is null or answer_word_count > maximum_words then
        raise exception using errcode = '22023', message = 'text answer exceeds the declared word limit';
      end if;
    end if;
  else
    raise exception using errcode = '22023', message = 'unsupported question type';
  end if;

  select answers.* into result
  from public.learner_answers as answers
  where answers.attempt_id = target_attempt.id and answers.question_id = target_question.id;
  if found and p_client_revision <= result.client_revision then
    select coalesce(array_agg(options.option_id order by options.option_id), '{}'::uuid[])
    into stored_options
    from public.learner_answer_options as options
    where options.answer_id = result.id;
    if p_client_revision = result.client_revision
      and result.answer_text is not distinct from nullif(btrim(coalesce(p_answer_text, '')), '')
      and stored_options = normalized_options then
      return result;
    end if;
    raise exception using errcode = '40001', message = 'stale or conflicting answer revision';
  end if;

  insert into public.learner_answers (
    attempt_id, exercise_set_version_id, question_id, answer_text, client_revision, saved_at
  ) values (
    target_attempt.id,
    target_attempt.exercise_set_version_id,
    target_question.id,
    nullif(btrim(coalesce(p_answer_text, '')), ''),
    p_client_revision,
    now()
  )
  on conflict (attempt_id, question_id) do update set
    answer_text = excluded.answer_text,
    client_revision = excluded.client_revision,
    saved_at = excluded.saved_at
  returning * into result;

  delete from public.learner_answer_options where answer_id = result.id;
  insert into public.learner_answer_options (answer_id, attempt_id, question_id, option_id)
  select result.id, target_attempt.id, target_question.id, option_id
  from unnest(normalized_options) as selected(option_id);

  update public.learner_attempts set
    current_question_position = target_question.position,
    last_saved_at = now()
  where id = target_attempt.id;
  return result;
end;
$$;

create or replace function public.submit_exercise_attempt(p_attempt_id uuid)
returns public.learner_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_attempt public.learner_attempts;
  answer_record record;
  correct boolean;
  awarded smallint;
  total_score integer := 0;
  total_max integer;
  selected_count integer;
  correct_count integer;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  select attempts.* into target_attempt
  from public.learner_attempts as attempts
  where attempts.id = p_attempt_id and attempts.user_id = actor_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'attempt not found'; end if;
  if target_attempt.status = 'scored' then return target_attempt; end if;
  if target_attempt.status <> 'in_progress' then
    raise exception using errcode = '55000', message = 'attempt cannot be submitted';
  end if;

  insert into public.learner_answers (
    attempt_id, exercise_set_version_id, question_id, answer_text, client_revision
  )
  select target_attempt.id, target_attempt.exercise_set_version_id, questions.id, null, 0
  from public.exercise_questions as questions
  where questions.exercise_set_version_id = target_attempt.exercise_set_version_id
  on conflict (attempt_id, question_id) do nothing;

  for answer_record in
    select answers.id as answer_id, answers.answer_text, questions.id as question_id,
      questions.question_type, questions.points, keys.case_sensitive
    from public.learner_answers as answers
    join public.exercise_questions as questions on questions.id = answers.question_id
    join private.exercise_answer_keys as keys on keys.question_id = questions.id
    where answers.attempt_id = target_attempt.id
    order by questions.position
  loop
    correct := false;
    if answer_record.question_type in (
      'single_choice', 'true_false', 'multiple_choice',
      'true_false_not_given', 'matching_headings'
    ) then
      select count(*)::integer into selected_count
      from public.learner_answer_options as selections
      where selections.answer_id = answer_record.answer_id;
      select count(*)::integer into correct_count
      from private.exercise_correct_options as expected
      where expected.question_id = answer_record.question_id;
      correct := selected_count = correct_count
        and not exists (
          select 1 from public.learner_answer_options as selections
          where selections.answer_id = answer_record.answer_id
            and not exists (
              select 1 from private.exercise_correct_options as expected
              where expected.question_id = answer_record.question_id
                and expected.option_id = selections.option_id
            )
        );
    else
      correct := exists (
        select 1 from private.exercise_correct_text_answers as expected
        where expected.question_id = answer_record.question_id
          and expected.normalized_answer = private.normalize_exact_answer(
            answer_record.answer_text,
            answer_record.case_sensitive
          )
      );
    end if;
    awarded := case when correct then answer_record.points else 0 end;
    total_score := total_score + awarded;
    update public.learner_answers set
      is_correct = correct,
      awarded_points = awarded,
      finalized_at = now()
    where id = answer_record.answer_id;
  end loop;

  select sum(questions.points)::integer into total_max
  from public.exercise_questions as questions
  where questions.exercise_set_version_id = target_attempt.exercise_set_version_id;
  if total_max is null or total_max <= 0 then
    raise exception using errcode = '23514', message = 'exercise has no scorable questions';
  end if;

  update public.learner_attempts set
    status = 'scored', score = total_score, max_score = total_max,
    submitted_at = now(), scored_at = now(), last_saved_at = now()
  where id = target_attempt.id
  returning * into target_attempt;
  return target_attempt;
end;
$$;

create or replace function public.get_exercise_attempt_result(p_attempt_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_attempt public.learner_attempts;
  review_allowed boolean;
  result jsonb;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  select attempts.* into target_attempt
  from public.learner_attempts as attempts
  where attempts.id = p_attempt_id and attempts.user_id = actor_id;
  if not found then raise exception using errcode = 'P0002', message = 'attempt not found'; end if;
  if target_attempt.status <> 'scored' then
    raise exception using errcode = '55000', message = 'result is not available before submit';
  end if;
  select versions.allow_review into review_allowed
  from public.exercise_set_versions as versions
  where versions.id = target_attempt.exercise_set_version_id;

  select jsonb_build_object(
    'attemptId', target_attempt.id,
    'exerciseSetId', target_attempt.exercise_set_id,
    'exerciseSetVersionId', target_attempt.exercise_set_version_id,
    'status', target_attempt.status,
    'score', target_attempt.score,
    'maxScore', target_attempt.max_score,
    'startedAt', target_attempt.started_at,
    'expiresAt', target_attempt.expires_at,
    'submittedAt', target_attempt.submitted_at,
    'submittedAfterTimeLimit', case
      when target_attempt.expires_at is null then false
      else target_attempt.submitted_at > target_attempt.expires_at
    end,
    'reviewAllowed', review_allowed,
    'questions', coalesce(jsonb_agg(
      jsonb_build_object(
        'questionId', questions.id,
        'position', questions.position,
        'questionType', questions.question_type,
        'promptMarkdown', questions.prompt_markdown,
        'points', questions.points,
        'answerText', answers.answer_text,
        'selectedOptionIds', coalesce((
          select jsonb_agg(selections.option_id order by selections.option_id)
          from public.learner_answer_options as selections
          where selections.answer_id = answers.id
        ), '[]'::jsonb),
        'isCorrect', answers.is_correct,
        'awardedPoints', answers.awarded_points,
        'correctOptionIds', case when review_allowed then coalesce((
          select jsonb_agg(expected.option_id order by expected.option_id)
          from private.exercise_correct_options as expected
          where expected.question_id = questions.id
        ), '[]'::jsonb) else null end,
        'acceptedTextAnswers', case when review_allowed then coalesce((
          select jsonb_agg(expected.answer_text order by expected.answer_text)
          from private.exercise_correct_text_answers as expected
          where expected.question_id = questions.id
        ), '[]'::jsonb) else null end,
        'explanationMarkdown', case when review_allowed then keys.explanation_markdown else null end
      ) order by questions.position
    ), '[]'::jsonb)
  ) into result
  from public.exercise_questions as questions
  join public.learner_answers as answers
    on answers.question_id = questions.id and answers.attempt_id = target_attempt.id
  join private.exercise_answer_keys as keys on keys.question_id = questions.id
  where questions.exercise_set_version_id = target_attempt.exercise_set_version_id;
  return result;
end;
$$;

create function public.get_reading_attempt_clock(p_attempt_id uuid)
returns table (
  attempt_id uuid,
  started_at timestamptz,
  expires_at timestamptz,
  server_now timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select attempts.id, attempts.started_at, attempts.expires_at, now()
  from public.learner_attempts as attempts
  join public.exercise_sets as sets on sets.id = attempts.exercise_set_id
  where attempts.id = p_attempt_id
    and attempts.user_id = (select auth.uid())
    and sets.domain = 'reading';
$$;

revoke all on function public.start_exercise_attempt(text, text)
from public, anon, authenticated;
revoke all on function public.save_exercise_answer(uuid, uuid, uuid[], text, integer)
from public, anon, authenticated;
revoke all on function public.submit_exercise_attempt(uuid)
from public, anon, authenticated;
revoke all on function public.get_exercise_attempt_result(uuid)
from public, anon, authenticated;
revoke all on function public.get_reading_attempt_clock(uuid)
from public, anon, authenticated;

grant execute on function public.start_exercise_attempt(text, text) to authenticated;
grant execute on function public.save_exercise_answer(uuid, uuid, uuid[], text, integer) to authenticated;
grant execute on function public.submit_exercise_attempt(uuid) to authenticated;
grant execute on function public.get_exercise_attempt_result(uuid) to authenticated;
grant execute on function public.get_reading_attempt_clock(uuid) to authenticated;

comment on table public.reading_passages is
  'Stable Reading passage identities. Learners can select only published, test-type-compatible content through RLS.';
comment on table public.reading_passage_versions is
  'Immutable published Reading passage metadata with mandatory source and licence provenance.';
comment on table public.reading_passage_sections is
  'Ordered Markdown sections for one immutable Reading passage version. Raw HTML is not a supported content format.';
comment on table public.reading_practice_versions is
  'Pins one exercise version to one Reading passage version and a server-owned time limit.';
comment on table public.reading_question_groups is
  'Ordered Reading question-group instructions linked to the shared Phase 5 exercise engine.';
comment on column public.learner_attempts.expires_at is
  'Server-derived advisory Reading deadline. Submission timestamps remain database-owned and are never accepted from the client.';
comment on function public.get_reading_attempt_clock(uuid) is
  'Returns an owner-scoped server clock snapshot for rendering a non-authoritative client countdown.';

commit;

begin;

insert into public.reading_passages (id, slug, test_type, display_order)
select
  '66000000-0000-4000-8000-000000000001'::uuid,
  'cool-roofs-neighbourhood-pilot',
  'academic',
  1
where not exists (
  select 1
  from public.reading_passages
  where id = '66000000-0000-4000-8000-000000000001'::uuid
);

insert into public.reading_passage_versions (
  id,
  reading_passage_id,
  version,
  title,
  summary,
  difficulty,
  status,
  source_name,
  source_url,
  licence
)
select
  '66000000-0000-4000-8000-000000000002'::uuid,
  '66000000-0000-4000-8000-000000000001'::uuid,
  1,
  'Cool roofs: what one neighbourhood pilot actually showed',
  'An original short Academic Reading passage about a community heat-mitigation pilot and the limits of its evidence.',
  'intermediate',
  'draft',
  'IELTS Self-study project editorial team',
  null,
  'Original project-authored content'
where not exists (
  select 1
  from public.reading_passage_versions
  where id = '66000000-0000-4000-8000-000000000002'::uuid
);

insert into public.reading_passage_sections (
  id,
  reading_passage_version_id,
  position,
  heading,
  body_markdown
)
select seed.id::uuid, seed.version_id::uuid, seed.position, seed.heading, seed.body
from (values
  (
    '66000000-0000-4000-8000-000000000010',
    '66000000-0000-4000-8000-000000000002',
    1,
    'A',
    'On hot afternoons, a city street can remain warm long after nearby fields have begun to cool. Dark roofs and paved surfaces absorb solar energy during the day and release it slowly in the evening. This does not mean every part of a city is equally hot. Shade, building height, traffic and access to green space can produce noticeable differences over only a few blocks. For residents, those differences matter because indoor temperatures are influenced by the materials above and around their homes.'
  ),
  (
    '66000000-0000-4000-8000-000000000011',
    '66000000-0000-4000-8000-000000000002',
    2,
    'B',
    'A neighbourhood association in the fictional city of Bellwether tested a modest response. With permission from twelve homeowners, volunteers coated half of each selected roof with a pale, reflective finish while leaving the other half unchanged. Small sensors recorded surface temperature at fifteen-minute intervals for six weeks. The team also placed identical thermometers in the upper rooms below four of the roofs. This split-roof design did not remove every source of variation, but it allowed each treated surface to be compared with a nearby untreated surface exposed to almost the same weather.'
  ),
  (
    '66000000-0000-4000-8000-000000000012',
    '66000000-0000-4000-8000-000000000002',
    3,
    'C',
    'During clear midday periods, the coated areas were usually cooler at the surface. The difference was smaller after cloudy mornings and almost disappeared at night. Indoor measurements were less consistent: two rooms became slightly cooler, one changed very little, and one was affected by an open window that made comparison unreliable. The project therefore reported surface temperature as its strongest result rather than claiming a guaranteed reduction in household energy use.'
  ),
  (
    '66000000-0000-4000-8000-000000000013',
    '66000000-0000-4000-8000-000000000002',
    4,
    'D',
    'The volunteers also learned that installation was only part of the work. Dust reduced the brightness of several coated sections, and two roofs needed small repairs before coating. A follow-up inspection was scheduled for the next dry season to see whether cleaning and maintenance changed performance. Because the pilot involved few homes and lasted only six weeks, its organisers did not describe it as proof for the whole city. Instead, they treated it as a practical method for asking better questions before funding a larger study.'
  )
) as seed(id, version_id, position, heading, body)
where not exists (
  select 1
  from public.reading_passage_sections as existing
  where existing.id = seed.id::uuid
);

insert into public.exercise_sets (id, slug, domain, display_order)
select
  '66000000-0000-4000-8000-000000000100'::uuid,
  'academic-reading-cool-roofs',
  'reading',
  30
where not exists (
  select 1
  from public.exercise_sets
  where id = '66000000-0000-4000-8000-000000000100'::uuid
);

insert into public.exercise_set_versions (
  id,
  exercise_set_id,
  version,
  title,
  summary,
  instructions_markdown,
  difficulty,
  status,
  allow_review
)
select
  '66000000-0000-4000-8000-000000000101'::uuid,
  '66000000-0000-4000-8000-000000000100'::uuid,
  1,
  'Cool roofs neighbourhood pilot',
  'Read an original research-style passage and answer ten questions across four Reading task types.',
  'Read the passage carefully. Your answers are saved automatically. The countdown is guidance for this practice set; the database records the real start and submit times.',
  'intermediate',
  'draft',
  true
where not exists (
  select 1
  from public.exercise_set_versions
  where id = '66000000-0000-4000-8000-000000000101'::uuid
);

insert into public.reading_practice_versions (
  exercise_set_version_id,
  reading_passage_version_id,
  time_limit_seconds
)
select
  '66000000-0000-4000-8000-000000000101'::uuid,
  '66000000-0000-4000-8000-000000000002'::uuid,
  1200
where not exists (
  select 1
  from public.reading_practice_versions
  where exercise_set_version_id = '66000000-0000-4000-8000-000000000101'::uuid
);

insert into public.reading_question_groups (
  id,
  exercise_set_version_id,
  reading_passage_version_id,
  passage_section_id,
  position,
  group_type,
  title,
  instructions_markdown,
  max_answer_words
)
select
  seed.id::uuid,
  '66000000-0000-4000-8000-000000000101'::uuid,
  '66000000-0000-4000-8000-000000000002'::uuid,
  seed.section_id::uuid,
  seed.position,
  seed.group_type,
  seed.title,
  seed.instructions,
  seed.max_words
from (values
  (
    '66000000-0000-4000-8000-000000000110',
    null,
    1,
    'multiple_choice',
    'Questions 1–2',
    'Choose the correct answer. Question 2 has more than one correct option.',
    null::smallint
  ),
  (
    '66000000-0000-4000-8000-000000000111',
    null,
    2,
    'true_false_not_given',
    'Questions 3–5',
    'Choose **True** if the statement agrees with the passage, **False** if it contradicts the passage, or **Not Given** if the passage does not say.',
    null::smallint
  ),
  (
    '66000000-0000-4000-8000-000000000112',
    null,
    3,
    'matching_headings',
    'Questions 6–8',
    'Choose the best heading for each named section. One heading will not be used.',
    null::smallint
  ),
  (
    '66000000-0000-4000-8000-000000000113',
    '66000000-0000-4000-8000-000000000013',
    4,
    'summary_completion',
    'Questions 9–10',
    'Complete each sentence with **no more than two words** from the passage.',
    2::smallint
  )
) as seed(id, section_id, position, group_type, title, instructions, max_words)
where not exists (
  select 1
  from public.reading_question_groups as existing
  where existing.id = seed.id::uuid
);

insert into public.exercise_questions (
  id,
  exercise_set_version_id,
  position,
  question_type,
  prompt_markdown,
  points,
  reading_question_group_id
)
select
  seed.id::uuid,
  '66000000-0000-4000-8000-000000000101'::uuid,
  seed.position,
  seed.question_type,
  seed.prompt,
  1,
  seed.group_id::uuid
from (values
  ('66000000-0000-4000-8000-000000000201', 1, 'multiple_choice', 'What is the main purpose of paragraph B?', '66000000-0000-4000-8000-000000000110'),
  ('66000000-0000-4000-8000-000000000202', 2, 'multiple_choice', 'Which **two** features strengthened the comparison in the pilot?', '66000000-0000-4000-8000-000000000110'),
  ('66000000-0000-4000-8000-000000000203', 3, 'true_false_not_given', 'Every part of a city experiences the same afternoon temperature.', '66000000-0000-4000-8000-000000000111'),
  ('66000000-0000-4000-8000-000000000204', 4, 'true_false_not_given', 'The coated roof areas were generally cooler at midday on clear days.', '66000000-0000-4000-8000-000000000111'),
  ('66000000-0000-4000-8000-000000000205', 5, 'true_false_not_given', 'The association paid each homeowner to join the pilot.', '66000000-0000-4000-8000-000000000111'),
  ('66000000-0000-4000-8000-000000000206', 6, 'matching_headings', 'Section A', '66000000-0000-4000-8000-000000000112'),
  ('66000000-0000-4000-8000-000000000207', 7, 'matching_headings', 'Section B', '66000000-0000-4000-8000-000000000112'),
  ('66000000-0000-4000-8000-000000000208', 8, 'matching_headings', 'Section C', '66000000-0000-4000-8000-000000000112'),
  ('66000000-0000-4000-8000-000000000209', 9, 'summary_completion', 'The project described ________ as its strongest result.', '66000000-0000-4000-8000-000000000113'),
  ('66000000-0000-4000-8000-000000000210', 10, 'summary_completion', 'A later inspection will examine whether cleaning and ________ affect performance.', '66000000-0000-4000-8000-000000000113')
) as seed(id, position, question_type, prompt, group_id)
where not exists (
  select 1
  from public.exercise_questions as existing
  where existing.id = seed.id::uuid
);

insert into public.exercise_options (id, question_id, position, label)
select seed.id::uuid, seed.question_id::uuid, seed.position, seed.label
from (values
  ('66000000-0000-4000-8000-000000000301', '66000000-0000-4000-8000-000000000201', 1, 'To prove that reflective roofs reduce energy use in every home'),
  ('66000000-0000-4000-8000-000000000302', '66000000-0000-4000-8000-000000000201', 2, 'To describe how the neighbourhood comparison was organised'),
  ('66000000-0000-4000-8000-000000000303', '66000000-0000-4000-8000-000000000201', 3, 'To explain why the project was cancelled'),
  ('66000000-0000-4000-8000-000000000304', '66000000-0000-4000-8000-000000000201', 4, 'To compare Bellwether with nearby fields'),
  ('66000000-0000-4000-8000-000000000305', '66000000-0000-4000-8000-000000000202', 1, 'Each roof contained treated and untreated areas.'),
  ('66000000-0000-4000-8000-000000000306', '66000000-0000-4000-8000-000000000202', 2, 'Sensors recorded measurements at regular intervals.'),
  ('66000000-0000-4000-8000-000000000307', '66000000-0000-4000-8000-000000000202', 3, 'All homes had identical windows and insulation.'),
  ('66000000-0000-4000-8000-000000000308', '66000000-0000-4000-8000-000000000202', 4, 'The study continued for a full year.'),
  ('66000000-0000-4000-8000-000000000309', '66000000-0000-4000-8000-000000000203', 1, 'True'),
  ('66000000-0000-4000-8000-000000000310', '66000000-0000-4000-8000-000000000203', 2, 'False'),
  ('66000000-0000-4000-8000-000000000311', '66000000-0000-4000-8000-000000000203', 3, 'Not Given'),
  ('66000000-0000-4000-8000-000000000312', '66000000-0000-4000-8000-000000000204', 1, 'True'),
  ('66000000-0000-4000-8000-000000000313', '66000000-0000-4000-8000-000000000204', 2, 'False'),
  ('66000000-0000-4000-8000-000000000314', '66000000-0000-4000-8000-000000000204', 3, 'Not Given'),
  ('66000000-0000-4000-8000-000000000315', '66000000-0000-4000-8000-000000000205', 1, 'True'),
  ('66000000-0000-4000-8000-000000000316', '66000000-0000-4000-8000-000000000205', 2, 'False'),
  ('66000000-0000-4000-8000-000000000317', '66000000-0000-4000-8000-000000000205', 3, 'Not Given'),
  ('66000000-0000-4000-8000-000000000318', '66000000-0000-4000-8000-000000000206', 1, 'Why heat differs across a city'),
  ('66000000-0000-4000-8000-000000000319', '66000000-0000-4000-8000-000000000206', 2, 'A practical split-roof trial'),
  ('66000000-0000-4000-8000-000000000320', '66000000-0000-4000-8000-000000000206', 3, 'Evidence with important limits'),
  ('66000000-0000-4000-8000-000000000321', '66000000-0000-4000-8000-000000000206', 4, 'Maintenance after installation'),
  ('66000000-0000-4000-8000-000000000322', '66000000-0000-4000-8000-000000000207', 1, 'Why heat differs across a city'),
  ('66000000-0000-4000-8000-000000000323', '66000000-0000-4000-8000-000000000207', 2, 'A practical split-roof trial'),
  ('66000000-0000-4000-8000-000000000324', '66000000-0000-4000-8000-000000000207', 3, 'Evidence with important limits'),
  ('66000000-0000-4000-8000-000000000325', '66000000-0000-4000-8000-000000000207', 4, 'Maintenance after installation'),
  ('66000000-0000-4000-8000-000000000326', '66000000-0000-4000-8000-000000000208', 1, 'Why heat differs across a city'),
  ('66000000-0000-4000-8000-000000000327', '66000000-0000-4000-8000-000000000208', 2, 'A practical split-roof trial'),
  ('66000000-0000-4000-8000-000000000328', '66000000-0000-4000-8000-000000000208', 3, 'Evidence with important limits'),
  ('66000000-0000-4000-8000-000000000329', '66000000-0000-4000-8000-000000000208', 4, 'Maintenance after installation')
) as seed(id, question_id, position, label)
where not exists (
  select 1
  from public.exercise_options as existing
  where existing.id = seed.id::uuid
);

insert into private.exercise_answer_keys (
  question_id,
  case_sensitive,
  explanation_markdown
)
select seed.question_id::uuid, false, seed.explanation
from (values
  ('66000000-0000-4000-8000-000000000201', 'Paragraph B explains the split-roof design, sensors and comparison method.'),
  ('66000000-0000-4000-8000-000000000202', 'The treated and untreated halves shared nearly the same weather, and sensors recorded measurements every fifteen minutes.'),
  ('66000000-0000-4000-8000-000000000203', 'The passage says temperatures can differ over only a few blocks, so the statement contradicts the text.'),
  ('66000000-0000-4000-8000-000000000204', 'Paragraph C states that coated areas were usually cooler during clear midday periods.'),
  ('66000000-0000-4000-8000-000000000205', 'Homeowner payment is not mentioned.'),
  ('66000000-0000-4000-8000-000000000206', 'Section A explains the local factors that make urban heat uneven.'),
  ('66000000-0000-4000-8000-000000000207', 'Section B describes the practical split-roof experiment.'),
  ('66000000-0000-4000-8000-000000000208', 'Section C reports the result while explaining why the indoor evidence was limited.'),
  ('66000000-0000-4000-8000-000000000209', 'The exact phrase used in paragraph C is “surface temperature”.'),
  ('66000000-0000-4000-8000-000000000210', 'Paragraph D pairs cleaning with maintenance in the follow-up question.')
) as seed(question_id, explanation)
where not exists (
  select 1
  from private.exercise_answer_keys as existing
  where existing.question_id = seed.question_id::uuid
);

insert into private.exercise_correct_options (question_id, option_id)
select seed.question_id::uuid, seed.option_id::uuid
from (values
  ('66000000-0000-4000-8000-000000000201', '66000000-0000-4000-8000-000000000302'),
  ('66000000-0000-4000-8000-000000000202', '66000000-0000-4000-8000-000000000305'),
  ('66000000-0000-4000-8000-000000000202', '66000000-0000-4000-8000-000000000306'),
  ('66000000-0000-4000-8000-000000000203', '66000000-0000-4000-8000-000000000310'),
  ('66000000-0000-4000-8000-000000000204', '66000000-0000-4000-8000-000000000312'),
  ('66000000-0000-4000-8000-000000000205', '66000000-0000-4000-8000-000000000317'),
  ('66000000-0000-4000-8000-000000000206', '66000000-0000-4000-8000-000000000318'),
  ('66000000-0000-4000-8000-000000000207', '66000000-0000-4000-8000-000000000323'),
  ('66000000-0000-4000-8000-000000000208', '66000000-0000-4000-8000-000000000328')
) as seed(question_id, option_id)
where not exists (
  select 1
  from private.exercise_correct_options as existing
  where existing.question_id = seed.question_id::uuid
    and existing.option_id = seed.option_id::uuid
);

insert into private.exercise_correct_text_answers (
  question_id,
  answer_text,
  normalized_answer
)
select seed.question_id::uuid, seed.answer_text, lower(seed.answer_text)
from (values
  ('66000000-0000-4000-8000-000000000209', 'surface temperature'),
  ('66000000-0000-4000-8000-000000000209', 'surface temperatures'),
  ('66000000-0000-4000-8000-000000000210', 'maintenance')
) as seed(question_id, answer_text)
where not exists (
  select 1
  from private.exercise_correct_text_answers as existing
  where existing.question_id = seed.question_id::uuid
    and existing.normalized_answer = lower(seed.answer_text)
);

update public.reading_passage_versions
set status = 'published', published_at = '2026-07-16T00:00:00Z'::timestamptz
where id = '66000000-0000-4000-8000-000000000002'::uuid
  and status = 'draft';

update public.exercise_set_versions
set status = 'published', published_at = '2026-07-16T00:00:00Z'::timestamptz
where id = '66000000-0000-4000-8000-000000000101'::uuid
  and status = 'draft';

insert into public.reading_passages (id, slug, test_type, display_order)
select
  '66000000-0000-4000-8000-000000000901'::uuid,
  'draft-river-restoration-notes',
  'academic',
  99
where not exists (
  select 1
  from public.reading_passages
  where id = '66000000-0000-4000-8000-000000000901'::uuid
);

insert into public.reading_passage_versions (
  id,
  reading_passage_id,
  version,
  title,
  summary,
  difficulty,
  status,
  source_name,
  source_url,
  licence
)
select
  '66000000-0000-4000-8000-000000000902'::uuid,
  '66000000-0000-4000-8000-000000000901'::uuid,
  1,
  'Draft river restoration notes',
  'An unpublished fixture used only to verify draft isolation.',
  'intermediate',
  'draft',
  'IELTS Self-study project editorial team',
  null,
  'Original project-authored content'
where not exists (
  select 1
  from public.reading_passage_versions
  where id = '66000000-0000-4000-8000-000000000902'::uuid
);

insert into public.exercise_sets (id, slug, domain, display_order)
select
  '66000000-0000-4000-8000-000000000903'::uuid,
  'draft-academic-reading-river-restoration',
  'reading',
  99
where not exists (
  select 1
  from public.exercise_sets
  where id = '66000000-0000-4000-8000-000000000903'::uuid
);

insert into public.exercise_set_versions (
  id,
  exercise_set_id,
  version,
  title,
  summary,
  instructions_markdown,
  difficulty,
  status,
  allow_review
)
select
  '66000000-0000-4000-8000-000000000904'::uuid,
  '66000000-0000-4000-8000-000000000903'::uuid,
  1,
  'Draft Academic Reading fixture',
  'Unpublished exercise fixture for RLS verification.',
  'This content must never be visible to learners.',
  'intermediate',
  'draft',
  true
where not exists (
  select 1
  from public.exercise_set_versions
  where id = '66000000-0000-4000-8000-000000000904'::uuid
);

commit;

begin;

alter table public.exercise_sets
  drop constraint exercise_sets_domain_check;

alter table public.exercise_sets
  add constraint exercise_sets_domain_check check (
    domain in ('vocabulary', 'grammar', 'reading', 'listening')
  );

create table public.listening_audio_assets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  asset_path text not null unique,
  mime_type text not null,
  duration_seconds integer not null,
  sha256 text not null,
  source_name text not null,
  source_url text,
  licence text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listening_audio_assets_slug_check check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 1 and 120
  ),
  constraint listening_audio_assets_path_check check (
    asset_path ~ '^/audio/listening/[a-z0-9][a-z0-9._/-]*\.wav$'
    and asset_path !~ '\.\.'
    and char_length(asset_path) <= 500
  ),
  constraint listening_audio_assets_mime_check check (mime_type = 'audio/wav'),
  constraint listening_audio_assets_duration_check check (duration_seconds between 1 and 7200),
  constraint listening_audio_assets_sha256_check check (sha256 ~ '^[0-9a-f]{64}$'),
  constraint listening_audio_assets_provenance_check check (
    btrim(source_name) <> '' and char_length(source_name) <= 300
    and btrim(licence) <> '' and char_length(licence) <= 300
    and (source_url is null or source_url ~ '^https://')
  )
);

create table public.listening_practice_versions (
  exercise_set_version_id uuid primary key references public.exercise_set_versions (id) on delete restrict,
  audio_asset_id uuid not null references public.listening_audio_assets (id) on delete restrict,
  test_type text not null,
  time_limit_seconds integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listening_practice_versions_test_type_check check (
    test_type in ('academic', 'general_training', 'both')
  ),
  constraint listening_practice_versions_time_limit_check check (
    time_limit_seconds between 60 and 7200
  ),
  constraint listening_practice_versions_version_audio_unique unique (
    exercise_set_version_id,
    audio_asset_id
  )
);

create table public.listening_parts (
  id uuid primary key default gen_random_uuid(),
  exercise_set_version_id uuid not null references public.listening_practice_versions (exercise_set_version_id) on delete restrict,
  position integer not null,
  title text not null,
  instructions_markdown text not null,
  audio_start_seconds integer not null,
  audio_end_seconds integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listening_parts_position_check check (position between 1 and 100),
  constraint listening_parts_title_check check (btrim(title) <> '' and char_length(title) <= 220),
  constraint listening_parts_instructions_check check (
    btrim(instructions_markdown) <> '' and char_length(instructions_markdown) <= 10000
  ),
  constraint listening_parts_audio_range_check check (
    audio_start_seconds >= 0
    and audio_end_seconds > audio_start_seconds
    and audio_end_seconds <= 7200
  ),
  constraint listening_parts_version_position_unique unique (exercise_set_version_id, position),
  constraint listening_parts_version_id_unique unique (exercise_set_version_id, id)
);

create table private.listening_transcripts (
  audio_asset_id uuid primary key references public.listening_audio_assets (id) on delete restrict,
  transcript_markdown text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listening_transcripts_body_check check (
    btrim(transcript_markdown) <> '' and char_length(transcript_markdown) <= 30000
  )
);

alter table public.exercise_questions
  add column listening_part_id uuid;

alter table public.exercise_questions
  add constraint exercise_questions_listening_part_fkey foreign key (
    exercise_set_version_id,
    listening_part_id
  ) references public.listening_parts (
    exercise_set_version_id,
    id
  ) on delete restrict;

alter table public.learner_attempts
  add column time_limit_seconds integer;

update public.learner_attempts
set time_limit_seconds = reading_time_limit_seconds
where reading_time_limit_seconds is not null;

alter table public.learner_attempts
  drop constraint learner_attempts_reading_timer_check;

alter table public.learner_attempts
  add constraint learner_attempts_timer_check check (
    (
      time_limit_seconds is null
      and reading_time_limit_seconds is null
      and expires_at is null
    )
    or (
      time_limit_seconds between 60 and 7200
      and expires_at is not null
      and expires_at > started_at
      and expires_at <= started_at + interval '2 hours'
      and (
        reading_time_limit_seconds is null
        or reading_time_limit_seconds = time_limit_seconds
      )
    )
  );

create index listening_practice_versions_audio_idx
on public.listening_practice_versions (audio_asset_id, exercise_set_version_id);

create index listening_parts_version_position_idx
on public.listening_parts (exercise_set_version_id, position, id);

create index exercise_questions_listening_part_idx
on public.exercise_questions (listening_part_id, position)
where listening_part_id is not null;

create index learner_attempts_listening_expiry_idx
on public.learner_attempts (user_id, expires_at)
where status = 'in_progress' and time_limit_seconds is not null;

create trigger set_listening_audio_assets_updated_at
before update on public.listening_audio_assets
for each row execute function public.set_profile_updated_at();

create trigger set_listening_practice_versions_updated_at
before update on public.listening_practice_versions
for each row execute function public.set_profile_updated_at();

create trigger set_listening_parts_updated_at
before update on public.listening_parts
for each row execute function public.set_profile_updated_at();

create trigger set_listening_transcripts_updated_at
before update on private.listening_transcripts
for each row execute function public.set_profile_updated_at();

create function public.protect_listening_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_audio_id uuid;
  target_version_id uuid;
  published_reference_exists boolean;
begin
  if tg_table_schema = 'private' and tg_table_name = 'listening_transcripts' then
    target_audio_id := case when tg_op = 'DELETE' then old.audio_asset_id else new.audio_asset_id end;
  elsif tg_table_name = 'listening_audio_assets' then
    target_audio_id := case when tg_op = 'DELETE' then old.id else new.id end;
  elsif tg_table_name = 'listening_practice_versions' then
    target_audio_id := case when tg_op = 'DELETE' then old.audio_asset_id else new.audio_asset_id end;
    target_version_id := case when tg_op = 'DELETE' then old.exercise_set_version_id else new.exercise_set_version_id end;
  elsif tg_table_name = 'listening_parts' then
    target_version_id := case when tg_op = 'DELETE' then old.exercise_set_version_id else new.exercise_set_version_id end;
  else
    raise exception using errcode = 'P0001', message = 'unsupported listening content table';
  end if;

  select exists (
    select 1
    from public.listening_practice_versions as practice
    join public.exercise_set_versions as versions
      on versions.id = practice.exercise_set_version_id
    where (target_audio_id is not null and practice.audio_asset_id = target_audio_id)
      and versions.status in ('published', 'archived')
  ) or exists (
    select 1
    from public.exercise_set_versions as versions
    where target_version_id is not null
      and versions.id = target_version_id
      and versions.status in ('published', 'archived')
  ) into published_reference_exists;

  if published_reference_exists then
    raise exception using errcode = '55000', message = 'published listening content is immutable';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.protect_listening_content()
from public, anon, authenticated;

create trigger protect_listening_audio_assets
before update or delete on public.listening_audio_assets
for each row execute function public.protect_listening_content();

create trigger protect_listening_practice_versions
before insert or update or delete on public.listening_practice_versions
for each row execute function public.protect_listening_content();

create trigger protect_listening_parts
before insert or update or delete on public.listening_parts
for each row execute function public.protect_listening_content();

create trigger protect_listening_transcripts
before update or delete on private.listening_transcripts
for each row execute function public.protect_listening_content();

create function private.listening_practice_version_is_accessible(target_exercise_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.listening_practice_versions as practice
    join public.exercise_set_versions as versions
      on versions.id = practice.exercise_set_version_id
    join public.learner_profiles as learners
      on learners.user_id = (select auth.uid())
    where practice.exercise_set_version_id = target_exercise_version_id
      and versions.status = 'published'
      and versions.published_at <= now()
      and learners.onboarding_completed_at is not null
      and (practice.test_type = 'both' or practice.test_type = learners.test_type)
  ) or exists (
    select 1
    from public.learner_attempts as attempts
    where attempts.user_id = (select auth.uid())
      and attempts.exercise_set_version_id = target_exercise_version_id
  );
$$;

create function private.listening_audio_is_accessible(target_audio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.listening_practice_versions as practice
    where practice.audio_asset_id = target_audio_id
      and (select private.listening_practice_version_is_accessible(practice.exercise_set_version_id))
  );
$$;

create function private.listening_part_is_accessible(target_part_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.listening_parts as parts
    where parts.id = target_part_id
      and (select private.listening_practice_version_is_accessible(parts.exercise_set_version_id))
  );
$$;

revoke all on function private.listening_practice_version_is_accessible(uuid)
from public, anon, authenticated;
revoke all on function private.listening_audio_is_accessible(uuid)
from public, anon, authenticated;
revoke all on function private.listening_part_is_accessible(uuid)
from public, anon, authenticated;

grant execute on function private.listening_practice_version_is_accessible(uuid) to authenticated;
grant execute on function private.listening_audio_is_accessible(uuid) to authenticated;
grant execute on function private.listening_part_is_accessible(uuid) to authenticated;

create or replace function private.exercise_version_is_accessible(target_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.exercise_set_versions as versions
    join public.exercise_sets as sets on sets.id = versions.exercise_set_id
    where versions.id = target_version_id
      and versions.status = 'published'
      and versions.published_at <= now()
      and (select private.completed_learner_exists())
      and (
        (sets.domain = 'reading' and (select private.reading_practice_version_is_accessible(versions.id)))
        or (sets.domain = 'listening' and (select private.listening_practice_version_is_accessible(versions.id)))
        or sets.domain in ('vocabulary', 'grammar')
      )
  ) or exists (
    select 1
    from public.learner_attempts as attempts
    where attempts.user_id = (select auth.uid())
      and attempts.exercise_set_version_id = target_version_id
  );
$$;

revoke all on function private.exercise_version_is_accessible(uuid)
from public, anon, authenticated;
grant execute on function private.exercise_version_is_accessible(uuid) to authenticated;

alter table public.listening_audio_assets enable row level security;
alter table public.listening_practice_versions enable row level security;
alter table public.listening_parts enable row level security;

revoke all on table public.listening_audio_assets from anon, authenticated;
revoke all on table public.listening_practice_versions from anon, authenticated;
revoke all on table public.listening_parts from anon, authenticated;
revoke all on table private.listening_transcripts from public, anon, authenticated;

grant select on table public.listening_audio_assets to authenticated;
grant select on table public.listening_practice_versions to authenticated;
grant select on table public.listening_parts to authenticated;

create policy "Learners can read accessible listening audio metadata"
on public.listening_audio_assets for select to authenticated
using ((select private.listening_audio_is_accessible(id)));

create policy "Learners can read accessible listening practice versions"
on public.listening_practice_versions for select to authenticated
using ((select private.listening_practice_version_is_accessible(exercise_set_version_id)));

create policy "Learners can read accessible listening parts"
on public.listening_parts for select to authenticated
using ((select private.listening_practice_version_is_accessible(exercise_set_version_id)));

create function public.validate_listening_exercise_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_domain text;
  part_count integer;
  audio_duration integer;
begin
  select sets.domain into target_domain
  from public.exercise_sets as sets
  where sets.id = new.exercise_set_id;

  if new.status = 'published' and old.status <> 'published' and target_domain = 'listening' then
    select assets.duration_seconds into audio_duration
    from public.listening_practice_versions as practice
    join public.listening_audio_assets as assets on assets.id = practice.audio_asset_id
    where practice.exercise_set_version_id = new.id;
    if audio_duration is null then
      raise exception using errcode = '23514', message = 'a published listening exercise requires an audio snapshot';
    end if;

    select count(*)::integer into part_count
    from public.listening_parts as parts
    where parts.exercise_set_version_id = new.id;
    if part_count = 0 then
      raise exception using errcode = '23514', message = 'a published listening exercise requires at least one part';
    end if;
    if (
      select min(parts.position) <> 1 or max(parts.position) <> count(*)
      from public.listening_parts as parts
      where parts.exercise_set_version_id = new.id
    ) then
      raise exception using errcode = '23514', message = 'published listening part positions must be contiguous';
    end if;
    if exists (
      select 1 from public.listening_parts as parts
      where parts.exercise_set_version_id = new.id
        and parts.audio_end_seconds > audio_duration
    ) then
      raise exception using errcode = '23514', message = 'listening part exceeds the declared audio duration';
    end if;
    if exists (
      select 1
      from public.exercise_questions as questions
      left join public.listening_parts as parts
        on parts.id = questions.listening_part_id
       and parts.exercise_set_version_id = questions.exercise_set_version_id
      where questions.exercise_set_version_id = new.id
        and (
          parts.id is null
          or questions.question_type not in ('single_choice', 'multiple_choice', 'short_text')
          or questions.reading_question_group_id is not null
        )
    ) then
      raise exception using errcode = '23514', message = 'listening questions require a valid part and supported type';
    end if;
    if not exists (
      select 1
      from public.listening_practice_versions as practice
      join private.listening_transcripts as transcripts on transcripts.audio_asset_id = practice.audio_asset_id
      where practice.exercise_set_version_id = new.id
    ) then
      raise exception using errcode = '23514', message = 'a published listening exercise requires a private transcript';
    end if;
  elsif target_domain <> 'listening' and exists (
    select 1 from public.exercise_questions as questions
    where questions.exercise_set_version_id = new.id
      and questions.listening_part_id is not null
  ) then
    raise exception using errcode = '23514', message = 'non-listening exercises cannot use listening parts';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_listening_exercise_publication()
from public, anon, authenticated;

create trigger validate_listening_exercise_before_publish
before update on public.exercise_set_versions
for each row execute function public.validate_listening_exercise_publication();

create or replace function public.start_exercise_attempt(
  p_exercise_slug text,
  p_idempotency_key text
)
returns public.learner_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_set_id uuid;
  target_version_id uuid;
  target_domain text;
  target_time_limit integer;
  attempt_started_at timestamptz := now();
  result public.learner_attempts;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  if p_exercise_slug is null or p_exercise_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception using errcode = '22023', message = 'invalid exercise slug';
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  if not (select private.completed_learner_exists()) then
    raise exception using errcode = '42501', message = 'completed onboarding required';
  end if;

  select sets.id, versions.id, sets.domain,
    coalesce(reading.time_limit_seconds, listening.time_limit_seconds)
  into target_set_id, target_version_id, target_domain, target_time_limit
  from public.exercise_sets as sets
  join public.exercise_set_versions as versions on versions.exercise_set_id = sets.id
  left join public.reading_practice_versions as reading on reading.exercise_set_version_id = versions.id
  left join public.listening_practice_versions as listening on listening.exercise_set_version_id = versions.id
  where sets.slug = p_exercise_slug
    and versions.status = 'published'
    and versions.published_at <= now()
    and (select private.exercise_version_is_accessible(versions.id));
  if target_version_id is null then raise exception using errcode = 'P0002', message = 'exercise not found'; end if;

  select attempts.* into result
  from public.learner_attempts as attempts
  where attempts.user_id = actor_id and attempts.start_idempotency_key = p_idempotency_key;
  if found then
    if result.exercise_set_id <> target_set_id then
      raise exception using errcode = '23505', message = 'idempotency key belongs to another exercise';
    end if;
    return result;
  end if;

  insert into public.learner_attempts (
    user_id, exercise_set_id, exercise_set_version_id, start_idempotency_key,
    started_at, time_limit_seconds, reading_time_limit_seconds, expires_at
  ) values (
    actor_id, target_set_id, target_version_id, p_idempotency_key,
    attempt_started_at, target_time_limit,
    case when target_domain = 'reading' then target_time_limit else null end,
    case when target_time_limit is null then null else attempt_started_at + make_interval(secs => target_time_limit) end
  )
  on conflict (user_id, exercise_set_id) where status = 'in_progress'
  do update set last_saved_at = now(), updated_at = now()
  returning * into result;
  return result;
end;
$$;

create function public.get_listening_attempt_clock(p_attempt_id uuid)
returns table (
  attempt_id uuid,
  started_at timestamptz,
  expires_at timestamptz,
  server_now timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select attempts.id, attempts.started_at, attempts.expires_at, now()
  from public.learner_attempts as attempts
  join public.exercise_sets as sets on sets.id = attempts.exercise_set_id
  where attempts.id = p_attempt_id
    and attempts.user_id = (select auth.uid())
    and sets.domain = 'listening';
$$;

create function public.get_listening_attempt_result(p_attempt_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_attempt public.learner_attempts;
  base_result jsonb;
  transcript text;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  select attempts.* into target_attempt
  from public.learner_attempts as attempts
  join public.exercise_sets as sets on sets.id = attempts.exercise_set_id
  where attempts.id = p_attempt_id and attempts.user_id = actor_id and sets.domain = 'listening';
  if not found then raise exception using errcode = 'P0002', message = 'listening attempt not found'; end if;
  base_result := public.get_exercise_attempt_result(p_attempt_id);
  select transcripts.transcript_markdown into transcript
  from public.listening_practice_versions as practice
  join private.listening_transcripts as transcripts on transcripts.audio_asset_id = practice.audio_asset_id
  where practice.exercise_set_version_id = target_attempt.exercise_set_version_id;
  return base_result || jsonb_build_object('transcriptMarkdown', transcript);
end;
$$;

revoke all on function public.start_exercise_attempt(text, text)
from public, anon, authenticated;
revoke all on function public.get_listening_attempt_clock(uuid)
from public, anon, authenticated;
revoke all on function public.get_listening_attempt_result(uuid)
from public, anon, authenticated;

grant execute on function public.start_exercise_attempt(text, text) to authenticated;
grant execute on function public.get_listening_attempt_clock(uuid) to authenticated;
grant execute on function public.get_listening_attempt_result(uuid) to authenticated;

comment on table public.listening_audio_assets is
  'Controlled Listening audio snapshots with path, duration, checksum, source and licence provenance.';
comment on table public.listening_practice_versions is
  'Pins one exercise version to one controlled audio snapshot, learner test type and database-owned time limit.';
comment on table public.listening_parts is
  'Ordered Listening parts with immutable audio ranges and learner-visible instructions.';
comment on table private.listening_transcripts is
  'Private transcripts released only by the post-submit owner-scoped result RPC.';
comment on column public.learner_attempts.time_limit_seconds is
  'Generic server-derived attempt limit. Client timer values are never accepted as authority.';
comment on function public.get_listening_attempt_clock(uuid) is
  'Returns an owner-scoped database clock snapshot for a non-authoritative Listening countdown.';
comment on function public.get_listening_attempt_result(uuid) is
  'Returns Listening review data and transcript only after the owner has submitted the attempt.';

commit;

begin;

insert into public.listening_audio_assets (
  id, slug, asset_path, mime_type, duration_seconds, sha256,
  source_name, source_url, licence
)
select
  '77000000-0000-4000-8000-000000000001'::uuid,
  'community-library-visit',
  '/audio/listening/community-library-visit.wav',
  'audio/wav',
  108,
  'c1ddac5f8cf92cb9e869f6ae4a93fcf04a08cce5d3df0a61b9caf0269097d0a5',
  'IELTS Self-study project editorial team',
  null,
  'Original project-authored script and project-generated speech audio'
where not exists (
  select 1 from public.listening_audio_assets
  where id = '77000000-0000-4000-8000-000000000001'::uuid
);

insert into private.listening_transcripts (audio_asset_id, transcript_markdown)
select
  '77000000-0000-4000-8000-000000000001'::uuid,
  E'**Part 1**\n\nLibrarian: Good morning, Northfield Community Library. How can I help?\n\nStudent: Hello. I have just moved nearby and I would like to join the library.\n\nLibrarian: Of course. Please bring a photo identity card and something that shows your current address. Registration is free.\n\nStudent: Great. When can I come in?\n\nLibrarian: We open at nine thirty from Monday to Saturday. On Thursday we stay open until eight in the evening. Other days we close at six.\n\nStudent: Is there a quiet place where I can study with my laptop?\n\nLibrarian: Yes. The study room is on the second floor. You can book a desk for two hours, and power sockets are available beside every desk.\n\n**Part 2**\n\nSpeaker: Here are three notices for visitors this Saturday. First, the local history talk has moved from Room Two to the main hall because more people have registered. It begins at eleven fifteen. Second, the children''s craft session is full, but families may join a waiting list at the information desk. Finally, the cafe will close at three o''clock for maintenance. Drinks may still be bought from the machine near the front entrance. Please keep all drinks away from the computer area. Thank you.'
where not exists (
  select 1 from private.listening_transcripts
  where audio_asset_id = '77000000-0000-4000-8000-000000000001'::uuid
);

insert into public.exercise_sets (id, slug, domain, display_order)
select
  '77000000-0000-4000-8000-000000000100'::uuid,
  'academic-listening-community-library',
  'listening',
  40
where not exists (
  select 1 from public.exercise_sets
  where id = '77000000-0000-4000-8000-000000000100'::uuid
);

insert into public.exercise_set_versions (
  id, exercise_set_id, version, title, summary, instructions_markdown,
  difficulty, status, allow_review
)
select
  '77000000-0000-4000-8000-000000000101'::uuid,
  '77000000-0000-4000-8000-000000000100'::uuid,
  1,
  'Community library visit',
  'Listen to an original library conversation and announcement, then answer 8 questions.',
  'Use the audio controls as needed. Your answers are saved automatically. The countdown is derived from the database; late submission remains available and is recorded in your result.',
  'beginner',
  'draft',
  true
where not exists (
  select 1 from public.exercise_set_versions
  where id = '77000000-0000-4000-8000-000000000101'::uuid
);

insert into public.listening_practice_versions (
  exercise_set_version_id, audio_asset_id, test_type, time_limit_seconds
)
select
  '77000000-0000-4000-8000-000000000101'::uuid,
  '77000000-0000-4000-8000-000000000001'::uuid,
  'academic',
  600
where not exists (
  select 1 from public.listening_practice_versions
  where exercise_set_version_id = '77000000-0000-4000-8000-000000000101'::uuid
);

insert into public.listening_parts (
  id, exercise_set_version_id, position, title, instructions_markdown,
  audio_start_seconds, audio_end_seconds
)
select seed.id::uuid, '77000000-0000-4000-8000-000000000101'::uuid,
  seed.position, seed.title, seed.instructions, seed.start_second, seed.end_second
from (values
  (
    '77000000-0000-4000-8000-000000000110', 1, 'Part 1: Joining the library',
    'Questions 1–4 refer to the telephone conversation. Choose or type the requested details.',
    0, 64
  ),
  (
    '77000000-0000-4000-8000-000000000111', 2, 'Part 2: Saturday notices',
    'Questions 5–8 refer to the library announcement. Choose or type the requested details.',
    64, 108
  )
) as seed(id, position, title, instructions, start_second, end_second)
where not exists (
  select 1 from public.listening_parts as existing where existing.id = seed.id::uuid
);

insert into public.exercise_questions (
  id, exercise_set_version_id, position, question_type, prompt_markdown,
  points, listening_part_id
)
select seed.id::uuid, '77000000-0000-4000-8000-000000000101'::uuid,
  seed.position, seed.question_type, seed.prompt, 1, seed.part_id::uuid
from (values
  ('77000000-0000-4000-8000-000000000201', 1, 'single_choice', 'What time does the library open from Monday to Saturday?', '77000000-0000-4000-8000-000000000110'),
  ('77000000-0000-4000-8000-000000000202', 2, 'multiple_choice', 'Which **two** items must a new member bring?', '77000000-0000-4000-8000-000000000110'),
  ('77000000-0000-4000-8000-000000000203', 3, 'short_text', 'The study room is on the ________.', '77000000-0000-4000-8000-000000000110'),
  ('77000000-0000-4000-8000-000000000204', 4, 'single_choice', 'For how long can a student book a desk?', '77000000-0000-4000-8000-000000000110'),
  ('77000000-0000-4000-8000-000000000205', 5, 'single_choice', 'Where will the local history talk take place?', '77000000-0000-4000-8000-000000000111'),
  ('77000000-0000-4000-8000-000000000206', 6, 'short_text', 'The local history talk begins at ________.', '77000000-0000-4000-8000-000000000111'),
  ('77000000-0000-4000-8000-000000000207', 7, 'multiple_choice', 'Which **two** Saturday notices are correct?', '77000000-0000-4000-8000-000000000111'),
  ('77000000-0000-4000-8000-000000000208', 8, 'short_text', 'The drinks machine is near the ________.', '77000000-0000-4000-8000-000000000111')
) as seed(id, position, question_type, prompt, part_id)
where not exists (
  select 1 from public.exercise_questions as existing where existing.id = seed.id::uuid
);

insert into public.exercise_options (id, question_id, position, label)
select seed.id::uuid, seed.question_id::uuid, seed.position, seed.label
from (values
  ('77000000-0000-4000-8000-000000000301', '77000000-0000-4000-8000-000000000201', 1, '9:00'),
  ('77000000-0000-4000-8000-000000000302', '77000000-0000-4000-8000-000000000201', 2, '9:30'),
  ('77000000-0000-4000-8000-000000000303', '77000000-0000-4000-8000-000000000201', 3, '10:00'),
  ('77000000-0000-4000-8000-000000000304', '77000000-0000-4000-8000-000000000202', 1, 'A photo identity card'),
  ('77000000-0000-4000-8000-000000000305', '77000000-0000-4000-8000-000000000202', 2, 'Proof of the current address'),
  ('77000000-0000-4000-8000-000000000306', '77000000-0000-4000-8000-000000000202', 3, 'A registration payment'),
  ('77000000-0000-4000-8000-000000000307', '77000000-0000-4000-8000-000000000202', 4, 'A passport photograph'),
  ('77000000-0000-4000-8000-000000000308', '77000000-0000-4000-8000-000000000204', 1, '1 hour'),
  ('77000000-0000-4000-8000-000000000309', '77000000-0000-4000-8000-000000000204', 2, '2 hours'),
  ('77000000-0000-4000-8000-000000000310', '77000000-0000-4000-8000-000000000204', 3, 'All day'),
  ('77000000-0000-4000-8000-000000000311', '77000000-0000-4000-8000-000000000205', 1, 'Room Two'),
  ('77000000-0000-4000-8000-000000000312', '77000000-0000-4000-8000-000000000205', 2, 'The main hall'),
  ('77000000-0000-4000-8000-000000000313', '77000000-0000-4000-8000-000000000205', 3, 'The information desk'),
  ('77000000-0000-4000-8000-000000000314', '77000000-0000-4000-8000-000000000207', 1, 'The craft session still has places available.'),
  ('77000000-0000-4000-8000-000000000315', '77000000-0000-4000-8000-000000000207', 2, 'Families can join a waiting list for the craft session.'),
  ('77000000-0000-4000-8000-000000000316', '77000000-0000-4000-8000-000000000207', 3, 'The cafe closes at 3:00 for maintenance.'),
  ('77000000-0000-4000-8000-000000000317', '77000000-0000-4000-8000-000000000207', 4, 'Drinks are allowed in the computer area.')
) as seed(id, question_id, position, label)
where not exists (
  select 1 from public.exercise_options as existing where existing.id = seed.id::uuid
);

insert into private.exercise_answer_keys (question_id, case_sensitive, explanation_markdown)
select seed.question_id::uuid, false, seed.explanation
from (values
  ('77000000-0000-4000-8000-000000000201', 'The librarian says the library opens at nine thirty.'),
  ('77000000-0000-4000-8000-000000000202', 'A photo identity card and proof of the current address are required; registration is free.'),
  ('77000000-0000-4000-8000-000000000203', 'The librarian places the study room on the second floor.'),
  ('77000000-0000-4000-8000-000000000204', 'A desk can be booked for two hours.'),
  ('77000000-0000-4000-8000-000000000205', 'The announcement moves the talk from Room Two to the main hall.'),
  ('77000000-0000-4000-8000-000000000206', 'The announced start time is eleven fifteen.'),
  ('77000000-0000-4000-8000-000000000207', 'The craft waiting list is available and the cafe closes at three for maintenance.'),
  ('77000000-0000-4000-8000-000000000208', 'The drinks machine is near the front entrance.')
) as seed(question_id, explanation)
where not exists (
  select 1 from private.exercise_answer_keys as existing
  where existing.question_id = seed.question_id::uuid
);

insert into private.exercise_correct_options (question_id, option_id)
select seed.question_id::uuid, seed.option_id::uuid
from (values
  ('77000000-0000-4000-8000-000000000201', '77000000-0000-4000-8000-000000000302'),
  ('77000000-0000-4000-8000-000000000202', '77000000-0000-4000-8000-000000000304'),
  ('77000000-0000-4000-8000-000000000202', '77000000-0000-4000-8000-000000000305'),
  ('77000000-0000-4000-8000-000000000204', '77000000-0000-4000-8000-000000000309'),
  ('77000000-0000-4000-8000-000000000205', '77000000-0000-4000-8000-000000000312'),
  ('77000000-0000-4000-8000-000000000207', '77000000-0000-4000-8000-000000000315'),
  ('77000000-0000-4000-8000-000000000207', '77000000-0000-4000-8000-000000000316')
) as seed(question_id, option_id)
where not exists (
  select 1 from private.exercise_correct_options as existing
  where existing.question_id = seed.question_id::uuid
    and existing.option_id = seed.option_id::uuid
);

insert into private.exercise_correct_text_answers (question_id, answer_text, normalized_answer)
select seed.question_id::uuid, seed.answer_text, lower(seed.answer_text)
from (values
  ('77000000-0000-4000-8000-000000000203', 'second floor'),
  ('77000000-0000-4000-8000-000000000206', '11:15'),
  ('77000000-0000-4000-8000-000000000206', 'eleven fifteen'),
  ('77000000-0000-4000-8000-000000000208', 'front entrance')
) as seed(question_id, answer_text)
where not exists (
  select 1 from private.exercise_correct_text_answers as existing
  where existing.question_id = seed.question_id::uuid
    and existing.normalized_answer = lower(seed.answer_text)
);

update public.exercise_set_versions
set status = 'published', published_at = '2026-07-16T00:00:00Z'::timestamptz
where id = '77000000-0000-4000-8000-000000000101'::uuid
  and status = 'draft';

insert into public.listening_audio_assets (
  id, slug, asset_path, mime_type, duration_seconds, sha256,
  source_name, source_url, licence
)
select
  '77000000-0000-4000-8000-000000000901'::uuid,
  'draft-campus-tour',
  '/audio/listening/draft-campus-tour.wav',
  'audio/wav',
  60,
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'IELTS Self-study project editorial team',
  null,
  'Unpublished original fixture; no public binary is shipped'
where not exists (
  select 1 from public.listening_audio_assets
  where id = '77000000-0000-4000-8000-000000000901'::uuid
);

insert into private.listening_transcripts (audio_asset_id, transcript_markdown)
select '77000000-0000-4000-8000-000000000901'::uuid,
  'Draft transcript fixture. Learners must never receive this content.'
where not exists (
  select 1 from private.listening_transcripts
  where audio_asset_id = '77000000-0000-4000-8000-000000000901'::uuid
);

insert into public.exercise_sets (id, slug, domain, display_order)
select
  '77000000-0000-4000-8000-000000000902'::uuid,
  'draft-academic-listening-campus-tour',
  'listening',
  99
where not exists (
  select 1 from public.exercise_sets
  where id = '77000000-0000-4000-8000-000000000902'::uuid
);

insert into public.exercise_set_versions (
  id, exercise_set_id, version, title, summary, instructions_markdown,
  difficulty, status, allow_review
)
select
  '77000000-0000-4000-8000-000000000903'::uuid,
  '77000000-0000-4000-8000-000000000902'::uuid,
  1,
  'Draft campus tour fixture',
  'Unpublished Listening fixture for actor-real RLS verification.',
  'This draft must never be visible to learners.',
  'beginner',
  'draft',
  true
where not exists (
  select 1 from public.exercise_set_versions
  where id = '77000000-0000-4000-8000-000000000903'::uuid
);

insert into public.listening_practice_versions (
  exercise_set_version_id, audio_asset_id, test_type, time_limit_seconds
)
select
  '77000000-0000-4000-8000-000000000903'::uuid,
  '77000000-0000-4000-8000-000000000901'::uuid,
  'academic',
  300
where not exists (
  select 1 from public.listening_practice_versions
  where exercise_set_version_id = '77000000-0000-4000-8000-000000000903'::uuid
);

commit;

create table public.writing_tasks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint writing_tasks_slug_check check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 120
  ),
  constraint writing_tasks_display_order_check check (display_order between 1 and 10000)
);

create table public.writing_task_versions (
  id uuid primary key default gen_random_uuid(),
  writing_task_id uuid not null references public.writing_tasks (id) on delete restrict,
  version smallint not null,
  task_type text not null,
  test_type text not null,
  title text not null,
  description text not null,
  prompt_text text not null,
  instructions text not null,
  difficulty text not null,
  word_target integer not null,
  minimum_words integer not null,
  maximum_words integer not null,
  time_limit_seconds integer not null,
  status text not null default 'draft',
  source_name text not null,
  licence text not null,
  content_checksum text not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint writing_task_versions_task_version_unique unique (writing_task_id, version),
  constraint writing_task_versions_task_id_id_unique unique (writing_task_id, id),
  constraint writing_task_versions_version_check check (version between 1 and 32767),
  constraint writing_task_versions_task_type_check check (task_type in ('task_1', 'task_2')),
  constraint writing_task_versions_test_type_check check (
    test_type in ('academic', 'general_training', 'both')
  ),
  constraint writing_task_versions_title_check check (
    btrim(title) <> '' and char_length(title) <= 180
  ),
  constraint writing_task_versions_description_check check (
    btrim(description) <> '' and char_length(description) <= 1000
  ),
  constraint writing_task_versions_prompt_check check (
    btrim(prompt_text) <> '' and char_length(prompt_text) <= 8000
  ),
  constraint writing_task_versions_instructions_check check (
    btrim(instructions) <> '' and char_length(instructions) <= 4000
  ),
  constraint writing_task_versions_difficulty_check check (
    difficulty in ('beginner', 'intermediate', 'advanced')
  ),
  constraint writing_task_versions_words_check check (
    minimum_words between 1 and 2000
    and word_target between minimum_words and 2000
    and maximum_words between word_target and 2000
  ),
  constraint writing_task_versions_time_limit_check check (
    time_limit_seconds between 300 and 10800
  ),
  constraint writing_task_versions_status_check check (
    status in ('draft', 'published', 'archived')
  ),
  constraint writing_task_versions_publication_check check (
    (status = 'draft' and published_at is null)
    or (status in ('published', 'archived') and published_at is not null)
  ),
  constraint writing_task_versions_source_check check (
    btrim(source_name) <> '' and char_length(source_name) <= 200
  ),
  constraint writing_task_versions_licence_check check (
    btrim(licence) <> '' and char_length(licence) <= 200
  ),
  constraint writing_task_versions_checksum_check check (
    content_checksum ~ '^[0-9a-f]{64}$'
  )
);

create unique index writing_task_versions_one_published_idx
on public.writing_task_versions (writing_task_id)
where status = 'published';

create index writing_task_versions_catalog_idx
on public.writing_task_versions (status, test_type, writing_task_id, version desc);

create table public.writing_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  writing_task_id uuid not null references public.writing_tasks (id) on delete restrict,
  writing_task_version_id uuid not null,
  status text not null default 'draft',
  draft_text text not null default '',
  submitted_text text,
  server_revision integer not null default 0,
  word_count integer not null default 0,
  minimum_words_met boolean not null default false,
  start_idempotency_key text not null,
  submit_idempotency_key text,
  content_checksum text,
  started_at timestamptz not null default now(),
  last_saved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  submitted_after_time_limit boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint writing_submissions_task_version_fkey foreign key (
    writing_task_id,
    writing_task_version_id
  ) references public.writing_task_versions (writing_task_id, id) on delete restrict,
  constraint writing_submissions_id_task_version_unique unique (
    id,
    writing_task_version_id
  ),
  constraint writing_submissions_id_user_unique unique (id, user_id),
  constraint writing_submissions_status_check check (status in ('draft', 'submitted')),
  constraint writing_submissions_revision_check check (
    server_revision between 0 and 2147483647
  ),
  constraint writing_submissions_word_count_check check (word_count between 0 and 2000),
  constraint writing_submissions_text_size_check check (
    char_length(draft_text) <= 20000
    and (submitted_text is null or char_length(submitted_text) <= 20000)
  ),
  constraint writing_submissions_start_key_check check (
    btrim(start_idempotency_key) <> '' and char_length(start_idempotency_key) <= 200
  ),
  constraint writing_submissions_submit_key_check check (
    submit_idempotency_key is null
    or (btrim(submit_idempotency_key) <> '' and char_length(submit_idempotency_key) <= 200)
  ),
  constraint writing_submissions_checksum_check check (
    content_checksum is null or content_checksum ~ '^[0-9a-f]{64}$'
  ),
  constraint writing_submissions_time_check check (
    expires_at > started_at and last_saved_at >= started_at
  ),
  constraint writing_submissions_state_check check (
    (
      status = 'draft'
      and submitted_text is null
      and submit_idempotency_key is null
      and content_checksum is null
      and submitted_at is null
      and submitted_after_time_limit is null
    )
    or (
      status = 'submitted'
      and submitted_text is not null
      and btrim(submitted_text) <> ''
      and submitted_text = draft_text
      and submit_idempotency_key is not null
      and content_checksum is not null
      and submitted_at is not null
      and submitted_after_time_limit is not null
      and word_count > 0
    )
  ),
  constraint writing_submissions_user_start_key_unique unique (user_id, start_idempotency_key),
  constraint writing_submissions_user_submit_key_unique unique (user_id, submit_idempotency_key)
);

create unique index writing_submissions_one_active_task_idx
on public.writing_submissions (user_id, writing_task_id)
where status = 'draft';

create index writing_submissions_user_status_recent_idx
on public.writing_submissions (user_id, status, coalesce(submitted_at, last_saved_at) desc);

create index writing_submissions_task_version_idx
on public.writing_submissions (writing_task_version_id);

create table public.writing_feedback_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  submission_id uuid not null,
  status text not null default 'pending',
  request_idempotency_key text not null,
  request_hash text not null,
  provider text,
  model_label text,
  prompt_version text not null default 'writing-task-2-v1',
  rubric_version text not null default 'ielts-writing-task-2-v1',
  output_schema_version text not null default 'writing-feedback-v1',
  input_checksum text not null,
  consent_version text not null,
  attempt_number smallint not null,
  finalize_nonce uuid not null default gen_random_uuid(),
  requested_at timestamptz not null default now(),
  provider_started_at timestamptz,
  lease_expires_at timestamptz not null,
  completed_at timestamptz,
  error_code text,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint writing_feedback_runs_submission_owner_fkey foreign key (
    submission_id,
    user_id
  ) references public.writing_submissions (id, user_id) on delete restrict,
  constraint writing_feedback_runs_id_submission_user_unique unique (
    id,
    submission_id,
    user_id
  ),
  constraint writing_feedback_runs_status_check check (status in ('pending', 'ready', 'failed')),
  constraint writing_feedback_runs_request_key_check check (
    btrim(request_idempotency_key) <> '' and char_length(request_idempotency_key) <= 200
  ),
  constraint writing_feedback_runs_hash_check check (
    request_hash ~ '^[0-9a-f]{64}$' and input_checksum ~ '^[0-9a-f]{64}$'
  ),
  constraint writing_feedback_runs_version_check check (
    btrim(prompt_version) <> '' and char_length(prompt_version) <= 100
    and btrim(rubric_version) <> '' and char_length(rubric_version) <= 100
    and btrim(output_schema_version) <> '' and char_length(output_schema_version) <= 100
  ),
  constraint writing_feedback_runs_consent_check check (
    consent_version = 'writing-ai-v1'
  ),
  constraint writing_feedback_runs_attempt_check check (attempt_number between 1 and 2),
  constraint writing_feedback_runs_state_check check (
    (
      status = 'pending'
      and completed_at is null
      and error_code is null
    )
    or (
      status = 'ready'
      and provider = 'openai'
      and model_label is not null
      and completed_at is not null
      and error_code is null
    )
    or (
      status = 'failed'
      and completed_at is not null
      and error_code is not null
    )
  ),
  constraint writing_feedback_runs_usage_check check (
    (input_tokens is null or input_tokens >= 0)
    and (output_tokens is null or output_tokens >= 0)
    and (latency_ms is null or latency_ms >= 0)
  ),
  constraint writing_feedback_runs_lease_check check (lease_expires_at > requested_at),
  constraint writing_feedback_runs_user_request_unique unique (user_id, request_idempotency_key)
);

create unique index writing_feedback_runs_one_pending_idx
on public.writing_feedback_runs (submission_id)
where status = 'pending';

create unique index writing_feedback_runs_one_ready_idx
on public.writing_feedback_runs (submission_id)
where status = 'ready';

create index writing_feedback_runs_user_recent_idx
on public.writing_feedback_runs (user_id, requested_at desc);

create index writing_feedback_runs_status_lease_idx
on public.writing_feedback_runs (status, lease_expires_at)
where status = 'pending';

create table public.writing_feedback (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique,
  submission_id uuid not null,
  user_id uuid not null,
  overall_band_estimate numeric(2, 1) not null,
  task_response_band numeric(2, 1) not null,
  coherence_cohesion_band numeric(2, 1) not null,
  lexical_resource_band numeric(2, 1) not null,
  grammatical_range_accuracy_band numeric(2, 1) not null,
  confidence text not null,
  summary text not null,
  criteria jsonb not null,
  strengths jsonb not null,
  priority_issues jsonb not null,
  revision_plan jsonb not null,
  corrected_examples jsonb not null,
  created_at timestamptz not null default now(),
  constraint writing_feedback_run_scope_fkey foreign key (
    run_id,
    submission_id,
    user_id
  ) references public.writing_feedback_runs (id, submission_id, user_id) on delete restrict,
  constraint writing_feedback_band_check check (
    overall_band_estimate between 0 and 9 and mod(overall_band_estimate * 2, 1) = 0
    and task_response_band between 0 and 9 and mod(task_response_band * 2, 1) = 0
    and coherence_cohesion_band between 0 and 9 and mod(coherence_cohesion_band * 2, 1) = 0
    and lexical_resource_band between 0 and 9 and mod(lexical_resource_band * 2, 1) = 0
    and grammatical_range_accuracy_band between 0 and 9
    and mod(grammatical_range_accuracy_band * 2, 1) = 0
  ),
  constraint writing_feedback_confidence_check check (confidence in ('low', 'medium', 'high')),
  constraint writing_feedback_summary_check check (
    btrim(summary) <> '' and char_length(summary) <= 2000
  ),
  constraint writing_feedback_json_types_check check (
    jsonb_typeof(criteria) = 'object'
    and jsonb_typeof(strengths) = 'array'
    and jsonb_typeof(priority_issues) = 'array'
    and jsonb_typeof(revision_plan) = 'array'
    and jsonb_typeof(corrected_examples) = 'array'
  ),
  constraint writing_feedback_collection_sizes_check check (
    jsonb_array_length(strengths) between 1 and 5
    and jsonb_array_length(priority_issues) between 3 and 5
    and jsonb_array_length(revision_plan) between 3 and 5
    and jsonb_array_length(corrected_examples) between 0 and 5
  )
);

create index writing_feedback_submission_idx
on public.writing_feedback (submission_id);

create index writing_feedback_user_recent_idx
on public.writing_feedback (user_id, created_at desc);

create trigger writing_tasks_set_updated_at before update on public.writing_tasks
for each row execute function public.set_profile_updated_at();
create trigger writing_task_versions_set_updated_at before update on public.writing_task_versions
for each row execute function public.set_profile_updated_at();
create trigger writing_submissions_set_updated_at before update on public.writing_submissions
for each row execute function public.set_profile_updated_at();
create trigger writing_feedback_runs_set_updated_at before update on public.writing_feedback_runs
for each row execute function public.set_profile_updated_at();

create function private.count_writing_words(input_text text)
returns integer
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when btrim(input_text) = '' then 0
    else cardinality(regexp_split_to_array(btrim(input_text), '\s+'))
  end;
$$;

create function public.protect_writing_task_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.status in ('published', 'archived') then
    raise exception using errcode = '55000', message = 'published writing content is immutable';
  end if;
  if tg_op = 'UPDATE' and old.status in ('published', 'archived') then
    if old.writing_task_id is distinct from new.writing_task_id
      or old.version is distinct from new.version
      or old.task_type is distinct from new.task_type
      or old.test_type is distinct from new.test_type
      or old.title is distinct from new.title
      or old.description is distinct from new.description
      or old.prompt_text is distinct from new.prompt_text
      or old.instructions is distinct from new.instructions
      or old.difficulty is distinct from new.difficulty
      or old.word_target is distinct from new.word_target
      or old.minimum_words is distinct from new.minimum_words
      or old.maximum_words is distinct from new.maximum_words
      or old.time_limit_seconds is distinct from new.time_limit_seconds
      or old.source_name is distinct from new.source_name
      or old.licence is distinct from new.licence
      or old.content_checksum is distinct from new.content_checksum
      or old.published_at is distinct from new.published_at
      or old.status = 'archived'
      or new.status not in ('published', 'archived') then
      raise exception using errcode = '55000', message = 'published writing content is immutable';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger protect_writing_task_version
before update or delete on public.writing_task_versions
for each row execute function public.protect_writing_task_version();

create function public.protect_writing_submission()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'submitted' then
    raise exception using errcode = '55000', message = 'submitted writing is immutable';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  if old.user_id is distinct from new.user_id
    or old.writing_task_id is distinct from new.writing_task_id
    or old.writing_task_version_id is distinct from new.writing_task_version_id
    or old.started_at is distinct from new.started_at
    or old.expires_at is distinct from new.expires_at
    or old.start_idempotency_key is distinct from new.start_idempotency_key then
    raise exception using errcode = '55000', message = 'writing submission identity is immutable';
  end if;
  return new;
end;
$$;

create trigger protect_writing_submission
before update or delete on public.writing_submissions
for each row execute function public.protect_writing_submission();

create function public.protect_writing_feedback()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '55000', message = 'writing feedback is immutable';
end;
$$;

create trigger protect_writing_feedback
before update or delete on public.writing_feedback
for each row execute function public.protect_writing_feedback();

create function private.writing_task_version_is_accessible(target_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.writing_task_versions as versions
    join public.learner_profiles as learners
      on learners.user_id = (select auth.uid())
    where versions.id = target_version_id
      and versions.status = 'published'
      and versions.published_at <= now()
      and learners.onboarding_completed_at is not null
      and (versions.test_type = 'both' or versions.test_type = learners.test_type)
  );
$$;

create function private.writing_task_is_accessible(target_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.writing_task_versions as versions
    where versions.writing_task_id = target_task_id
      and (select private.writing_task_version_is_accessible(versions.id))
  );
$$;

alter table public.writing_tasks enable row level security;
alter table public.writing_task_versions enable row level security;
alter table public.writing_submissions enable row level security;
alter table public.writing_feedback_runs enable row level security;
alter table public.writing_feedback enable row level security;

revoke all on table public.writing_tasks from anon, authenticated;
revoke all on table public.writing_task_versions from anon, authenticated;
revoke all on table public.writing_submissions from anon, authenticated;
revoke all on table public.writing_feedback_runs from anon, authenticated;
revoke all on table public.writing_feedback from anon, authenticated;

grant select on table public.writing_tasks to authenticated;
grant select on table public.writing_task_versions to authenticated;
grant select on table public.writing_submissions to authenticated;
grant select on table public.writing_feedback_runs to authenticated;
grant select on table public.writing_feedback to authenticated;

create policy "Learners can read accessible writing tasks"
on public.writing_tasks for select to authenticated
using ((select private.writing_task_is_accessible(id)));

create policy "Learners can read accessible or pinned writing versions"
on public.writing_task_versions for select to authenticated
using (
  (select private.writing_task_version_is_accessible(id))
  or exists (
    select 1 from public.writing_submissions as submissions
    where submissions.writing_task_version_id = writing_task_versions.id
      and submissions.user_id = (select auth.uid())
  )
);

create policy "Learners can read their own writing submissions"
on public.writing_submissions for select to authenticated
using (user_id = (select auth.uid()));

create policy "Learners can read their own writing feedback runs"
on public.writing_feedback_runs for select to authenticated
using (user_id = (select auth.uid()));

create policy "Learners can read their own validated writing feedback"
on public.writing_feedback for select to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.writing_feedback_runs as runs
    where runs.id = writing_feedback.run_id
      and runs.status = 'ready'
      and runs.user_id = (select auth.uid())
  )
);

create function public.start_writing_submission(
  p_task_slug text,
  p_idempotency_key text
)
returns public.writing_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_task_id uuid;
  target_version public.writing_task_versions;
  result public.writing_submissions;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_task_slug is null or p_task_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception using errcode = '22023', message = 'invalid writing task slug';
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = ''
    or char_length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  if not (select private.completed_learner_exists()) then
    raise exception using errcode = '42501', message = 'completed onboarding required';
  end if;

  select versions.* into target_version
  from public.writing_tasks as tasks
  join public.writing_task_versions as versions on versions.writing_task_id = tasks.id
  join public.learner_profiles as learners on learners.user_id = actor_id
  where tasks.slug = p_task_slug
    and versions.status = 'published'
    and versions.published_at <= now()
    and (versions.test_type = 'both' or versions.test_type = learners.test_type)
  order by versions.version desc
  limit 1;
  if target_version.id is null then
    raise exception using errcode = 'P0002', message = 'writing task not found';
  end if;
  target_task_id := target_version.writing_task_id;

  select submissions.* into result
  from public.writing_submissions as submissions
  where submissions.user_id = actor_id
    and submissions.start_idempotency_key = p_idempotency_key;
  if found then
    if result.writing_task_id <> target_task_id then
      raise exception using errcode = '23505', message = 'idempotency key belongs to another writing task';
    end if;
    return result;
  end if;

  select submissions.* into result
  from public.writing_submissions as submissions
  where submissions.user_id = actor_id
    and submissions.writing_task_id = target_task_id
    and submissions.status = 'draft';
  if found then return result; end if;

  insert into public.writing_submissions (
    user_id,
    writing_task_id,
    writing_task_version_id,
    start_idempotency_key,
    expires_at
  ) values (
    actor_id,
    target_task_id,
    target_version.id,
    p_idempotency_key,
    now() + make_interval(secs => target_version.time_limit_seconds)
  )
  on conflict (user_id, writing_task_id) where status = 'draft' do nothing
  returning * into result;

  if result.id is null then
    select submissions.* into result
    from public.writing_submissions as submissions
    where submissions.user_id = actor_id
      and submissions.writing_task_id = target_task_id
      and submissions.status = 'draft';
  end if;
  return result;
end;
$$;

create function public.save_writing_draft(
  p_submission_id uuid,
  p_draft_text text,
  p_expected_revision integer
)
returns public.writing_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target public.writing_submissions;
  target_minimum integer;
  calculated_word_count integer;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_submission_id is null or p_expected_revision is null or p_expected_revision < 0 then
    raise exception using errcode = '22023', message = 'invalid draft save input';
  end if;
  if p_draft_text is null or char_length(p_draft_text) > 20000 then
    raise exception using errcode = '22023', message = 'writing draft is too large';
  end if;

  select submissions.* into target
  from public.writing_submissions as submissions
  where submissions.id = p_submission_id and submissions.user_id = actor_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'writing submission not found';
  end if;
  if target.status <> 'draft' then
    raise exception using errcode = '55000', message = 'submitted writing is immutable';
  end if;

  select versions.minimum_words into target_minimum
  from public.writing_task_versions as versions
  where versions.id = target.writing_task_version_id;

  if p_expected_revision <> target.server_revision then
    if p_expected_revision < target.server_revision and p_draft_text = target.draft_text then
      return target;
    end if;
    raise exception using errcode = '40001', message = 'stale or conflicting writing revision';
  end if;
  if p_draft_text = target.draft_text then return target; end if;

  calculated_word_count := private.count_writing_words(p_draft_text);
  update public.writing_submissions set
    draft_text = p_draft_text,
    server_revision = server_revision + 1,
    word_count = calculated_word_count,
    minimum_words_met = calculated_word_count >= target_minimum,
    last_saved_at = now()
  where id = target.id
  returning * into target;
  return target;
end;
$$;

create function public.submit_writing_submission(
  p_submission_id uuid,
  p_idempotency_key text
)
returns public.writing_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target public.writing_submissions;
  target_version public.writing_task_versions;
  calculated_word_count integer;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = ''
    or char_length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;

  select submissions.* into target
  from public.writing_submissions as submissions
  where submissions.id = p_submission_id and submissions.user_id = actor_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'writing submission not found';
  end if;
  if target.status = 'submitted' then return target; end if;

  select versions.* into target_version
  from public.writing_task_versions as versions
  where versions.id = target.writing_task_version_id;
  if target_version.status not in ('published', 'archived') or target_version.published_at is null then
    raise exception using errcode = '55000', message = 'writing task was not published';
  end if;
  if btrim(target.draft_text) = '' then
    raise exception using errcode = '22023', message = 'writing submission cannot be empty';
  end if;

  calculated_word_count := private.count_writing_words(target.draft_text);
  update public.writing_submissions set
    status = 'submitted',
    submitted_text = draft_text,
    word_count = calculated_word_count,
    minimum_words_met = calculated_word_count >= target_version.minimum_words,
    submit_idempotency_key = p_idempotency_key,
    content_checksum = encode(extensions.digest(convert_to(draft_text, 'UTF8'), 'sha256'), 'hex'),
    submitted_at = now(),
    submitted_after_time_limit = now() > expires_at,
    last_saved_at = now()
  where id = target.id
  returning * into target;
  return target;
end;
$$;

create function public.get_writing_submission_clock(p_submission_id uuid)
returns table (
  started_at timestamptz,
  expires_at timestamptz,
  server_now timestamptz,
  submitted_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select submissions.started_at, submissions.expires_at, now(), submissions.submitted_at
  from public.writing_submissions as submissions
  where submissions.id = p_submission_id
    and submissions.user_id = (select auth.uid());
$$;

create function private.writing_signing_secret()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'writing_feedback_signing_secret'
  limit 1;
$$;

create function public.get_writing_ai_configuration_state()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and nullif((select private.writing_signing_secret()), '') is not null;
$$;

create function public.start_writing_feedback_request(
  p_submission_id uuid,
  p_idempotency_key text,
  p_consent_version text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_submission public.writing_submissions;
  target_version public.writing_task_versions;
  target_run public.writing_feedback_runs;
  attempts_used integer;
  weekly_used integer;
  burst_used integer;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if nullif((select private.writing_signing_secret()), '') is null then
    raise exception using errcode = '55000', message = 'writing feedback signing is not configured';
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = ''
    or char_length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  if p_consent_version <> 'writing-ai-v1' then
    raise exception using errcode = '22023', message = 'writing AI consent is required';
  end if;

  select submissions.* into target_submission
  from public.writing_submissions as submissions
  where submissions.id = p_submission_id and submissions.user_id = actor_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'writing submission not found';
  end if;
  if target_submission.status <> 'submitted' then
    raise exception using errcode = '55000', message = 'feedback requires a submitted writing';
  end if;
  if target_submission.word_count < 50 or target_submission.word_count > 1000 then
    raise exception using errcode = '22023', message = 'writing length is outside feedback limits';
  end if;

  update public.writing_feedback_runs as runs set
    status = 'failed',
    error_code = 'provider_timeout',
    completed_at = now()
  where runs.submission_id = target_submission.id
    and runs.user_id = actor_id
    and runs.status = 'pending'
    and runs.lease_expires_at <= now();

  select versions.* into target_version
  from public.writing_task_versions as versions
  where versions.id = target_submission.writing_task_version_id;

  select runs.* into target_run
  from public.writing_feedback_runs as runs
  where runs.user_id = actor_id and runs.request_idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'runId', target_run.id,
      'status', target_run.status,
      'shouldCallProvider', false
    );
  end if;

  select runs.* into target_run
  from public.writing_feedback_runs as runs
  where runs.submission_id = target_submission.id and runs.status in ('pending', 'ready')
  order by runs.requested_at desc
  limit 1;
  if found then
    return jsonb_build_object(
      'runId', target_run.id,
      'status', target_run.status,
      'shouldCallProvider', false
    );
  end if;

  select count(*)::integer into attempts_used
  from public.writing_feedback_runs as runs
  where runs.submission_id = target_submission.id;
  if attempts_used >= 2 then
    raise exception using errcode = '22023', message = 'feedback retry limit reached';
  end if;
  select count(*)::integer into weekly_used
  from public.writing_feedback_runs as runs
  where runs.user_id = actor_id and runs.requested_at >= now() - interval '7 days';
  if weekly_used >= 5 then
    raise exception using errcode = 'P0001', message = 'writing feedback weekly quota reached';
  end if;
  select count(*)::integer into burst_used
  from public.writing_feedback_runs as runs
  where runs.user_id = actor_id and runs.requested_at >= now() - interval '1 minute';
  if burst_used >= 2 then
    raise exception using errcode = 'P0001', message = 'writing feedback rate limit reached';
  end if;

  insert into public.writing_feedback_runs (
    user_id,
    submission_id,
    request_idempotency_key,
    request_hash,
    input_checksum,
    consent_version,
    attempt_number,
    provider_started_at,
    lease_expires_at
  ) values (
    actor_id,
    target_submission.id,
    p_idempotency_key,
    encode(extensions.digest(convert_to(
      target_submission.content_checksum || ':writing-task-2-v1:ielts-writing-task-2-v1',
      'UTF8'
    ), 'sha256'), 'hex'),
    target_submission.content_checksum,
    p_consent_version,
    attempts_used + 1,
    now(),
    now() + interval '30 seconds'
  )
  returning * into target_run;

  return jsonb_build_object(
    'runId', target_run.id,
    'status', target_run.status,
    'shouldCallProvider', true,
    'finalizeNonce', target_run.finalize_nonce,
    'taskType', target_version.task_type,
    'taskTitle', target_version.title,
    'taskPrompt', target_version.prompt_text,
    'instructions', target_version.instructions,
    'minimumWords', target_version.minimum_words,
    'wordTarget', target_version.word_target,
    'essay', target_submission.submitted_text
  );
end;
$$;

create function private.valid_writing_band(value numeric)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value between 0 and 9 and mod(value * 2, 1) = 0;
$$;

create function private.writing_feedback_evidence_is_valid(
  feedback_payload jsonb,
  essay text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    not exists (
      select 1
      from jsonb_each(feedback_payload -> 'criteria') as criterion(key, value)
      cross join lateral jsonb_array_elements_text(criterion.value -> 'evidence') as evidence(value)
      where btrim(evidence.value) = '' or position(evidence.value in essay) = 0
    )
    and not exists (
      select 1
      from jsonb_array_elements(feedback_payload -> 'priorityIssues') as issue(value)
      where btrim(issue.value ->> 'evidence') = ''
        or strpos(essay, issue.value ->> 'evidence') = 0
    )
    and not exists (
      select 1
      from jsonb_array_elements(feedback_payload -> 'correctedExamples') as example(value)
      where btrim(example.value ->> 'source') = ''
        or strpos(essay, example.value ->> 'source') = 0
    );
$$;

create function public.finalize_writing_feedback(
  p_run_id uuid,
  p_feedback_payload text,
  p_expires_at timestamptz,
  p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_run public.writing_feedback_runs;
  target_submission public.writing_submissions;
  payload jsonb;
  signing_secret text;
  signature_message text;
  expected_signature text;
  overall_band numeric;
  task_band numeric;
  coherence_band numeric;
  lexical_band numeric;
  grammar_band numeric;
  result_id uuid;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  select runs.* into target_run
  from public.writing_feedback_runs as runs
  where runs.id = p_run_id and runs.user_id = actor_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'writing feedback run not found';
  end if;
  if target_run.status = 'ready' then
    return jsonb_build_object('runId', target_run.id, 'status', 'ready');
  end if;
  if target_run.status <> 'pending' then
    raise exception using errcode = '55000', message = 'writing feedback run cannot be finalized';
  end if;
  if p_expires_at < now() or p_expires_at > now() + interval '5 minutes' then
    raise exception using errcode = '42501', message = 'writing feedback signature expired';
  end if;
  if p_feedback_payload is null or char_length(p_feedback_payload) > 30000 then
    raise exception using errcode = '22023', message = 'invalid writing feedback payload';
  end if;

  signing_secret := private.writing_signing_secret();
  if nullif(signing_secret, '') is null then
    raise exception using errcode = '55000', message = 'writing feedback signing is not configured';
  end if;
  signature_message := 'writing-feedback-v1:' || target_run.id::text || ':'
    || target_run.finalize_nonce::text || ':'
    || extract(epoch from p_expires_at)::bigint::text || ':' || p_feedback_payload;
  expected_signature := encode(
    extensions.hmac(convert_to(signature_message, 'UTF8'), convert_to(signing_secret, 'UTF8'), 'sha256'),
    'hex'
  );
  if p_signature is null or p_signature !~ '^[0-9a-f]{64}$'
    or expected_signature is distinct from p_signature then
    raise exception using errcode = '42501', message = 'invalid writing feedback signature';
  end if;

  begin
    payload := p_feedback_payload::jsonb;
    overall_band := (payload ->> 'overallBandEstimate')::numeric;
    task_band := (payload #>> '{criteria,taskResponse,band}')::numeric;
    coherence_band := (payload #>> '{criteria,coherenceCohesion,band}')::numeric;
    lexical_band := (payload #>> '{criteria,lexicalResource,band}')::numeric;
    grammar_band := (payload #>> '{criteria,grammaticalRangeAccuracy,band}')::numeric;
  exception when others then
    raise exception using errcode = '22023', message = 'invalid writing feedback schema';
  end;

  if jsonb_typeof(payload -> 'criteria') is distinct from 'object'
    or jsonb_typeof(payload -> 'strengths') is distinct from 'array'
    or jsonb_typeof(payload -> 'priorityIssues') is distinct from 'array'
    or jsonb_typeof(payload -> 'revisionPlan') is distinct from 'array'
    or jsonb_typeof(payload -> 'correctedExamples') is distinct from 'array'
    or jsonb_typeof(payload -> 'meta') is distinct from 'object' then
    raise exception using errcode = '22023', message = 'invalid writing feedback schema';
  end if;

  if not private.valid_writing_band(overall_band)
    or not private.valid_writing_band(task_band)
    or not private.valid_writing_band(coherence_band)
    or not private.valid_writing_band(lexical_band)
    or not private.valid_writing_band(grammar_band)
    or payload ->> 'confidence' not in ('low', 'medium', 'high')
    or (select count(*) from jsonb_object_keys(payload -> 'criteria')) <> 4
    or jsonb_array_length(payload -> 'strengths') not between 1 and 5
    or jsonb_array_length(payload -> 'priorityIssues') not between 3 and 5
    or jsonb_array_length(payload -> 'revisionPlan') not between 3 and 5
    or jsonb_array_length(payload -> 'correctedExamples') not between 0 and 5
    or btrim(coalesce(payload ->> 'summary', '')) = ''
    or char_length(payload ->> 'summary') > 2000
    or coalesce(payload #>> '{meta,provider}', '') <> 'openai'
    or btrim(coalesce(payload #>> '{meta,modelLabel}', '')) = '' then
    raise exception using errcode = '22023', message = 'invalid writing feedback schema';
  end if;

  select submissions.* into target_submission
  from public.writing_submissions as submissions
  where submissions.id = target_run.submission_id and submissions.user_id = actor_id;
  if not private.writing_feedback_evidence_is_valid(payload, target_submission.submitted_text) then
    raise exception using errcode = '22023', message = 'writing feedback evidence is invalid';
  end if;

  insert into public.writing_feedback (
    run_id,
    submission_id,
    user_id,
    overall_band_estimate,
    task_response_band,
    coherence_cohesion_band,
    lexical_resource_band,
    grammatical_range_accuracy_band,
    confidence,
    summary,
    criteria,
    strengths,
    priority_issues,
    revision_plan,
    corrected_examples
  ) values (
    target_run.id,
    target_run.submission_id,
    actor_id,
    overall_band,
    task_band,
    coherence_band,
    lexical_band,
    grammar_band,
    payload ->> 'confidence',
    payload ->> 'summary',
    payload -> 'criteria',
    payload -> 'strengths',
    payload -> 'priorityIssues',
    payload -> 'revisionPlan',
    payload -> 'correctedExamples'
  ) returning id into result_id;

  update public.writing_feedback_runs set
    status = 'ready',
    provider = 'openai',
    model_label = left(payload #>> '{meta,modelLabel}', 120),
    input_tokens = greatest(0, coalesce((payload #>> '{meta,inputTokens}')::integer, 0)),
    output_tokens = greatest(0, coalesce((payload #>> '{meta,outputTokens}')::integer, 0)),
    latency_ms = greatest(0, coalesce((payload #>> '{meta,latencyMs}')::integer, 0)),
    completed_at = now()
  where id = target_run.id;

  return jsonb_build_object('runId', target_run.id, 'feedbackId', result_id, 'status', 'ready');
end;
$$;

create function public.fail_writing_feedback_run(
  p_run_id uuid,
  p_error_code text,
  p_expires_at timestamptz,
  p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_run public.writing_feedback_runs;
  signing_secret text;
  signature_message text;
  expected_signature text;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_error_code not in (
    'provider_timeout', 'provider_rate_limited', 'provider_error',
    'provider_refusal', 'invalid_provider_output', 'configuration_error'
  ) then
    raise exception using errcode = '22023', message = 'invalid writing feedback error code';
  end if;
  select runs.* into target_run
  from public.writing_feedback_runs as runs
  where runs.id = p_run_id and runs.user_id = actor_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'writing feedback run not found';
  end if;
  if target_run.status <> 'pending' then
    return jsonb_build_object('runId', target_run.id, 'status', target_run.status);
  end if;
  if p_expires_at < now() or p_expires_at > now() + interval '5 minutes' then
    raise exception using errcode = '42501', message = 'writing feedback signature expired';
  end if;
  signing_secret := private.writing_signing_secret();
  signature_message := 'writing-feedback-failure-v1:' || target_run.id::text || ':'
    || target_run.finalize_nonce::text || ':'
    || extract(epoch from p_expires_at)::bigint::text || ':' || p_error_code;
  expected_signature := encode(
    extensions.hmac(convert_to(signature_message, 'UTF8'), convert_to(signing_secret, 'UTF8'), 'sha256'),
    'hex'
  );
  if p_signature is null or p_signature !~ '^[0-9a-f]{64}$'
    or expected_signature is distinct from p_signature then
    raise exception using errcode = '42501', message = 'invalid writing feedback signature';
  end if;
  update public.writing_feedback_runs set
    status = 'failed', error_code = p_error_code, completed_at = now()
  where id = target_run.id;
  return jsonb_build_object('runId', target_run.id, 'status', 'failed');
end;
$$;

revoke all on function private.count_writing_words(text) from public, anon, authenticated;
revoke all on function public.protect_writing_task_version() from public, anon, authenticated;
revoke all on function public.protect_writing_submission() from public, anon, authenticated;
revoke all on function public.protect_writing_feedback() from public, anon, authenticated;
revoke all on function private.writing_task_version_is_accessible(uuid) from public, anon, authenticated;
revoke all on function private.writing_task_is_accessible(uuid) from public, anon, authenticated;
revoke all on function private.writing_signing_secret() from public, anon, authenticated;
revoke all on function private.valid_writing_band(numeric) from public, anon, authenticated;
revoke all on function private.writing_feedback_evidence_is_valid(jsonb, text) from public, anon, authenticated;

grant execute on function private.writing_task_version_is_accessible(uuid) to authenticated;
grant execute on function private.writing_task_is_accessible(uuid) to authenticated;

revoke all on function public.start_writing_submission(text, text) from public, anon, authenticated;
revoke all on function public.save_writing_draft(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.submit_writing_submission(uuid, text) from public, anon, authenticated;
revoke all on function public.get_writing_submission_clock(uuid) from public, anon, authenticated;
revoke all on function public.get_writing_ai_configuration_state() from public, anon, authenticated;
revoke all on function public.start_writing_feedback_request(uuid, text, text) from public, anon, authenticated;
revoke all on function public.finalize_writing_feedback(uuid, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.fail_writing_feedback_run(uuid, text, timestamptz, text) from public, anon, authenticated;

grant execute on function public.start_writing_submission(text, text) to authenticated;
grant execute on function public.save_writing_draft(uuid, text, integer) to authenticated;
grant execute on function public.submit_writing_submission(uuid, text) to authenticated;
grant execute on function public.get_writing_submission_clock(uuid) to authenticated;
grant execute on function public.get_writing_ai_configuration_state() to authenticated;
grant execute on function public.start_writing_feedback_request(uuid, text, text) to authenticated;
grant execute on function public.finalize_writing_feedback(uuid, text, timestamptz, text) to authenticated;
grant execute on function public.fail_writing_feedback_run(uuid, text, timestamptz, text) to authenticated;

comment on table public.writing_task_versions is
  'Immutable versioned Writing prompts. Learners only read published compatible versions or versions pinned to their own submissions.';
comment on table public.writing_submissions is
  'PostgreSQL-owned Writing draft and immutable submitted snapshot. All mutations use owner-scoped RPCs.';
comment on table public.writing_feedback_runs is
  'Owner-scoped optional AI feedback lifecycle with quota, idempotency, version metadata and signed finalization.';
comment on table public.writing_feedback is
  'Validated immutable Writing feedback. Raw provider responses are not stored.';
comment on function public.save_writing_draft(uuid, text, integer) is
  'Conflict-safe owner autosave. PostgreSQL calculates revision and word count; submitted text cannot be edited.';
comment on function public.finalize_writing_feedback(uuid, text, timestamptz, text) is
  'Accepts only HMAC-signed server output, validates rubric schema and essay evidence, then atomically stores immutable feedback.';

insert into public.writing_tasks (id, slug, display_order)
values
  ('81000000-0000-4000-8000-000000000001', 'community-green-spaces', 1),
  ('81000000-0000-4000-8000-000000000002', 'flexible-library-hours', 2)
on conflict (id) do nothing;

with published_content as (
  select
    '82000000-0000-4000-8000-000000000001'::uuid as id,
    '81000000-0000-4000-8000-000000000001'::uuid as writing_task_id,
    1::smallint as version,
    'task_2'::text as task_type,
    'academic'::text as test_type,
    'Community green spaces'::text as title,
    'Discuss how towns should balance shared green areas with other local needs.'::text as description,
    'Some towns are converting unused land into community green spaces. Others argue that the same land should be used for housing or local businesses. To what extent do you agree that creating green spaces is the best use of unused urban land?'::text as prompt_text,
    'Write a clear position, support it with relevant reasons and examples, and organise your response into paragraphs. Aim for at least 250 words.'::text as instructions,
    'intermediate'::text as difficulty,
    250::integer as word_target,
    250::integer as minimum_words,
    1000::integer as maximum_words,
    2400::integer as time_limit_seconds,
    'published'::text as status,
    'IELTS Flow original content'::text as source_name,
    'Original educational content; all rights reserved by the project authors'::text as licence,
    '2026-07-16 00:00:00+00'::timestamptz as published_at
)
insert into public.writing_task_versions (
  id,
  writing_task_id,
  version,
  task_type,
  test_type,
  title,
  description,
  prompt_text,
  instructions,
  difficulty,
  word_target,
  minimum_words,
  maximum_words,
  time_limit_seconds,
  status,
  source_name,
  licence,
  content_checksum,
  published_at
)
select
  id,
  writing_task_id,
  version,
  task_type,
  test_type,
  title,
  description,
  prompt_text,
  instructions,
  difficulty,
  word_target,
  minimum_words,
  maximum_words,
  time_limit_seconds,
  status,
  source_name,
  licence,
  encode(
    extensions.digest(
      convert_to(
        concat_ws(
          E'\n',
          task_type,
          test_type,
          title,
          description,
          prompt_text,
          instructions,
          difficulty,
          word_target::text,
          minimum_words::text,
          maximum_words::text,
          time_limit_seconds::text
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  ),
  published_at
from published_content
on conflict (id) do nothing;

with draft_content as (
  select
    '82000000-0000-4000-8000-000000000002'::uuid as id,
    '81000000-0000-4000-8000-000000000002'::uuid as writing_task_id,
    1::smallint as version,
    'task_2'::text as task_type,
    'both'::text as test_type,
    'Flexible library hours'::text as title,
    'Unpublished fixture used to verify that learners cannot read draft Writing content.'::text as description,
    'A local library is considering changing its opening hours. Discuss possible benefits and drawbacks.'::text as prompt_text,
    'This task remains unpublished and must never be visible to learners.'::text as instructions,
    'beginner'::text as difficulty,
    250::integer as word_target,
    250::integer as minimum_words,
    1000::integer as maximum_words,
    2400::integer as time_limit_seconds,
    'draft'::text as status,
    'IELTS Flow original content'::text as source_name,
    'Original educational content; all rights reserved by the project authors'::text as licence
)
insert into public.writing_task_versions (
  id,
  writing_task_id,
  version,
  task_type,
  test_type,
  title,
  description,
  prompt_text,
  instructions,
  difficulty,
  word_target,
  minimum_words,
  maximum_words,
  time_limit_seconds,
  status,
  source_name,
  licence,
  content_checksum
)
select
  id,
  writing_task_id,
  version,
  task_type,
  test_type,
  title,
  description,
  prompt_text,
  instructions,
  difficulty,
  word_target,
  minimum_words,
  maximum_words,
  time_limit_seconds,
  status,
  source_name,
  licence,
  encode(
    extensions.digest(
      convert_to(
        concat_ws(
          E'\n',
          task_type,
          test_type,
          title,
          description,
          prompt_text,
          instructions,
          difficulty,
          word_target::text,
          minimum_words::text,
          maximum_words::text,
          time_limit_seconds::text
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  )
from draft_content
on conflict (id) do nothing;

drop policy "Learners can read accessible writing tasks" on public.writing_tasks;

create policy "Learners can read accessible or pinned writing tasks"
on public.writing_tasks for select to authenticated
using (
  (select private.writing_task_is_accessible(id))
  or exists (
    select 1
    from public.writing_submissions as submissions
    where submissions.writing_task_id = writing_tasks.id
      and submissions.user_id = (select auth.uid())
  )
);

comment on policy "Learners can read accessible or pinned writing tasks"
on public.writing_tasks is
  'Learners see current published-compatible task identities plus identities pinned to their own draft or submitted history.';

create table public.speaking_sets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaking_sets_slug_check check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 120
  ),
  constraint speaking_sets_display_order_check check (display_order between 1 and 10000)
);

create table public.speaking_set_versions (
  id uuid primary key default gen_random_uuid(),
  speaking_set_id uuid not null references public.speaking_sets (id) on delete restrict,
  version smallint not null,
  title text not null,
  description text not null,
  instructions text not null,
  test_type text not null,
  difficulty text not null,
  estimated_minutes integer not null,
  status text not null default 'draft',
  source_name text not null,
  licence text not null,
  content_checksum text not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaking_set_versions_set_version_unique unique (speaking_set_id, version),
  constraint speaking_set_versions_set_id_id_unique unique (speaking_set_id, id),
  constraint speaking_set_versions_version_check check (version between 1 and 32767),
  constraint speaking_set_versions_title_check check (btrim(title) <> '' and char_length(title) <= 180),
  constraint speaking_set_versions_description_check check (btrim(description) <> '' and char_length(description) <= 1200),
  constraint speaking_set_versions_instructions_check check (btrim(instructions) <> '' and char_length(instructions) <= 4000),
  constraint speaking_set_versions_test_type_check check (test_type in ('academic', 'general_training', 'both')),
  constraint speaking_set_versions_difficulty_check check (difficulty in ('beginner', 'intermediate', 'advanced')),
  constraint speaking_set_versions_duration_check check (estimated_minutes between 1 and 30),
  constraint speaking_set_versions_status_check check (status in ('draft', 'published', 'archived')),
  constraint speaking_set_versions_publication_check check (
    (status = 'draft' and published_at is null)
    or (status in ('published', 'archived') and published_at is not null)
  ),
  constraint speaking_set_versions_source_check check (btrim(source_name) <> '' and char_length(source_name) <= 200),
  constraint speaking_set_versions_licence_check check (btrim(licence) <> '' and char_length(licence) <= 200),
  constraint speaking_set_versions_checksum_check check (content_checksum ~ '^[0-9a-f]{64}$')
);

create unique index speaking_set_versions_one_published_idx
on public.speaking_set_versions (speaking_set_id) where status = 'published';
create index speaking_set_versions_catalog_idx
on public.speaking_set_versions (status, test_type, speaking_set_id, version desc);

create table public.speaking_prompts (
  id uuid primary key default gen_random_uuid(),
  speaking_set_version_id uuid not null references public.speaking_set_versions (id) on delete restrict,
  part text not null,
  prompt_text text not null,
  instructions text not null,
  preparation_seconds integer not null default 0,
  minimum_answer_seconds integer not null,
  maximum_answer_seconds integer not null,
  display_order integer not null,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaking_prompts_version_order_unique unique (speaking_set_version_id, display_order),
  constraint speaking_prompts_version_id_unique unique (speaking_set_version_id, id),
  constraint speaking_prompts_part_check check (part in ('part_1', 'part_2', 'part_3')),
  constraint speaking_prompts_text_check check (btrim(prompt_text) <> '' and char_length(prompt_text) <= 2000),
  constraint speaking_prompts_instructions_check check (char_length(instructions) <= 2000),
  constraint speaking_prompts_duration_check check (
    preparation_seconds between 0 and 120
    and minimum_answer_seconds between 1 and 180
    and maximum_answer_seconds between minimum_answer_seconds and 180
  ),
  constraint speaking_prompts_order_check check (display_order between 1 and 100)
);
create index speaking_prompts_version_idx on public.speaking_prompts (speaking_set_version_id, display_order);

create table public.speaking_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  speaking_set_id uuid not null references public.speaking_sets (id) on delete restrict,
  speaking_set_version_id uuid not null,
  status text not null default 'in_progress',
  start_idempotency_key text not null,
  submit_idempotency_key text,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaking_attempts_set_version_fkey foreign key (speaking_set_id, speaking_set_version_id)
    references public.speaking_set_versions (speaking_set_id, id) on delete restrict,
  constraint speaking_attempts_id_user_unique unique (id, user_id),
  constraint speaking_attempts_id_version_unique unique (id, speaking_set_version_id),
  constraint speaking_attempts_status_check check (status in ('in_progress', 'submitted')),
  constraint speaking_attempts_start_key_check check (btrim(start_idempotency_key) <> '' and char_length(start_idempotency_key) <= 200),
  constraint speaking_attempts_submit_key_check check (
    submit_idempotency_key is null or (btrim(submit_idempotency_key) <> '' and char_length(submit_idempotency_key) <= 200)
  ),
  constraint speaking_attempts_state_check check (
    (status = 'in_progress' and submit_idempotency_key is null and submitted_at is null)
    or (status = 'submitted' and submit_idempotency_key is not null and submitted_at is not null)
  ),
  constraint speaking_attempts_user_start_key_unique unique (user_id, start_idempotency_key),
  constraint speaking_attempts_user_submit_key_unique unique (user_id, submit_idempotency_key)
);
create unique index speaking_attempts_one_active_set_idx
on public.speaking_attempts (user_id, speaking_set_id) where status = 'in_progress';
create index speaking_attempts_user_recent_idx
on public.speaking_attempts (user_id, status, coalesce(submitted_at, started_at) desc);
create index speaking_attempts_version_idx on public.speaking_attempts (speaking_set_version_id);

create table public.speaking_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  attempt_id uuid not null,
  speaking_set_version_id uuid not null,
  prompt_id uuid not null,
  audio_asset_id uuid,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaking_responses_attempt_owner_fkey foreign key (attempt_id, user_id)
    references public.speaking_attempts (id, user_id) on delete restrict,
  constraint speaking_responses_attempt_version_fkey foreign key (attempt_id, speaking_set_version_id)
    references public.speaking_attempts (id, speaking_set_version_id) on delete restrict,
  constraint speaking_responses_prompt_version_fkey foreign key (speaking_set_version_id, prompt_id)
    references public.speaking_prompts (speaking_set_version_id, id) on delete restrict,
  constraint speaking_responses_attempt_prompt_unique unique (attempt_id, prompt_id),
  constraint speaking_responses_id_user_unique unique (id, user_id),
  constraint speaking_responses_id_attempt_user_unique unique (id, attempt_id, user_id),
  constraint speaking_responses_submission_check check (submitted_at is null or audio_asset_id is not null)
);
create index speaking_responses_user_recent_idx on public.speaking_responses (user_id, created_at desc);
create index speaking_responses_prompt_idx on public.speaking_responses (prompt_id);

create table public.speaking_upload_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  attempt_id uuid not null,
  response_id uuid not null,
  storage_path text not null unique,
  expected_mime_type text not null,
  expected_size_bytes bigint not null,
  expected_duration_seconds numeric(7,3) not null,
  status text not null default 'issued',
  idempotency_key text not null,
  expires_at timestamptz not null,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaking_upload_intents_response_scope_fkey foreign key (response_id, attempt_id, user_id)
    references public.speaking_responses (id, attempt_id, user_id) on delete restrict,
  constraint speaking_upload_intents_status_check check (status in ('issued', 'finalized', 'expired')),
  constraint speaking_upload_intents_mime_check check (expected_mime_type in ('audio/webm', 'audio/mp4', 'audio/mpeg')),
  constraint speaking_upload_intents_size_check check (expected_size_bytes between 1 and 15728640),
  constraint speaking_upload_intents_duration_check check (expected_duration_seconds between 1 and 180),
  constraint speaking_upload_intents_path_check check (storage_path !~ '(^|/)\.\.(/|$)' and char_length(storage_path) <= 500),
  constraint speaking_upload_intents_key_check check (btrim(idempotency_key) <> '' and char_length(idempotency_key) <= 200),
  constraint speaking_upload_intents_state_check check (
    (status = 'issued' and finalized_at is null)
    or (status = 'finalized' and finalized_at is not null)
    or status = 'expired'
  ),
  constraint speaking_upload_intents_user_key_unique unique (user_id, idempotency_key)
);
create index speaking_upload_intents_response_idx on public.speaking_upload_intents (response_id, status);
create index speaking_upload_intents_expiry_idx on public.speaking_upload_intents (status, expires_at);

create table public.speaking_audio_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  attempt_id uuid not null,
  response_id uuid not null,
  upload_intent_id uuid not null unique references public.speaking_upload_intents (id) on delete restrict,
  bucket_id text not null default 'speaking-recordings',
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null,
  duration_seconds numeric(7,3) not null,
  sha256_checksum text not null,
  status text not null default 'ready',
  retention_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaking_audio_assets_response_scope_fkey foreign key (response_id, attempt_id, user_id)
    references public.speaking_responses (id, attempt_id, user_id) on delete restrict,
  constraint speaking_audio_assets_bucket_check check (bucket_id = 'speaking-recordings'),
  constraint speaking_audio_assets_mime_check check (mime_type in ('audio/webm', 'audio/mp4', 'audio/mpeg')),
  constraint speaking_audio_assets_size_check check (size_bytes between 1 and 15728640),
  constraint speaking_audio_assets_duration_check check (duration_seconds between 1 and 180),
  constraint speaking_audio_assets_checksum_check check (sha256_checksum ~ '^[0-9a-f]{64}$'),
  constraint speaking_audio_assets_status_check check (status in ('ready', 'orphaned'))
);
create index speaking_audio_assets_user_recent_idx on public.speaking_audio_assets (user_id, created_at desc);
create index speaking_audio_assets_response_idx on public.speaking_audio_assets (response_id, status);

alter table public.speaking_responses
  add constraint speaking_responses_audio_asset_fkey foreign key (audio_asset_id)
  references public.speaking_audio_assets (id) on delete restrict;

create trigger speaking_sets_set_updated_at before update on public.speaking_sets
for each row execute function public.set_profile_updated_at();
create trigger speaking_set_versions_set_updated_at before update on public.speaking_set_versions
for each row execute function public.set_profile_updated_at();
create trigger speaking_prompts_set_updated_at before update on public.speaking_prompts
for each row execute function public.set_profile_updated_at();
create trigger speaking_attempts_set_updated_at before update on public.speaking_attempts
for each row execute function public.set_profile_updated_at();
create trigger speaking_responses_set_updated_at before update on public.speaking_responses
for each row execute function public.set_profile_updated_at();
create trigger speaking_upload_intents_set_updated_at before update on public.speaking_upload_intents
for each row execute function public.set_profile_updated_at();
create trigger speaking_audio_assets_set_updated_at before update on public.speaking_audio_assets
for each row execute function public.set_profile_updated_at();

create function public.protect_speaking_attempt()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'Speaking attempts cannot be deleted'; end if;
  if old.user_id is distinct from new.user_id
    or old.speaking_set_id is distinct from new.speaking_set_id
    or old.speaking_set_version_id is distinct from new.speaking_set_version_id
    or old.started_at is distinct from new.started_at then
    raise exception 'Speaking attempt identity is immutable';
  end if;
  if old.status = 'submitted' and old is distinct from new then
    raise exception 'Submitted speaking attempts are immutable';
  end if;
  return new;
end; $$;
create trigger protect_speaking_attempt before update or delete on public.speaking_attempts
for each row execute function public.protect_speaking_attempt();

create function public.protect_speaking_response()
returns trigger language plpgsql set search_path = '' as $$
declare parent_status text;
begin
  if tg_op = 'DELETE' then raise exception 'Speaking responses cannot be deleted'; end if;
  select status into parent_status from public.speaking_attempts where id = old.attempt_id;
  if parent_status = 'submitted' and old is distinct from new then
    raise exception 'Submitted speaking responses are immutable';
  end if;
  if old.user_id is distinct from new.user_id or old.attempt_id is distinct from new.attempt_id
    or old.speaking_set_version_id is distinct from new.speaking_set_version_id
    or old.prompt_id is distinct from new.prompt_id then
    raise exception 'Speaking response identity is immutable';
  end if;
  return new;
end; $$;
create trigger protect_speaking_response before update or delete on public.speaking_responses
for each row execute function public.protect_speaking_response();

create function public.protect_speaking_audio_asset()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'Speaking audio metadata cannot be deleted'; end if;
  if old is distinct from new and not (
    old.status = 'ready' and new.status = 'orphaned'
    and old.user_id = new.user_id and old.attempt_id = new.attempt_id
    and old.response_id = new.response_id and old.upload_intent_id = new.upload_intent_id
    and old.bucket_id = new.bucket_id and old.storage_path = new.storage_path
    and old.mime_type = new.mime_type and old.size_bytes = new.size_bytes
    and old.duration_seconds = new.duration_seconds and old.sha256_checksum = new.sha256_checksum
    and old.created_at = new.created_at
  ) then raise exception 'Verified speaking audio metadata is immutable'; end if;
  return new;
end; $$;
create trigger protect_speaking_audio_asset before update or delete on public.speaking_audio_assets
for each row execute function public.protect_speaking_audio_asset();

create function private.speaking_set_version_is_accessible(target_version_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.speaking_set_versions versions
    join public.learner_profiles learners on learners.user_id = (select auth.uid())
    where versions.id = target_version_id and versions.status = 'published'
      and versions.published_at <= now() and learners.onboarding_completed_at is not null
      and (versions.test_type = 'both' or versions.test_type = learners.test_type)
  );
$$;
create function private.speaking_set_is_accessible(target_set_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.speaking_set_versions versions
    where versions.speaking_set_id = target_set_id
      and (select private.speaking_set_version_is_accessible(versions.id))
  );
$$;

alter table public.speaking_sets enable row level security;
alter table public.speaking_set_versions enable row level security;
alter table public.speaking_prompts enable row level security;
alter table public.speaking_attempts enable row level security;
alter table public.speaking_responses enable row level security;
alter table public.speaking_upload_intents enable row level security;
alter table public.speaking_audio_assets enable row level security;

revoke all on table public.speaking_sets, public.speaking_set_versions, public.speaking_prompts,
  public.speaking_attempts, public.speaking_responses, public.speaking_upload_intents,
  public.speaking_audio_assets from anon, authenticated;
grant select on table public.speaking_sets, public.speaking_set_versions, public.speaking_prompts,
  public.speaking_attempts, public.speaking_responses, public.speaking_upload_intents,
  public.speaking_audio_assets to authenticated;

create policy "Learners can read accessible or pinned speaking sets" on public.speaking_sets
for select to authenticated using (
  (select private.speaking_set_is_accessible(id)) or exists (
    select 1 from public.speaking_attempts attempts
    where attempts.speaking_set_id = speaking_sets.id and attempts.user_id = (select auth.uid())
  )
);
create policy "Learners can read accessible or pinned speaking versions" on public.speaking_set_versions
for select to authenticated using (
  (select private.speaking_set_version_is_accessible(id)) or exists (
    select 1 from public.speaking_attempts attempts
    where attempts.speaking_set_version_id = speaking_set_versions.id and attempts.user_id = (select auth.uid())
  )
);
create policy "Learners can read accessible or pinned speaking prompts" on public.speaking_prompts
for select to authenticated using (
  (select private.speaking_set_version_is_accessible(speaking_set_version_id)) or exists (
    select 1 from public.speaking_attempts attempts
    where attempts.speaking_set_version_id = speaking_prompts.speaking_set_version_id
      and attempts.user_id = (select auth.uid())
  )
);
create policy "Learners can read their own speaking attempts" on public.speaking_attempts
for select to authenticated using (user_id = (select auth.uid()));
create policy "Learners can read their own speaking responses" on public.speaking_responses
for select to authenticated using (user_id = (select auth.uid()));
create policy "Learners can read their own speaking upload intents" on public.speaking_upload_intents
for select to authenticated using (user_id = (select auth.uid()));
create policy "Learners can read their own speaking audio metadata" on public.speaking_audio_assets
for select to authenticated using (user_id = (select auth.uid()));

create function public.start_speaking_attempt(p_set_slug text, p_idempotency_key text)
returns public.speaking_attempts language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_version public.speaking_set_versions; result public.speaking_attempts;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then
    raise exception 'Invalid idempotency key';
  end if;
  select versions.* into target_version
  from public.speaking_sets sets
  join public.speaking_set_versions versions on versions.speaking_set_id = sets.id
  join public.learner_profiles learners on learners.user_id = actor_id
  where sets.slug = p_set_slug and versions.status = 'published' and versions.published_at <= now()
    and learners.onboarding_completed_at is not null
    and (versions.test_type = 'both' or versions.test_type = learners.test_type)
  order by versions.version desc limit 1;
  if not found then raise exception 'Speaking set is not available'; end if;
  select * into result from public.speaking_attempts
  where user_id = actor_id and start_idempotency_key = p_idempotency_key;
  if found then
    if result.speaking_set_id <> target_version.speaking_set_id then raise exception 'Idempotency key conflict'; end if;
    return result;
  end if;
  select * into result from public.speaking_attempts
  where user_id = actor_id and speaking_set_id = target_version.speaking_set_id and status = 'in_progress';
  if found then return result; end if;
  insert into public.speaking_attempts (user_id, speaking_set_id, speaking_set_version_id, start_idempotency_key)
  values (actor_id, target_version.speaking_set_id, target_version.id, p_idempotency_key)
  returning * into result;
  return result;
end; $$;

create function public.create_speaking_upload_intent(
  p_attempt_id uuid, p_prompt_id uuid, p_mime_type text, p_size_bytes bigint,
  p_duration_seconds numeric, p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_attempt public.speaking_attempts; target_prompt public.speaking_prompts;
  target_response public.speaking_responses; target_intent public.speaking_upload_intents;
  object_id uuid := gen_random_uuid(); object_extension text; object_path text;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then raise exception 'Invalid idempotency key'; end if;
  if p_mime_type not in ('audio/webm', 'audio/mp4', 'audio/mpeg') then raise exception 'Unsupported audio type'; end if;
  if p_size_bytes not between 1 and 15728640 then raise exception 'Audio size is outside the allowed range'; end if;
  if p_duration_seconds not between 1 and 180 then raise exception 'Audio duration is outside the allowed range'; end if;
  select * into target_attempt from public.speaking_attempts
  where id = p_attempt_id and user_id = actor_id for update;
  if not found or target_attempt.status <> 'in_progress' then raise exception 'Speaking attempt is not editable'; end if;
  select * into target_prompt from public.speaking_prompts
  where id = p_prompt_id and speaking_set_version_id = target_attempt.speaking_set_version_id;
  if not found then raise exception 'Prompt does not belong to this speaking attempt'; end if;
  select * into target_intent from public.speaking_upload_intents
  where user_id = actor_id and idempotency_key = p_idempotency_key;
  if found then
    if target_intent.attempt_id <> p_attempt_id then raise exception 'Idempotency key conflict'; end if;
    return jsonb_build_object('intentId', target_intent.id, 'responseId', target_intent.response_id,
      'bucketId', 'speaking-recordings', 'storagePath', target_intent.storage_path, 'expiresAt', target_intent.expires_at);
  end if;
  insert into public.speaking_responses (user_id, attempt_id, speaking_set_version_id, prompt_id)
  values (actor_id, target_attempt.id, target_attempt.speaking_set_version_id, target_prompt.id)
  on conflict (attempt_id, prompt_id) do update set updated_at = public.speaking_responses.updated_at
  returning * into target_response;
  object_extension := case p_mime_type when 'audio/webm' then 'webm' when 'audio/mp4' then 'm4a' else 'mp3' end;
  object_path := actor_id::text || '/' || target_attempt.id::text || '/' || target_response.id::text || '/' || object_id::text || '.' || object_extension;
  insert into public.speaking_upload_intents (
    user_id, attempt_id, response_id, storage_path, expected_mime_type, expected_size_bytes,
    expected_duration_seconds, idempotency_key, expires_at
  ) values (actor_id, target_attempt.id, target_response.id, object_path, p_mime_type, p_size_bytes,
    p_duration_seconds, p_idempotency_key, now() + interval '15 minutes') returning * into target_intent;
  return jsonb_build_object('intentId', target_intent.id, 'responseId', target_intent.response_id,
    'bucketId', 'speaking-recordings', 'storagePath', target_intent.storage_path, 'expiresAt', target_intent.expires_at);
end; $$;

create function private.speaking_signing_secret()
returns text language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets
  where name = 'speaking_pipeline_signing_secret' order by created_at desc limit 1;
$$;

create function public.get_speaking_pipeline_configuration_state()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and nullif((select private.speaking_signing_secret()), '') is not null;
$$;

create function private.speaking_upload_signature_message(
  actor_id uuid, intent_id uuid, mime_type text, size_bytes bigint,
  duration_seconds numeric, checksum text, expires_at timestamptz
) returns text language sql immutable set search_path = '' as $$
  select concat_ws('|', 'speaking-upload-v1', actor_id, intent_id, mime_type,
    size_bytes, round(duration_seconds * 1000)::bigint, checksum,
    extract(epoch from expires_at)::bigint);
$$;

create function private.speaking_upload_expected_signature(
  actor_id uuid, intent_id uuid, mime_type text, size_bytes bigint,
  duration_seconds numeric, checksum text, expires_at timestamptz
) returns text language sql stable security definer set search_path = '' as $$
  select encode(extensions.hmac(
    convert_to(private.speaking_upload_signature_message(actor_id, intent_id, mime_type,
      size_bytes, duration_seconds, checksum, expires_at), 'UTF8'),
    convert_to(private.speaking_signing_secret(), 'UTF8'), 'sha256'), 'hex');
$$;

create function public.finalize_speaking_upload(
  p_intent_id uuid, p_verified_mime_type text, p_verified_size_bytes bigint,
  p_verified_duration_seconds numeric, p_sha256_checksum text,
  p_signature_expires_at timestamptz, p_signature text
) returns public.speaking_audio_assets language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_intent public.speaking_upload_intents; target_attempt public.speaking_attempts;
  target_response public.speaking_responses; old_asset_id uuid; result public.speaking_audio_assets;
  signing_secret text; expected_signature text;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if p_signature_expires_at <= now() or p_signature_expires_at > now() + interval '5 minutes' then raise exception 'Invalid verification signature expiry'; end if;
  select * into target_intent from public.speaking_upload_intents where id = p_intent_id and user_id = actor_id for update;
  if not found then raise exception 'Upload intent not found'; end if;
  if target_intent.status = 'finalized' then
    select * into result from public.speaking_audio_assets where upload_intent_id = target_intent.id;
    return result;
  end if;
  if target_intent.status <> 'issued' or target_intent.expires_at <= now() then raise exception 'Upload intent expired'; end if;
  select * into target_attempt from public.speaking_attempts where id = target_intent.attempt_id and user_id = actor_id for update;
  if target_attempt.status <> 'in_progress' then raise exception 'Speaking attempt is not editable'; end if;
  if p_verified_mime_type not in ('audio/webm', 'audio/mp4', 'audio/mpeg')
    or p_verified_size_bytes not between 1 and 15728640
    or p_verified_duration_seconds not between 1 and 180
    or p_sha256_checksum !~ '^[0-9a-f]{64}$' then raise exception 'Invalid verified audio metadata'; end if;
  if p_verified_mime_type <> target_intent.expected_mime_type
    or p_verified_size_bytes <> target_intent.expected_size_bytes
    or abs(p_verified_duration_seconds - target_intent.expected_duration_seconds) > 2 then
    raise exception 'Verified audio does not match the upload intent';
  end if;
  signing_secret := private.speaking_signing_secret();
  if nullif(signing_secret, '') is null then raise exception 'Speaking verification is not configured'; end if;
  expected_signature := private.speaking_upload_expected_signature(actor_id, target_intent.id,
    p_verified_mime_type, p_verified_size_bytes, p_verified_duration_seconds,
    p_sha256_checksum, p_signature_expires_at);
  if expected_signature <> lower(p_signature) then raise exception 'Invalid verification signature'; end if;
  select * into target_response from public.speaking_responses where id = target_intent.response_id for update;
  old_asset_id := target_response.audio_asset_id;
  insert into public.speaking_audio_assets (
    user_id, attempt_id, response_id, upload_intent_id, storage_path, mime_type,
    size_bytes, duration_seconds, sha256_checksum
  ) values (actor_id, target_intent.attempt_id, target_intent.response_id, target_intent.id,
    target_intent.storage_path, p_verified_mime_type, p_verified_size_bytes,
    p_verified_duration_seconds, p_sha256_checksum) returning * into result;
  update public.speaking_responses set audio_asset_id = result.id where id = target_response.id;
  if old_asset_id is not null then update public.speaking_audio_assets set status = 'orphaned' where id = old_asset_id; end if;
  update public.speaking_upload_intents set status = 'finalized', finalized_at = now() where id = target_intent.id;
  return result;
end; $$;

create function public.submit_speaking_attempt(p_attempt_id uuid, p_idempotency_key text)
returns public.speaking_attempts language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target public.speaking_attempts; missing_count integer;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then raise exception 'Invalid idempotency key'; end if;
  select * into target from public.speaking_attempts where id = p_attempt_id and user_id = actor_id for update;
  if not found then raise exception 'Speaking attempt not found'; end if;
  if target.status = 'submitted' then
    if target.submit_idempotency_key <> p_idempotency_key then raise exception 'Speaking attempt is already submitted'; end if;
    return target;
  end if;
  select count(*) into missing_count from public.speaking_prompts prompts
  where prompts.speaking_set_version_id = target.speaking_set_version_id and prompts.is_required
    and not exists (
      select 1 from public.speaking_responses responses
      join public.speaking_audio_assets assets on assets.id = responses.audio_asset_id and assets.status = 'ready'
      where responses.attempt_id = target.id and responses.prompt_id = prompts.id
    );
  if missing_count > 0 then raise exception 'Record every required response before submitting'; end if;
  update public.speaking_responses set submitted_at = now() where attempt_id = target.id;
  update public.speaking_attempts set status = 'submitted', submit_idempotency_key = p_idempotency_key,
    submitted_at = now() where id = target.id returning * into target;
  return target;
end; $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('speaking-recordings', 'speaking-recordings', false, 15728640, array['audio/webm', 'audio/mp4', 'audio/mpeg']::text[])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Learners can upload issued speaking recordings" on storage.objects
for insert to authenticated with check (
  bucket_id = 'speaking-recordings'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.speaking_upload_intents intents
    where intents.user_id = (select auth.uid()) and intents.storage_path = name
      and intents.status = 'issued' and intents.expires_at > now()
  )
);
create policy "Learners can read their own speaking recordings" on storage.objects
for select to authenticated using (
  bucket_id = 'speaking-recordings' and (
    exists (select 1 from public.speaking_audio_assets assets
      where assets.user_id = (select auth.uid()) and assets.storage_path = name)
    or exists (select 1 from public.speaking_upload_intents intents
      where intents.user_id = (select auth.uid()) and intents.storage_path = name and intents.expires_at > now())
  )
);
create policy "Learners can delete unsubmitted speaking recordings" on storage.objects
for delete to authenticated using (
  bucket_id = 'speaking-recordings' and exists (
    select 1 from public.speaking_upload_intents intents
    join public.speaking_attempts attempts on attempts.id = intents.attempt_id
    where intents.user_id = (select auth.uid()) and intents.storage_path = name
      and attempts.user_id = (select auth.uid()) and attempts.status = 'in_progress'
  )
);

revoke all on function public.protect_speaking_attempt(), public.protect_speaking_response(),
  public.protect_speaking_audio_asset(), private.speaking_set_version_is_accessible(uuid),
  private.speaking_set_is_accessible(uuid), private.speaking_signing_secret(),
  private.speaking_upload_signature_message(uuid, uuid, text, bigint, numeric, text, timestamptz),
  private.speaking_upload_expected_signature(uuid, uuid, text, bigint, numeric, text, timestamptz)
  from public, anon, authenticated;
grant execute on function private.speaking_set_version_is_accessible(uuid), private.speaking_set_is_accessible(uuid) to authenticated;
revoke all on function public.start_speaking_attempt(text, text),
  public.create_speaking_upload_intent(uuid, uuid, text, bigint, numeric, text),
  public.get_speaking_pipeline_configuration_state(),
  public.finalize_speaking_upload(uuid, text, bigint, numeric, text, timestamptz, text),
  public.submit_speaking_attempt(uuid, text) from public, anon, authenticated;
grant execute on function public.start_speaking_attempt(text, text),
  public.create_speaking_upload_intent(uuid, uuid, text, bigint, numeric, text),
  public.get_speaking_pipeline_configuration_state(),
  public.finalize_speaking_upload(uuid, text, bigint, numeric, text, timestamptz, text),
  public.submit_speaking_attempt(uuid, text) to authenticated;

comment on table public.speaking_attempts is 'Phase 9 server-owned Speaking attempt state. Submitted rows are immutable.';
comment on table public.speaking_audio_assets is 'Verified metadata for private speaking-recordings objects; Storage remains the audio source of truth.';
comment on function public.finalize_speaking_upload(uuid, text, bigint, numeric, text, timestamptz, text) is
  'Accepts only short-lived server-signed metadata after the uploaded object has been independently verified.';

insert into public.speaking_sets (id, slug, display_order)
values
  ('91000000-0000-4000-8000-000000000001', 'everyday-choices', 1),
  ('91000000-0000-4000-8000-000000000002', 'neighbourhood-ideas-draft', 2);

insert into public.speaking_set_versions (
  id, speaking_set_id, version, title, description, instructions, test_type,
  difficulty, estimated_minutes, status, source_name, licence, content_checksum, published_at
) values (
  '91100000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000001',
  1,
  'Everyday choices',
  'A short speaking practice about routines, decisions and shared spaces.',
  'Answer naturally in your own words. The suggested timing is for practice, not an official test score.',
  'both', 'beginner', 8, 'published', 'English Learning Lab original content',
  'Original educational content - project use',
  'a7bfc1f5783b327b27fd1d17c022bcf23d9f2a42584d4f89d5eabda68add1234', now()
), (
  '91100000-0000-4000-8000-000000000002',
  '91000000-0000-4000-8000-000000000002',
  1,
  'Neighbourhood ideas',
  'Editorial draft for a future speaking practice.',
  'This draft must never be visible to learners.',
  'both', 'intermediate', 8, 'draft', 'English Learning Lab original content',
  'Original educational content - project use',
  'b8c0d2e6894c438c38fe2e28d133cdf34e0a3b53695e5f90e6fbceb79bee2345', null
);

insert into public.speaking_prompts (
  id, speaking_set_version_id, part, prompt_text, instructions, preparation_seconds,
  minimum_answer_seconds, maximum_answer_seconds, display_order, is_required
) values
  (
    '91200000-0000-4000-8000-000000000001', '91100000-0000-4000-8000-000000000001',
    'part_1', 'What part of your daily routine helps you feel ready for the day?',
    'Give a brief answer and one reason.', 0, 10, 45, 1, true
  ),
  (
    '91200000-0000-4000-8000-000000000002', '91100000-0000-4000-8000-000000000001',
    'part_1', 'Do you usually make plans early or decide at the last moment?',
    'Describe your usual approach with a small example.', 0, 10, 45, 2, true
  ),
  (
    '91200000-0000-4000-8000-000000000003', '91100000-0000-4000-8000-000000000001',
    'part_2', 'Describe a simple choice that improved one of your days. Say what you chose, why you chose it, and what changed afterwards.',
    'Use the preparation time to note two or three keywords. Speak from your own experience or create an original example.',
    30, 45, 120, 3, true
  ),
  (
    '91200000-0000-4000-8000-000000000004', '91100000-0000-4000-8000-000000000001',
    'part_3', 'How can schools or workplaces make everyday decisions easier for people?',
    'Develop one idea, explain its effect, and mention a possible drawback.', 0, 30, 90, 4, true
  ),
  (
    '91200000-0000-4000-8000-000000000005', '91100000-0000-4000-8000-000000000002',
    'part_1', 'Which shared place in your neighbourhood would you improve first?',
    'Editorial draft prompt.', 0, 10, 45, 1, true
  );

comment on table public.speaking_prompts is
  'Small original Phase 9 seed. These prompts are not copied from an official or copyrighted IELTS paper.';

create table public.speaking_transcript_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  response_id uuid not null,
  status text not null default 'pending',
  provider text not null,
  model text not null,
  request_idempotency_key text not null,
  audio_checksum text not null,
  consent_version text not null,
  attempt_number smallint not null default 1,
  requested_at timestamptz not null default now(),
  lease_expires_at timestamptz not null,
  completed_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaking_transcript_runs_response_owner_fkey foreign key (response_id, user_id)
    references public.speaking_responses (id, user_id) on delete restrict,
  constraint speaking_transcript_runs_id_response_user_unique unique (id, response_id, user_id),
  constraint speaking_transcript_runs_status_check check (status in ('pending', 'ready', 'failed')),
  constraint speaking_transcript_runs_provider_check check (btrim(provider) <> '' and char_length(provider) <= 80),
  constraint speaking_transcript_runs_model_check check (btrim(model) <> '' and char_length(model) <= 120),
  constraint speaking_transcript_runs_key_check check (btrim(request_idempotency_key) <> '' and char_length(request_idempotency_key) <= 200),
  constraint speaking_transcript_runs_checksum_check check (audio_checksum ~ '^[0-9a-f]{64}$'),
  constraint speaking_transcript_runs_consent_check check (btrim(consent_version) <> '' and char_length(consent_version) <= 80),
  constraint speaking_transcript_runs_attempt_check check (attempt_number between 1 and 2),
  constraint speaking_transcript_runs_lease_check check (lease_expires_at > requested_at),
  constraint speaking_transcript_runs_state_check check (
    (status = 'pending' and completed_at is null and error_code is null)
    or (status = 'ready' and completed_at is not null and error_code is null)
    or (status = 'failed' and completed_at is not null and error_code is not null)
  ),
  constraint speaking_transcript_runs_user_key_unique unique (user_id, request_idempotency_key)
);
create unique index speaking_transcript_runs_one_ready_idx on public.speaking_transcript_runs (response_id) where status = 'ready';
create unique index speaking_transcript_runs_one_pending_idx on public.speaking_transcript_runs (response_id) where status = 'pending';
create index speaking_transcript_runs_user_recent_idx on public.speaking_transcript_runs (user_id, requested_at desc);

create table public.speaking_transcripts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique,
  user_id uuid not null,
  response_id uuid not null,
  transcript_text text not null,
  language_code text,
  created_at timestamptz not null default now(),
  constraint speaking_transcripts_run_scope_fkey foreign key (run_id, response_id, user_id)
    references public.speaking_transcript_runs (id, response_id, user_id) on delete restrict,
  constraint speaking_transcripts_text_check check (btrim(transcript_text) <> '' and char_length(transcript_text) <= 20000),
  constraint speaking_transcripts_language_check check (language_code is null or language_code ~ '^[a-z]{2,3}(?:-[A-Z]{2})?$')
);
create index speaking_transcripts_response_idx on public.speaking_transcripts (response_id);
create index speaking_transcripts_user_recent_idx on public.speaking_transcripts (user_id, created_at desc);

create table public.speaking_feedback_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  attempt_id uuid not null,
  status text not null default 'pending',
  provider text not null,
  model text not null,
  request_idempotency_key text not null,
  transcript_bundle_checksum text not null,
  rubric_version text not null,
  prompt_version text not null,
  consent_version text not null,
  attempt_number smallint not null default 1,
  requested_at timestamptz not null default now(),
  lease_expires_at timestamptz not null,
  completed_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaking_feedback_runs_attempt_owner_fkey foreign key (attempt_id, user_id)
    references public.speaking_attempts (id, user_id) on delete restrict,
  constraint speaking_feedback_runs_id_attempt_user_unique unique (id, attempt_id, user_id),
  constraint speaking_feedback_runs_status_check check (status in ('pending', 'ready', 'failed')),
  constraint speaking_feedback_runs_text_check check (
    btrim(provider) <> '' and char_length(provider) <= 80 and btrim(model) <> '' and char_length(model) <= 120
    and btrim(rubric_version) <> '' and char_length(rubric_version) <= 80
    and btrim(prompt_version) <> '' and char_length(prompt_version) <= 80
    and btrim(consent_version) <> '' and char_length(consent_version) <= 80
  ),
  constraint speaking_feedback_runs_key_check check (btrim(request_idempotency_key) <> '' and char_length(request_idempotency_key) <= 200),
  constraint speaking_feedback_runs_checksum_check check (transcript_bundle_checksum ~ '^[0-9a-f]{64}$'),
  constraint speaking_feedback_runs_attempt_check check (attempt_number between 1 and 2),
  constraint speaking_feedback_runs_lease_check check (lease_expires_at > requested_at),
  constraint speaking_feedback_runs_state_check check (
    (status = 'pending' and completed_at is null and error_code is null)
    or (status = 'ready' and completed_at is not null and error_code is null)
    or (status = 'failed' and completed_at is not null and error_code is not null)
  ),
  constraint speaking_feedback_runs_user_key_unique unique (user_id, request_idempotency_key)
);
create unique index speaking_feedback_runs_one_ready_idx on public.speaking_feedback_runs (attempt_id) where status = 'ready';
create unique index speaking_feedback_runs_one_pending_idx on public.speaking_feedback_runs (attempt_id) where status = 'pending';
create index speaking_feedback_runs_user_recent_idx on public.speaking_feedback_runs (user_id, requested_at desc);

create table public.speaking_feedback (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique,
  user_id uuid not null,
  attempt_id uuid not null,
  estimated_overall_band numeric(2,1),
  estimated_fluency_band numeric(2,1),
  estimated_lexical_band numeric(2,1),
  estimated_grammar_band numeric(2,1),
  estimated_pronunciation_band numeric(2,1),
  pronunciation_scope text not null,
  confidence text not null,
  summary text not null,
  criteria jsonb not null,
  strengths jsonb not null,
  suggestions jsonb not null,
  disclaimer text not null,
  created_at timestamptz not null default now(),
  constraint speaking_feedback_run_scope_fkey foreign key (run_id, attempt_id, user_id)
    references public.speaking_feedback_runs (id, attempt_id, user_id) on delete restrict,
  constraint speaking_feedback_band_check check (
    private.valid_writing_band(estimated_overall_band) and private.valid_writing_band(estimated_fluency_band)
    and private.valid_writing_band(estimated_lexical_band) and private.valid_writing_band(estimated_grammar_band)
    and private.valid_writing_band(estimated_pronunciation_band)
  ),
  constraint speaking_feedback_pronunciation_scope_check check (pronunciation_scope in ('audio_available', 'transcript_only')),
  constraint speaking_feedback_confidence_check check (confidence in ('low', 'medium', 'high')),
  constraint speaking_feedback_summary_check check (btrim(summary) <> '' and char_length(summary) <= 3000),
  constraint speaking_feedback_json_check check (
    jsonb_typeof(criteria) = 'object' and jsonb_typeof(strengths) = 'array' and jsonb_typeof(suggestions) = 'array'
    and jsonb_array_length(strengths) between 1 and 8 and jsonb_array_length(suggestions) between 1 and 8
  ),
  constraint speaking_feedback_disclaimer_check check (
    disclaimer = 'AI practice feedback only - not an official IELTS score.'
  )
);
create index speaking_feedback_attempt_idx on public.speaking_feedback (attempt_id);
create index speaking_feedback_user_recent_idx on public.speaking_feedback (user_id, created_at desc);

create trigger speaking_transcript_runs_set_updated_at before update on public.speaking_transcript_runs
for each row execute function public.set_profile_updated_at();
create trigger speaking_feedback_runs_set_updated_at before update on public.speaking_feedback_runs
for each row execute function public.set_profile_updated_at();

create function public.protect_speaking_transcript()
returns trigger language plpgsql set search_path = '' as $$ begin
  raise exception 'Speaking transcripts are immutable';
end; $$;
create trigger protect_speaking_transcript before update or delete on public.speaking_transcripts
for each row execute function public.protect_speaking_transcript();
create function public.protect_speaking_feedback()
returns trigger language plpgsql set search_path = '' as $$ begin
  raise exception 'Speaking feedback is immutable';
end; $$;
create trigger protect_speaking_feedback before update or delete on public.speaking_feedback
for each row execute function public.protect_speaking_feedback();

alter table public.speaking_transcript_runs enable row level security;
alter table public.speaking_transcripts enable row level security;
alter table public.speaking_feedback_runs enable row level security;
alter table public.speaking_feedback enable row level security;
revoke all on table public.speaking_transcript_runs, public.speaking_transcripts,
  public.speaking_feedback_runs, public.speaking_feedback from anon, authenticated;
grant select on table public.speaking_transcript_runs, public.speaking_transcripts,
  public.speaking_feedback_runs, public.speaking_feedback to authenticated;
create policy "Learners can read their own speaking transcript runs" on public.speaking_transcript_runs
for select to authenticated using (user_id = (select auth.uid()));
create policy "Learners can read their own speaking transcripts" on public.speaking_transcripts
for select to authenticated using (user_id = (select auth.uid()));
create policy "Learners can read their own speaking feedback runs" on public.speaking_feedback_runs
for select to authenticated using (user_id = (select auth.uid()));
create policy "Learners can read their own speaking feedback" on public.speaking_feedback
for select to authenticated using (user_id = (select auth.uid()));

create function public.start_speaking_transcript_request(
  p_response_id uuid, p_idempotency_key text, p_consent_version text, p_provider text, p_model text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_response public.speaking_responses; target_attempt public.speaking_attempts;
  target_asset public.speaking_audio_assets; target_run public.speaking_transcript_runs; previous_count integer;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if nullif(private.speaking_signing_secret(), '') is null then raise exception 'Speaking AI is not configured'; end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200
    or p_consent_version <> 'speaking-ai-v1' then raise exception 'Invalid transcript request'; end if;
  select * into target_response from public.speaking_responses where id = p_response_id and user_id = actor_id;
  if not found or target_response.submitted_at is null then raise exception 'Only submitted responses can be transcribed'; end if;
  select * into target_attempt from public.speaking_attempts where id = target_response.attempt_id and user_id = actor_id;
  if target_attempt.status <> 'submitted' then raise exception 'Only submitted attempts can be transcribed'; end if;
  select * into target_asset from public.speaking_audio_assets where id = target_response.audio_asset_id and status = 'ready';
  select * into target_run from public.speaking_transcript_runs where user_id = actor_id and request_idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('runId', target_run.id, 'bucketId', target_asset.bucket_id, 'storagePath', target_asset.storage_path); end if;
  select count(*) into previous_count from public.speaking_transcript_runs where response_id = target_response.id;
  if previous_count >= 2 then raise exception 'Transcript retry limit reached'; end if;
  update public.speaking_transcript_runs set status = 'failed', completed_at = now(), error_code = 'lease_expired'
  where response_id = target_response.id and status = 'pending' and lease_expires_at <= now();
  if exists (select 1 from public.speaking_transcript_runs where response_id = target_response.id and status in ('pending', 'ready')) then
    raise exception 'Transcript already exists or is being prepared';
  end if;
  insert into public.speaking_transcript_runs (
    user_id, response_id, provider, model, request_idempotency_key, audio_checksum,
    consent_version, attempt_number, lease_expires_at
  ) values (actor_id, target_response.id, left(p_provider, 80), left(p_model, 120), p_idempotency_key,
    target_asset.sha256_checksum, p_consent_version, previous_count + 1, now() + interval '2 minutes')
  returning * into target_run;
  return jsonb_build_object('runId', target_run.id, 'bucketId', target_asset.bucket_id, 'storagePath', target_asset.storage_path);
end; $$;

create function public.finalize_speaking_transcript(
  p_run_id uuid, p_transcript_text text, p_language_code text,
  p_signature_expires_at timestamptz, p_signature text
) returns public.speaking_transcripts language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_run public.speaking_transcript_runs; result public.speaking_transcripts;
  message text; expected text; secret text;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  select * into target_run from public.speaking_transcript_runs where id = p_run_id and user_id = actor_id for update;
  if not found then raise exception 'Transcript run not found'; end if;
  if target_run.status = 'ready' then select * into result from public.speaking_transcripts where run_id = target_run.id; return result; end if;
  if target_run.status <> 'pending' or target_run.lease_expires_at <= now() then raise exception 'Transcript run is not active'; end if;
  if p_signature_expires_at <= now() or p_signature_expires_at > now() + interval '5 minutes'
    or p_transcript_text is null or btrim(p_transcript_text) = '' or char_length(p_transcript_text) > 20000 then
    raise exception 'Invalid transcript result';
  end if;
  secret := private.speaking_signing_secret();
  message := concat_ws('|', 'speaking-transcript-v1', actor_id, target_run.id,
    encode(extensions.digest(convert_to(p_transcript_text, 'UTF8'), 'sha256'), 'hex'),
    coalesce(p_language_code, ''), extract(epoch from p_signature_expires_at)::bigint);
  expected := encode(extensions.hmac(convert_to(message, 'UTF8'), convert_to(secret, 'UTF8'), 'sha256'), 'hex');
  if expected <> lower(p_signature) then raise exception 'Invalid transcript signature'; end if;
  insert into public.speaking_transcripts (run_id, user_id, response_id, transcript_text, language_code)
  values (target_run.id, actor_id, target_run.response_id, p_transcript_text, p_language_code) returning * into result;
  update public.speaking_transcript_runs set status = 'ready', completed_at = now() where id = target_run.id;
  return result;
end; $$;

create function public.fail_speaking_transcript_run(
  p_run_id uuid, p_error_code text, p_signature_expires_at timestamptz, p_signature text
) returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_run public.speaking_transcript_runs; message text; expected text; secret text;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  select * into target_run from public.speaking_transcript_runs where id = p_run_id and user_id = actor_id for update;
  if not found or target_run.status <> 'pending' then return; end if;
  if p_signature_expires_at <= now() or p_signature_expires_at > now() + interval '5 minutes'
    or p_error_code !~ '^[a-z0-9_]{1,80}$' then raise exception 'Invalid failure result'; end if;
  secret := private.speaking_signing_secret();
  message := concat_ws('|', 'speaking-transcript-failure-v1', actor_id, target_run.id, p_error_code,
    extract(epoch from p_signature_expires_at)::bigint);
  expected := encode(extensions.hmac(convert_to(message, 'UTF8'), convert_to(secret, 'UTF8'), 'sha256'), 'hex');
  if expected <> lower(p_signature) then raise exception 'Invalid transcript failure signature'; end if;
  update public.speaking_transcript_runs set status = 'failed', completed_at = now(), error_code = p_error_code where id = target_run.id;
end; $$;

create function public.start_speaking_feedback_request(
  p_attempt_id uuid, p_idempotency_key text, p_consent_version text, p_provider text, p_model text,
  p_transcript_bundle_checksum text
) returns public.speaking_feedback_runs language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_attempt public.speaking_attempts; target_run public.speaking_feedback_runs; previous_count integer;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if nullif(private.speaking_signing_secret(), '') is null then raise exception 'Speaking AI is not configured'; end if;
  if p_consent_version <> 'speaking-ai-v1' or p_transcript_bundle_checksum !~ '^[0-9a-f]{64}$'
    or p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then
    raise exception 'Invalid feedback request';
  end if;
  select * into target_attempt from public.speaking_attempts where id = p_attempt_id and user_id = actor_id;
  if not found or target_attempt.status <> 'submitted' then raise exception 'Only submitted attempts can receive feedback'; end if;
  if exists (
    select 1 from public.speaking_responses responses where responses.attempt_id = target_attempt.id
    and not exists (select 1 from public.speaking_transcripts transcripts where transcripts.response_id = responses.id)
  ) then raise exception 'Transcripts are not ready for every response'; end if;
  select * into target_run from public.speaking_feedback_runs where user_id = actor_id and request_idempotency_key = p_idempotency_key;
  if found then return target_run; end if;
  select count(*) into previous_count from public.speaking_feedback_runs where attempt_id = target_attempt.id;
  if previous_count >= 2 then raise exception 'Feedback retry limit reached'; end if;
  update public.speaking_feedback_runs set status = 'failed', completed_at = now(), error_code = 'lease_expired'
  where attempt_id = target_attempt.id and status = 'pending' and lease_expires_at <= now();
  if exists (select 1 from public.speaking_feedback_runs where attempt_id = target_attempt.id and status in ('pending', 'ready')) then
    raise exception 'Feedback already exists or is being prepared';
  end if;
  insert into public.speaking_feedback_runs (
    user_id, attempt_id, provider, model, request_idempotency_key, transcript_bundle_checksum,
    rubric_version, prompt_version, consent_version, attempt_number, lease_expires_at
  ) values (actor_id, target_attempt.id, left(p_provider, 80), left(p_model, 120), p_idempotency_key,
    p_transcript_bundle_checksum, 'speaking-practice-v1', 'speaking-feedback-v1', p_consent_version,
    previous_count + 1, now() + interval '2 minutes') returning * into target_run;
  return target_run;
end; $$;

create function public.finalize_speaking_feedback(
  p_run_id uuid, p_payload text, p_signature_expires_at timestamptz, p_signature text
) returns public.speaking_feedback language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_run public.speaking_feedback_runs; result public.speaking_feedback;
  payload jsonb; message text; expected text; secret text;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  select * into target_run from public.speaking_feedback_runs where id = p_run_id and user_id = actor_id for update;
  if not found then raise exception 'Feedback run not found'; end if;
  if target_run.status = 'ready' then select * into result from public.speaking_feedback where run_id = target_run.id; return result; end if;
  if target_run.status <> 'pending' or target_run.lease_expires_at <= now() then raise exception 'Feedback run is not active'; end if;
  if p_signature_expires_at <= now() or p_signature_expires_at > now() + interval '5 minutes' or char_length(p_payload) > 30000 then
    raise exception 'Invalid feedback result'; end if;
  begin payload := p_payload::jsonb; exception when others then raise exception 'Invalid feedback payload'; end;
  secret := private.speaking_signing_secret();
  message := concat_ws('|', 'speaking-feedback-v1', actor_id, target_run.id,
    encode(extensions.digest(convert_to(p_payload, 'UTF8'), 'sha256'), 'hex'),
    extract(epoch from p_signature_expires_at)::bigint);
  expected := encode(extensions.hmac(convert_to(message, 'UTF8'), convert_to(secret, 'UTF8'), 'sha256'), 'hex');
  if expected <> lower(p_signature) then raise exception 'Invalid feedback signature'; end if;
  insert into public.speaking_feedback (
    run_id, user_id, attempt_id, estimated_overall_band, estimated_fluency_band,
    estimated_lexical_band, estimated_grammar_band, estimated_pronunciation_band,
    pronunciation_scope, confidence, summary, criteria, strengths, suggestions, disclaimer
  ) values (
    target_run.id, actor_id, target_run.attempt_id,
    nullif(payload->>'estimatedOverallBand', '')::numeric,
    nullif(payload->>'estimatedFluencyBand', '')::numeric,
    nullif(payload->>'estimatedLexicalBand', '')::numeric,
    nullif(payload->>'estimatedGrammarBand', '')::numeric,
    nullif(payload->>'estimatedPronunciationBand', '')::numeric,
    payload->>'pronunciationScope', payload->>'confidence', payload->>'summary',
    payload->'criteria', payload->'strengths', payload->'suggestions',
    'AI practice feedback only - not an official IELTS score.'
  ) returning * into result;
  update public.speaking_feedback_runs set status = 'ready', completed_at = now() where id = target_run.id;
  return result;
end; $$;

create function public.fail_speaking_feedback_run(
  p_run_id uuid, p_error_code text, p_signature_expires_at timestamptz, p_signature text
) returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_run public.speaking_feedback_runs; message text; expected text; secret text;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  select * into target_run from public.speaking_feedback_runs where id = p_run_id and user_id = actor_id for update;
  if not found or target_run.status <> 'pending' then return; end if;
  if p_signature_expires_at <= now() or p_signature_expires_at > now() + interval '5 minutes'
    or p_error_code !~ '^[a-z0-9_]{1,80}$' then raise exception 'Invalid failure result'; end if;
  secret := private.speaking_signing_secret();
  message := concat_ws('|', 'speaking-feedback-failure-v1', actor_id, target_run.id, p_error_code,
    extract(epoch from p_signature_expires_at)::bigint);
  expected := encode(extensions.hmac(convert_to(message, 'UTF8'), convert_to(secret, 'UTF8'), 'sha256'), 'hex');
  if expected <> lower(p_signature) then raise exception 'Invalid feedback failure signature'; end if;
  update public.speaking_feedback_runs set status = 'failed', completed_at = now(), error_code = p_error_code where id = target_run.id;
end; $$;

revoke all on function public.protect_speaking_transcript(), public.protect_speaking_feedback() from public, anon, authenticated;
revoke all on function public.start_speaking_transcript_request(uuid, text, text, text, text),
  public.finalize_speaking_transcript(uuid, text, text, timestamptz, text),
  public.fail_speaking_transcript_run(uuid, text, timestamptz, text),
  public.start_speaking_feedback_request(uuid, text, text, text, text, text),
  public.finalize_speaking_feedback(uuid, text, timestamptz, text),
  public.fail_speaking_feedback_run(uuid, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.start_speaking_transcript_request(uuid, text, text, text, text),
  public.finalize_speaking_transcript(uuid, text, text, timestamptz, text),
  public.fail_speaking_transcript_run(uuid, text, timestamptz, text),
  public.start_speaking_feedback_request(uuid, text, text, text, text, text),
  public.finalize_speaking_feedback(uuid, text, timestamptz, text),
  public.fail_speaking_feedback_run(uuid, text, timestamptz, text) to authenticated;

comment on table public.speaking_transcripts is 'Optional provider transcript; absent on failure and never fabricated.';
comment on table public.speaking_feedback is 'Optional AI practice feedback, explicitly not an official IELTS score.';

create table public.mock_tests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mock_tests_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint mock_tests_display_order_check check (display_order between 0 and 10000),
  constraint mock_tests_id_pair_unique unique (id, slug)
);

create table public.mock_test_versions (
  id uuid primary key default gen_random_uuid(),
  mock_test_id uuid not null references public.mock_tests (id) on delete restrict,
  version smallint not null,
  title text not null,
  description text not null,
  test_type text not null,
  difficulty text not null,
  estimated_minutes integer not null,
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mock_test_versions_test_version_unique unique (mock_test_id, version),
  constraint mock_test_versions_test_id_unique unique (mock_test_id, id),
  constraint mock_test_versions_version_check check (version between 1 and 32767),
  constraint mock_test_versions_title_check check (btrim(title) <> '' and char_length(title) <= 180),
  constraint mock_test_versions_description_check check (btrim(description) <> '' and char_length(description) <= 2000),
  constraint mock_test_versions_test_type_check check (test_type in ('academic', 'general_training', 'both')),
  constraint mock_test_versions_difficulty_check check (difficulty in ('beginner', 'intermediate', 'advanced')),
  constraint mock_test_versions_minutes_check check (estimated_minutes between 1 and 600),
  constraint mock_test_versions_status_check check (status in ('draft', 'published', 'archived')),
  constraint mock_test_versions_publication_check check (
    (status = 'draft' and published_at is null)
    or (status in ('published', 'archived') and published_at is not null)
  )
);

create unique index mock_test_versions_one_published_idx
on public.mock_test_versions (mock_test_id) where status = 'published';
create index mock_test_versions_catalog_idx
on public.mock_test_versions (status, test_type, mock_test_id, version desc);

create table public.mock_test_sections (
  id uuid primary key default gen_random_uuid(),
  mock_test_version_id uuid not null references public.mock_test_versions (id) on delete restrict,
  section_type text not null,
  section_order smallint not null,
  time_limit_seconds integer not null,
  required boolean not null default true,
  exercise_set_version_id uuid references public.exercise_set_versions (id) on delete restrict,
  writing_task_version_id uuid references public.writing_task_versions (id) on delete restrict,
  speaking_set_version_id uuid references public.speaking_set_versions (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mock_test_sections_version_order_unique unique (mock_test_version_id, section_order),
  constraint mock_test_sections_version_type_unique unique (mock_test_version_id, section_type),
  constraint mock_test_sections_version_id_unique unique (mock_test_version_id, id),
  constraint mock_test_sections_type_check check (section_type in ('reading', 'listening', 'writing', 'speaking')),
  constraint mock_test_sections_order_check check (section_order between 1 and 20),
  constraint mock_test_sections_time_check check (time_limit_seconds between 60 and 7200),
  constraint mock_test_sections_link_check check (
    (section_type in ('reading', 'listening') and exercise_set_version_id is not null
      and writing_task_version_id is null and speaking_set_version_id is null)
    or (section_type = 'writing' and exercise_set_version_id is null
      and writing_task_version_id is not null and speaking_set_version_id is null)
    or (section_type = 'speaking' and exercise_set_version_id is null
      and writing_task_version_id is null and speaking_set_version_id is not null)
  )
);

create index mock_test_sections_exercise_version_idx
on public.mock_test_sections (exercise_set_version_id) where exercise_set_version_id is not null;
create index mock_test_sections_writing_version_idx
on public.mock_test_sections (writing_task_version_id) where writing_task_version_id is not null;
create index mock_test_sections_speaking_version_idx
on public.mock_test_sections (speaking_set_version_id) where speaking_set_version_id is not null;

create table public.mock_test_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mock_test_id uuid not null references public.mock_tests (id) on delete restrict,
  mock_test_version_id uuid not null,
  status text not null default 'in_progress',
  current_section_order smallint,
  start_idempotency_key text not null,
  submit_idempotency_key text,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mock_test_sessions_test_version_fkey foreign key (mock_test_id, mock_test_version_id)
    references public.mock_test_versions (mock_test_id, id) on delete restrict,
  constraint mock_test_sessions_id_user_unique unique (id, user_id),
  constraint mock_test_sessions_id_version_unique unique (id, mock_test_version_id),
  constraint mock_test_sessions_status_check check (status in ('in_progress', 'submitted', 'completed', 'abandoned')),
  constraint mock_test_sessions_current_order_check check (current_section_order is null or current_section_order between 1 and 20),
  constraint mock_test_sessions_start_key_check check (btrim(start_idempotency_key) <> '' and char_length(start_idempotency_key) <= 200),
  constraint mock_test_sessions_submit_key_check check (
    submit_idempotency_key is null or (btrim(submit_idempotency_key) <> '' and char_length(submit_idempotency_key) <= 200)
  ),
  constraint mock_test_sessions_user_start_key_unique unique (user_id, start_idempotency_key),
  constraint mock_test_sessions_user_submit_key_unique unique (user_id, submit_idempotency_key),
  constraint mock_test_sessions_state_check check (
    (status = 'in_progress' and submitted_at is null and completed_at is null)
    or (status = 'submitted' and submitted_at is not null and completed_at is null and submit_idempotency_key is not null)
    or (status = 'completed' and submitted_at is not null and completed_at is not null and submit_idempotency_key is not null)
    or (status = 'abandoned' and completed_at is null)
  )
);

create unique index mock_test_sessions_one_active_test_idx
on public.mock_test_sessions (user_id, mock_test_id) where status in ('in_progress', 'submitted');
create index mock_test_sessions_user_recent_idx
on public.mock_test_sessions (user_id, status, coalesce(completed_at, submitted_at, started_at) desc);
create index mock_test_sessions_version_idx on public.mock_test_sessions (mock_test_version_id);

create table public.mock_test_section_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  mock_test_version_id uuid not null,
  mock_test_section_id uuid not null,
  section_type text not null,
  status text not null default 'in_progress',
  start_idempotency_key text not null,
  submit_idempotency_key text,
  learner_attempt_id uuid references public.learner_attempts (id) on delete restrict,
  writing_submission_id uuid references public.writing_submissions (id) on delete restrict,
  speaking_attempt_id uuid references public.speaking_attempts (id) on delete restrict,
  started_at timestamptz not null,
  expires_at timestamptz not null,
  submitted_at timestamptz,
  submitted_after_time_limit boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mock_test_section_attempts_session_owner_fkey foreign key (session_id, user_id)
    references public.mock_test_sessions (id, user_id) on delete restrict,
  constraint mock_test_section_attempts_session_version_fkey foreign key (session_id, mock_test_version_id)
    references public.mock_test_sessions (id, mock_test_version_id) on delete restrict,
  constraint mock_test_section_attempts_section_version_fkey foreign key (mock_test_version_id, mock_test_section_id)
    references public.mock_test_sections (mock_test_version_id, id) on delete restrict,
  constraint mock_test_section_attempts_session_section_unique unique (session_id, mock_test_section_id),
  constraint mock_test_section_attempts_user_start_key_unique unique (user_id, start_idempotency_key),
  constraint mock_test_section_attempts_user_submit_key_unique unique (user_id, submit_idempotency_key),
  constraint mock_test_section_attempts_learner_attempt_unique unique (learner_attempt_id),
  constraint mock_test_section_attempts_writing_submission_unique unique (writing_submission_id),
  constraint mock_test_section_attempts_speaking_attempt_unique unique (speaking_attempt_id),
  constraint mock_test_section_attempts_type_check check (section_type in ('reading', 'listening', 'writing', 'speaking')),
  constraint mock_test_section_attempts_status_check check (status in ('in_progress', 'submitted', 'skipped')),
  constraint mock_test_section_attempts_start_key_check check (btrim(start_idempotency_key) <> '' and char_length(start_idempotency_key) <= 200),
  constraint mock_test_section_attempts_submit_key_check check (
    submit_idempotency_key is null or (btrim(submit_idempotency_key) <> '' and char_length(submit_idempotency_key) <= 200)
  ),
  constraint mock_test_section_attempts_time_check check (expires_at > started_at),
  constraint mock_test_section_attempts_link_check check (
    (status = 'skipped' and learner_attempt_id is null and writing_submission_id is null and speaking_attempt_id is null)
    or (section_type in ('reading', 'listening') and learner_attempt_id is not null
      and writing_submission_id is null and speaking_attempt_id is null)
    or (section_type = 'writing' and learner_attempt_id is null
      and writing_submission_id is not null and speaking_attempt_id is null)
    or (section_type = 'speaking' and learner_attempt_id is null
      and writing_submission_id is null and speaking_attempt_id is not null)
  ),
  constraint mock_test_section_attempts_state_check check (
    (status = 'in_progress' and submitted_at is null and submit_idempotency_key is null and submitted_after_time_limit is null)
    or (status = 'submitted' and submitted_at is not null and submit_idempotency_key is not null and submitted_after_time_limit is not null)
    or (status = 'skipped' and submitted_at is not null and submit_idempotency_key is not null and submitted_after_time_limit is not null)
  )
);

create index mock_test_section_attempts_user_recent_idx
on public.mock_test_section_attempts (user_id, status, started_at desc);
create index mock_test_section_attempts_session_order_idx
on public.mock_test_section_attempts (session_id, mock_test_section_id);

create table public.mock_test_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique,
  user_id uuid not null,
  mock_test_version_id uuid not null,
  reading_score smallint,
  reading_max_score smallint,
  listening_score smallint,
  listening_max_score smallint,
  writing_submission_id uuid references public.writing_submissions (id) on delete restrict,
  speaking_attempt_id uuid references public.speaking_attempts (id) on delete restrict,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint mock_test_results_session_owner_fkey foreign key (session_id, user_id)
    references public.mock_test_sessions (id, user_id) on delete restrict,
  constraint mock_test_results_session_version_fkey foreign key (session_id, mock_test_version_id)
    references public.mock_test_sessions (id, mock_test_version_id) on delete restrict,
  constraint mock_test_results_reading_score_check check (
    (reading_score is null and reading_max_score is null)
    or (reading_score between 0 and reading_max_score and reading_max_score > 0)
  ),
  constraint mock_test_results_listening_score_check check (
    (listening_score is null and listening_max_score is null)
    or (listening_score between 0 and listening_max_score and listening_max_score > 0)
  )
);

create index mock_test_results_user_recent_idx on public.mock_test_results (user_id, generated_at desc);
create index mock_test_results_version_idx on public.mock_test_results (mock_test_version_id);

create trigger mock_tests_set_updated_at before update on public.mock_tests
for each row execute function public.set_profile_updated_at();
create trigger mock_test_versions_set_updated_at before update on public.mock_test_versions
for each row execute function public.set_profile_updated_at();
create trigger mock_test_sections_set_updated_at before update on public.mock_test_sections
for each row execute function public.set_profile_updated_at();
create trigger mock_test_sessions_set_updated_at before update on public.mock_test_sessions
for each row execute function public.set_profile_updated_at();
create trigger mock_test_section_attempts_set_updated_at before update on public.mock_test_section_attempts
for each row execute function public.set_profile_updated_at();

create function public.validate_mock_test_version_publication()
returns trigger language plpgsql set search_path = '' as $$
declare
  section_count integer;
  invalid_count integer;
  total_seconds integer;
begin
  if new.status <> 'published' or (tg_op = 'UPDATE' and old.status = 'published') then return new; end if;

  select count(*), coalesce(sum(sections.time_limit_seconds), 0)
  into section_count, total_seconds
  from public.mock_test_sections sections
  where sections.mock_test_version_id = new.id;
  if section_count <> 4 then raise exception 'Published mock test requires exactly four sections'; end if;
  if exists (
    select 1 from generate_series(1, 4) expected(position)
    where not exists (
      select 1 from public.mock_test_sections sections
      where sections.mock_test_version_id = new.id and sections.section_order = expected.position
    )
  ) then raise exception 'Mock test section ordering must be contiguous'; end if;
  if exists (
    select 1 from (values ('reading'), ('listening'), ('writing'), ('speaking')) required_types(section_type)
    where not exists (
      select 1 from public.mock_test_sections sections
      where sections.mock_test_version_id = new.id and sections.section_type = required_types.section_type
        and sections.required
    )
  ) then raise exception 'Published mock test requires all four required skill sections'; end if;

  select count(*) into invalid_count
  from public.mock_test_sections sections
  left join public.exercise_set_versions exercise_versions on exercise_versions.id = sections.exercise_set_version_id
  left join public.exercise_sets exercise_sets on exercise_sets.id = exercise_versions.exercise_set_id
  left join public.reading_practice_versions reading on reading.exercise_set_version_id = sections.exercise_set_version_id
  left join public.reading_passage_versions passages on passages.id = reading.reading_passage_version_id
  left join public.reading_passages passage_roots on passage_roots.id = passages.reading_passage_id
  left join public.listening_practice_versions listening on listening.exercise_set_version_id = sections.exercise_set_version_id
  left join public.writing_task_versions writing on writing.id = sections.writing_task_version_id
  left join public.speaking_set_versions speaking on speaking.id = sections.speaking_set_version_id
  where sections.mock_test_version_id = new.id and (
    (sections.section_type = 'reading' and (
      exercise_sets.domain is distinct from 'reading' or exercise_versions.status is distinct from 'published'
      or passages.status is distinct from 'published' or sections.time_limit_seconds is distinct from reading.time_limit_seconds
      or (new.test_type <> 'both' and passage_roots.test_type not in (new.test_type, 'both'))
    ))
    or (sections.section_type = 'listening' and (
      exercise_sets.domain is distinct from 'listening' or exercise_versions.status is distinct from 'published'
      or sections.time_limit_seconds is distinct from listening.time_limit_seconds
      or (new.test_type <> 'both' and listening.test_type not in (new.test_type, 'both'))
    ))
    or (sections.section_type = 'writing' and (
      writing.status is distinct from 'published' or sections.time_limit_seconds is distinct from writing.time_limit_seconds
      or (new.test_type <> 'both' and writing.test_type not in (new.test_type, 'both'))
    ))
    or (sections.section_type = 'speaking' and (
      speaking.status is distinct from 'published'
      or (new.test_type <> 'both' and speaking.test_type not in (new.test_type, 'both'))
    ))
  );
  if invalid_count > 0 then raise exception 'Mock test contains an invalid or incompatible section link'; end if;
  if new.estimated_minutes <> ceil(total_seconds / 60.0)::integer then
    raise exception 'Mock test estimated minutes must equal section time total';
  end if;
  return new;
end; $$;

create trigger validate_mock_test_version_publication
before insert or update of status on public.mock_test_versions
for each row execute function public.validate_mock_test_version_publication();

create function public.protect_mock_test_content()
returns trigger language plpgsql set search_path = '' as $$
declare parent_status text;
begin
  if tg_table_name = 'mock_test_versions' then
    if tg_op = 'DELETE' and old.status in ('published', 'archived') then raise exception 'Published mock test versions cannot be deleted'; end if;
    if tg_op = 'UPDATE' and old.status in ('published', 'archived') then
      if old.mock_test_id is distinct from new.mock_test_id or old.version is distinct from new.version
        or old.title is distinct from new.title or old.description is distinct from new.description
        or old.test_type is distinct from new.test_type or old.difficulty is distinct from new.difficulty
        or old.estimated_minutes is distinct from new.estimated_minutes or old.published_at is distinct from new.published_at
        or not (old.status = 'published' and new.status = 'archived') then
        raise exception 'Published mock test versions are immutable';
      end if;
    end if;
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  select versions.status into parent_status from public.mock_test_versions versions
  where versions.id = coalesce(new.mock_test_version_id, old.mock_test_version_id);
  if parent_status in ('published', 'archived') then raise exception 'Published mock test sections are immutable'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;

create trigger protect_mock_test_version before update or delete on public.mock_test_versions
for each row execute function public.protect_mock_test_content();
create trigger protect_mock_test_section before insert or update or delete on public.mock_test_sections
for each row execute function public.protect_mock_test_content();

create function private.mock_test_version_is_accessible(target_version_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.mock_test_versions versions
    join public.learner_profiles learners on learners.user_id = (select auth.uid())
    where versions.id = target_version_id
      and learners.onboarding_completed_at is not null
      and (
        (versions.status = 'published' and versions.published_at <= now()
          and (versions.test_type = 'both' or versions.test_type = learners.test_type))
        or exists (
          select 1 from public.mock_test_sessions sessions
          where sessions.mock_test_version_id = versions.id and sessions.user_id = (select auth.uid())
        )
      )
  );
$$;

create function private.mock_test_is_accessible(target_test_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.mock_test_versions versions
    where versions.mock_test_id = target_test_id
      and (select private.mock_test_version_is_accessible(versions.id))
  );
$$;

alter table public.mock_tests enable row level security;
alter table public.mock_test_versions enable row level security;
alter table public.mock_test_sections enable row level security;
alter table public.mock_test_sessions enable row level security;
alter table public.mock_test_section_attempts enable row level security;
alter table public.mock_test_results enable row level security;

revoke all on table public.mock_tests, public.mock_test_versions, public.mock_test_sections,
  public.mock_test_sessions, public.mock_test_section_attempts, public.mock_test_results
from public, anon, authenticated;
grant select on table public.mock_tests, public.mock_test_versions, public.mock_test_sections,
  public.mock_test_sessions, public.mock_test_section_attempts, public.mock_test_results
to authenticated;

create policy "Learners can read accessible mock tests" on public.mock_tests
for select to authenticated using ((select private.mock_test_is_accessible(id)));
create policy "Learners can read accessible mock test versions" on public.mock_test_versions
for select to authenticated using ((select private.mock_test_version_is_accessible(id)));
create policy "Learners can read accessible mock test sections" on public.mock_test_sections
for select to authenticated using ((select private.mock_test_version_is_accessible(mock_test_version_id)));
create policy "Learners can read their mock test sessions" on public.mock_test_sessions
for select to authenticated using (user_id = (select auth.uid()));
create policy "Learners can read their mock section attempts" on public.mock_test_section_attempts
for select to authenticated using (user_id = (select auth.uid()));
create policy "Learners can read their mock test results" on public.mock_test_results
for select to authenticated using (user_id = (select auth.uid()));

create function public.start_mock_test(p_mock_test_slug text, p_idempotency_key text)
returns public.mock_test_sessions language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_test public.mock_tests; target_version public.mock_test_versions;
  first_section smallint; result public.mock_test_sessions;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  if p_mock_test_slug is null or p_mock_test_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception using errcode = '22023', message = 'invalid mock test slug';
  end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  select versions.* into target_version
  from public.mock_tests tests
  join public.mock_test_versions versions on versions.mock_test_id = tests.id
  join public.learner_profiles learners on learners.user_id = actor_id
  where tests.slug = p_mock_test_slug and versions.status = 'published' and versions.published_at <= now()
    and learners.onboarding_completed_at is not null
    and (versions.test_type = 'both' or versions.test_type = learners.test_type)
  order by versions.version desc limit 1;
  if target_version.id is null then raise exception using errcode = 'P0002', message = 'mock test not found'; end if;
  select * into target_test from public.mock_tests where id = target_version.mock_test_id;
  select min(section_order) into first_section from public.mock_test_sections where mock_test_version_id = target_version.id;

  select sessions.* into result from public.mock_test_sessions sessions
  where sessions.user_id = actor_id and sessions.start_idempotency_key = p_idempotency_key;
  if found then
    if result.mock_test_id <> target_test.id then raise exception using errcode = '23505', message = 'idempotency key conflict'; end if;
    return result;
  end if;
  select sessions.* into result from public.mock_test_sessions sessions
  where sessions.user_id = actor_id and sessions.mock_test_id = target_test.id
    and sessions.status in ('in_progress', 'submitted') for update;
  if found then return result; end if;
  insert into public.mock_test_sessions (
    user_id, mock_test_id, mock_test_version_id, current_section_order, start_idempotency_key
  ) values (actor_id, target_test.id, target_version.id, first_section, p_idempotency_key)
  returning * into result;
  return result;
end; $$;

create function public.start_mock_test_section(
  p_session_id uuid, p_section_id uuid, p_idempotency_key text
)
returns public.mock_test_section_attempts language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_session public.mock_test_sessions; target_section public.mock_test_sections;
  result public.mock_test_section_attempts; attempt public.learner_attempts;
  submission public.writing_submissions; speaking public.speaking_attempts;
  target_set_id uuid; target_task_id uuid; target_speaking_set_id uuid; target_domain text;
  section_started_at timestamptz := now(); section_expires_at timestamptz;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  select * into target_session from public.mock_test_sessions
  where id = p_session_id and user_id = actor_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'mock session not found'; end if;
  if target_session.status <> 'in_progress' then raise exception using errcode = 'P0001', message = 'mock session is not editable'; end if;
  select * into target_section from public.mock_test_sections
  where id = p_section_id and mock_test_version_id = target_session.mock_test_version_id;
  if not found then raise exception using errcode = 'P0002', message = 'mock section not found'; end if;
  if target_session.current_section_order is distinct from target_section.section_order then
    raise exception using errcode = 'P0001', message = 'mock sections must be completed in order';
  end if;
  select * into result from public.mock_test_section_attempts
  where session_id = target_session.id and mock_test_section_id = target_section.id;
  if found then return result; end if;
  select * into result from public.mock_test_section_attempts
  where user_id = actor_id and start_idempotency_key = p_idempotency_key;
  if found then raise exception using errcode = '23505', message = 'idempotency key conflict'; end if;

  section_expires_at := section_started_at + make_interval(secs => target_section.time_limit_seconds);
  if target_section.section_type in ('reading', 'listening') then
    select versions.exercise_set_id, sets.domain into target_set_id, target_domain
    from public.exercise_set_versions versions join public.exercise_sets sets on sets.id = versions.exercise_set_id
    where versions.id = target_section.exercise_set_version_id;
    select * into attempt from public.learner_attempts
    where user_id = actor_id and exercise_set_id = target_set_id and status = 'in_progress' for update;
    if found and attempt.exercise_set_version_id <> target_section.exercise_set_version_id then
      raise exception using errcode = 'P0001', message = 'finish the existing practice attempt before starting this mock section';
    end if;
    if not found then
      insert into public.learner_attempts (
        user_id, exercise_set_id, exercise_set_version_id, start_idempotency_key,
        started_at, time_limit_seconds, reading_time_limit_seconds, expires_at
      ) values (
        actor_id, target_set_id, target_section.exercise_set_version_id, p_idempotency_key,
        section_started_at, target_section.time_limit_seconds,
        case when target_domain = 'reading' then target_section.time_limit_seconds else null end,
        section_expires_at
      ) returning * into attempt;
    else
      section_started_at := attempt.started_at;
      section_expires_at := attempt.expires_at;
    end if;
  elsif target_section.section_type = 'writing' then
    select writing_task_id into target_task_id from public.writing_task_versions where id = target_section.writing_task_version_id;
    select * into submission from public.writing_submissions
    where user_id = actor_id and writing_task_id = target_task_id and status = 'draft' for update;
    if found and submission.writing_task_version_id <> target_section.writing_task_version_id then
      raise exception using errcode = 'P0001', message = 'finish the existing writing draft before starting this mock section';
    end if;
    if not found then
      insert into public.writing_submissions (
        user_id, writing_task_id, writing_task_version_id, start_idempotency_key,
        started_at, last_saved_at, expires_at
      ) values (
        actor_id, target_task_id, target_section.writing_task_version_id, p_idempotency_key,
        section_started_at, section_started_at, section_expires_at
      ) returning * into submission;
    else
      section_started_at := submission.started_at;
      section_expires_at := submission.expires_at;
    end if;
  else
    select speaking_set_id into target_speaking_set_id from public.speaking_set_versions where id = target_section.speaking_set_version_id;
    select * into speaking from public.speaking_attempts
    where user_id = actor_id and speaking_set_id = target_speaking_set_id and status = 'in_progress' for update;
    if found and speaking.speaking_set_version_id <> target_section.speaking_set_version_id then
      raise exception using errcode = 'P0001', message = 'finish the existing speaking attempt before starting this mock section';
    end if;
    if not found then
      insert into public.speaking_attempts (
        user_id, speaking_set_id, speaking_set_version_id, start_idempotency_key, started_at
      ) values (
        actor_id, target_speaking_set_id, target_section.speaking_set_version_id, p_idempotency_key, section_started_at
      ) returning * into speaking;
    else section_started_at := speaking.started_at; end if;
  end if;

  insert into public.mock_test_section_attempts (
    user_id, session_id, mock_test_version_id, mock_test_section_id, section_type,
    start_idempotency_key, learner_attempt_id, writing_submission_id, speaking_attempt_id,
    started_at, expires_at
  ) values (
    actor_id, target_session.id, target_session.mock_test_version_id, target_section.id, target_section.section_type,
    p_idempotency_key, attempt.id, submission.id, speaking.id, section_started_at, section_expires_at
  ) returning * into result;
  return result;
end; $$;

create function public.submit_mock_test_section(p_section_attempt_id uuid, p_idempotency_key text)
returns public.mock_test_section_attempts language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target public.mock_test_section_attempts; target_session public.mock_test_sessions;
  next_order smallint; submitted_time timestamptz := now(); result public.mock_test_section_attempts;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  select * into target from public.mock_test_section_attempts
  where id = p_section_attempt_id and user_id = actor_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'mock section attempt not found'; end if;
  if target.status = 'submitted' then return target; end if;
  select * into target_session from public.mock_test_sessions
  where id = target.session_id and user_id = actor_id for update;
  if target_session.status <> 'in_progress' then raise exception using errcode = 'P0001', message = 'mock session is not editable'; end if;

  if target.section_type in ('reading', 'listening') then
    perform public.submit_exercise_attempt(target.learner_attempt_id);
  elsif target.section_type = 'writing' then
    perform public.submit_writing_submission(target.writing_submission_id, p_idempotency_key);
  else
    perform public.submit_speaking_attempt(target.speaking_attempt_id, p_idempotency_key);
  end if;
  update public.mock_test_section_attempts set
    status = 'submitted', submit_idempotency_key = p_idempotency_key,
    submitted_at = submitted_time, submitted_after_time_limit = submitted_time > expires_at
  where id = target.id returning * into result;
  select min(sections.section_order) into next_order
  from public.mock_test_sections sections
  where sections.mock_test_version_id = target.mock_test_version_id
    and sections.section_order > target_session.current_section_order;
  update public.mock_test_sessions set current_section_order = next_order where id = target_session.id;
  return result;
end; $$;

create function public.skip_mock_test_section(p_session_id uuid, p_section_id uuid, p_idempotency_key text)
returns public.mock_test_section_attempts language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_session public.mock_test_sessions; target_section public.mock_test_sections;
  next_order smallint; result public.mock_test_section_attempts;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  select * into target_session from public.mock_test_sessions where id = p_session_id and user_id = actor_id for update;
  if not found or target_session.status <> 'in_progress' then raise exception using errcode = 'P0001', message = 'mock session is not editable'; end if;
  select * into target_section from public.mock_test_sections
  where id = p_section_id and mock_test_version_id = target_session.mock_test_version_id;
  if not found or target_section.required or target_session.current_section_order is distinct from target_section.section_order then
    raise exception using errcode = 'P0001', message = 'mock section cannot be skipped';
  end if;
  insert into public.mock_test_section_attempts (
    user_id, session_id, mock_test_version_id, mock_test_section_id, section_type, status,
    start_idempotency_key, submit_idempotency_key, started_at, expires_at, submitted_at, submitted_after_time_limit
  ) values (
    actor_id, target_session.id, target_session.mock_test_version_id, target_section.id, target_section.section_type, 'skipped',
    p_idempotency_key, p_idempotency_key, now(), now() + make_interval(secs => target_section.time_limit_seconds), now(), false
  ) on conflict (session_id, mock_test_section_id) do update set updated_at = now()
  returning * into result;
  select min(section_order) into next_order from public.mock_test_sections
  where mock_test_version_id = target_session.mock_test_version_id and section_order > target_section.section_order;
  update public.mock_test_sessions set current_section_order = next_order where id = target_session.id;
  return result;
end; $$;

create function public.get_mock_test_section_clock(p_section_attempt_id uuid)
returns table (section_attempt_id uuid, started_at timestamptz, expires_at timestamptz, server_now timestamptz, submitted_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select attempts.id, attempts.started_at, attempts.expires_at, now(), attempts.submitted_at
  from public.mock_test_section_attempts attempts
  where attempts.id = p_section_attempt_id and attempts.user_id = (select auth.uid());
$$;

create function public.submit_mock_test(p_session_id uuid, p_idempotency_key text)
returns public.mock_test_sessions language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target public.mock_test_sessions; result public.mock_test_sessions;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  select * into target from public.mock_test_sessions where id = p_session_id and user_id = actor_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'mock session not found'; end if;
  if target.status in ('submitted', 'completed') then return target; end if;
  if target.status <> 'in_progress' then raise exception using errcode = 'P0001', message = 'mock session cannot be submitted'; end if;
  if exists (
    select 1 from public.mock_test_sections sections
    where sections.mock_test_version_id = target.mock_test_version_id and sections.required
      and not exists (
        select 1 from public.mock_test_section_attempts attempts
        where attempts.session_id = target.id and attempts.mock_test_section_id = sections.id and attempts.status = 'submitted'
      )
  ) then raise exception using errcode = 'P0001', message = 'all required mock sections must be submitted'; end if;
  update public.mock_test_sessions set status = 'submitted', submit_idempotency_key = p_idempotency_key,
    submitted_at = now(), current_section_order = null
  where id = target.id returning * into result;
  return result;
end; $$;

create function public.complete_mock_test(p_session_id uuid)
returns public.mock_test_results language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target public.mock_test_sessions; result public.mock_test_results;
  reading_attempt public.learner_attempts; listening_attempt public.learner_attempts;
  writing_id uuid; speaking_id uuid;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  select * into target from public.mock_test_sessions where id = p_session_id and user_id = actor_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'mock session not found'; end if;
  select * into result from public.mock_test_results where session_id = target.id;
  if found then return result; end if;
  if target.status <> 'submitted' then raise exception using errcode = 'P0001', message = 'mock session must be submitted first'; end if;
  select attempts.* into reading_attempt
  from public.mock_test_section_attempts sections join public.learner_attempts attempts on attempts.id = sections.learner_attempt_id
  where sections.session_id = target.id and sections.section_type = 'reading' and sections.status = 'submitted';
  select attempts.* into listening_attempt
  from public.mock_test_section_attempts sections join public.learner_attempts attempts on attempts.id = sections.learner_attempt_id
  where sections.session_id = target.id and sections.section_type = 'listening' and sections.status = 'submitted';
  select sections.writing_submission_id into writing_id from public.mock_test_section_attempts sections
  where sections.session_id = target.id and sections.section_type = 'writing' and sections.status = 'submitted';
  select sections.speaking_attempt_id into speaking_id from public.mock_test_section_attempts sections
  where sections.session_id = target.id and sections.section_type = 'speaking' and sections.status = 'submitted';
  if reading_attempt.status <> 'scored' or listening_attempt.status <> 'scored' or writing_id is null or speaking_id is null then
    raise exception using errcode = 'P0001', message = 'mock section results are not ready';
  end if;
  insert into public.mock_test_results (
    session_id, user_id, mock_test_version_id, reading_score, reading_max_score,
    listening_score, listening_max_score, writing_submission_id, speaking_attempt_id
  ) values (
    target.id, actor_id, target.mock_test_version_id, reading_attempt.score, reading_attempt.max_score,
    listening_attempt.score, listening_attempt.max_score, writing_id, speaking_id
  ) returning * into result;
  update public.mock_test_sessions set status = 'completed', completed_at = now() where id = target.id;
  return result;
end; $$;

revoke all on function public.validate_mock_test_version_publication() from public, anon, authenticated;
revoke all on function public.protect_mock_test_content() from public, anon, authenticated;
revoke all on function private.mock_test_version_is_accessible(uuid) from public, anon, authenticated;
revoke all on function private.mock_test_is_accessible(uuid) from public, anon, authenticated;
grant execute on function private.mock_test_version_is_accessible(uuid) to authenticated;
grant execute on function private.mock_test_is_accessible(uuid) to authenticated;

revoke all on function public.start_mock_test(text, text) from public, anon, authenticated;
revoke all on function public.start_mock_test_section(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.submit_mock_test_section(uuid, text) from public, anon, authenticated;
revoke all on function public.skip_mock_test_section(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.get_mock_test_section_clock(uuid) from public, anon, authenticated;
revoke all on function public.submit_mock_test(uuid, text) from public, anon, authenticated;
revoke all on function public.complete_mock_test(uuid) from public, anon, authenticated;
grant execute on function public.start_mock_test(text, text) to authenticated;
grant execute on function public.start_mock_test_section(uuid, uuid, text) to authenticated;
grant execute on function public.submit_mock_test_section(uuid, text) to authenticated;
grant execute on function public.skip_mock_test_section(uuid, uuid, text) to authenticated;
grant execute on function public.get_mock_test_section_clock(uuid) to authenticated;
grant execute on function public.submit_mock_test(uuid, text) to authenticated;
grant execute on function public.complete_mock_test(uuid) to authenticated;

comment on table public.mock_test_results is
  'Immutable raw-score and submission reference snapshot. Phase 10A deliberately stores no aggregate or official IELTS band.';

insert into public.mock_tests (id, slug, display_order)
values
  ('a1000000-0000-4000-8000-000000000001', 'academic-foundation-mock', 1),
  ('a1000000-0000-4000-8000-000000000002', 'editorial-draft-mock', 2)
on conflict (id) do nothing;

insert into public.mock_test_versions (
  id, mock_test_id, version, title, description, test_type, difficulty,
  estimated_minutes, status, published_at
) values
  (
    'a1100000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 1,
    'Academic foundation mock test',
    'A compact original four-skill mock assembled from the project Reading, Listening, Writing and Speaking foundations.',
    'academic', 'intermediate', 78, 'draft', null
  ),
  (
    'a1100000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 1,
    'Editorial draft mock test',
    'An unpublished fixture used to prove that draft mock tests and their sections remain invisible to learners.',
    'academic', 'intermediate', 78, 'draft', null
  )
on conflict (id) do nothing;

insert into public.mock_test_sections (
  id, mock_test_version_id, section_type, section_order, time_limit_seconds, required,
  exercise_set_version_id, writing_task_version_id, speaking_set_version_id
) values
  ('a1200000-0000-4000-8000-000000000001', 'a1100000-0000-4000-8000-000000000001', 'reading', 1, 1200, true,
    '66000000-0000-4000-8000-000000000101', null, null),
  ('a1200000-0000-4000-8000-000000000002', 'a1100000-0000-4000-8000-000000000001', 'listening', 2, 600, true,
    '77000000-0000-4000-8000-000000000101', null, null),
  ('a1200000-0000-4000-8000-000000000003', 'a1100000-0000-4000-8000-000000000001', 'writing', 3, 2400, true,
    null, '82000000-0000-4000-8000-000000000001', null),
  ('a1200000-0000-4000-8000-000000000004', 'a1100000-0000-4000-8000-000000000001', 'speaking', 4, 480, true,
    null, null, '91100000-0000-4000-8000-000000000001'),
  ('a1200000-0000-4000-8000-000000000011', 'a1100000-0000-4000-8000-000000000002', 'reading', 1, 1200, true,
    '66000000-0000-4000-8000-000000000101', null, null),
  ('a1200000-0000-4000-8000-000000000012', 'a1100000-0000-4000-8000-000000000002', 'listening', 2, 600, true,
    '77000000-0000-4000-8000-000000000101', null, null),
  ('a1200000-0000-4000-8000-000000000013', 'a1100000-0000-4000-8000-000000000002', 'writing', 3, 2400, true,
    null, '82000000-0000-4000-8000-000000000001', null),
  ('a1200000-0000-4000-8000-000000000014', 'a1100000-0000-4000-8000-000000000002', 'speaking', 4, 480, true,
    null, null, '91100000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

update public.mock_test_versions
set status = 'published', published_at = '2026-07-16T00:00:00Z'::timestamptz
where id = 'a1100000-0000-4000-8000-000000000001'::uuid and status = 'draft';

begin;

create index learner_attempts_user_scored_submitted_idx
on public.learner_attempts (user_id, submitted_at desc)
where status = 'scored';

create function public.get_learner_progress_overview()
returns table (
  lesson_total integer,
  lesson_completed integer,
  lesson_in_progress integer,
  lesson_progress_percent numeric,
  active_practice integer,
  active_writing integer,
  active_speaking integer,
  active_mock_tests integer,
  completed_mock_tests integer
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  return query
  with available_lessons as (
    select lessons.id
    from public.learning_modules as modules
    join public.lessons as lessons on lessons.module_id = modules.id
    join public.lesson_versions as versions
      on versions.lesson_id = lessons.id and versions.status = 'published'
    where modules.status = 'published'
  ), lesson_stats as (
    select
      count(*)::integer as total,
      count(*) filter (where progress.status = 'completed')::integer as completed,
      count(*) filter (where progress.status = 'in_progress')::integer as in_progress,
      coalesce(avg(coalesce(progress.progress_percent, 0)), 0)::numeric(5, 2) as progress_percent
    from available_lessons
    left join public.learner_lesson_progress as progress
      on progress.lesson_id = available_lessons.id and progress.user_id = actor_id
  )
  select
    lesson_stats.total,
    lesson_stats.completed,
    lesson_stats.in_progress,
    lesson_stats.progress_percent,
    (select count(*)::integer from public.learner_attempts where user_id = actor_id and status = 'in_progress'),
    (select count(*)::integer from public.writing_submissions where user_id = actor_id and status = 'draft'),
    (select count(*)::integer from public.speaking_attempts where user_id = actor_id and status = 'in_progress'),
    (select count(*)::integer from public.mock_test_sessions where user_id = actor_id and status in ('in_progress', 'submitted')),
    (select count(*)::integer from public.mock_test_sessions where user_id = actor_id and status = 'completed')
  from lesson_stats;
end;
$$;

create function public.get_learner_skill_progress()
returns table (
  skill text,
  activity_count bigint,
  scored_count bigint,
  total_score bigint,
  total_max_score bigint,
  accuracy_percent numeric,
  latest_activity_at timestamptz,
  feedback_status text
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  return query
  with objective_skills(skill) as (
    values ('reading'::text), ('listening'::text), ('vocabulary'::text), ('grammar'::text)
  ), objective_stats as (
    select
      sets.domain as skill,
      count(*)::bigint as activity_count,
      count(*)::bigint as scored_count,
      sum(attempts.score)::bigint as total_score,
      sum(attempts.max_score)::bigint as total_max_score,
      round(100 * sum(attempts.score)::numeric / nullif(sum(attempts.max_score), 0), 1) as accuracy_percent,
      max(attempts.submitted_at) as latest_activity_at
    from public.learner_attempts as attempts
    join public.exercise_sets as sets on sets.id = attempts.exercise_set_id
    where attempts.user_id = actor_id and attempts.status = 'scored'
    group by sets.domain
  ), latest_writing as (
    select submissions.id, submissions.submitted_at
    from public.writing_submissions as submissions
    where submissions.user_id = actor_id and submissions.status = 'submitted'
    order by submissions.submitted_at desc
    limit 1
  ), writing_stats as (
    select count(*)::bigint as activity_count, max(submitted_at) as latest_activity_at
    from public.writing_submissions
    where user_id = actor_id and status = 'submitted'
  ), writing_feedback as (
    select runs.status
    from latest_writing
    join public.writing_feedback_runs as runs on runs.submission_id = latest_writing.id
    where runs.user_id = actor_id
    order by runs.requested_at desc
    limit 1
  ), latest_speaking as (
    select attempts.id, attempts.submitted_at
    from public.speaking_attempts as attempts
    where attempts.user_id = actor_id and attempts.status = 'submitted'
    order by attempts.submitted_at desc
    limit 1
  ), speaking_stats as (
    select count(*)::bigint as activity_count, max(submitted_at) as latest_activity_at
    from public.speaking_attempts
    where user_id = actor_id and status = 'submitted'
  ), speaking_feedback as (
    select runs.status
    from latest_speaking
    join public.speaking_feedback_runs as runs on runs.attempt_id = latest_speaking.id
    where runs.user_id = actor_id
    order by runs.requested_at desc
    limit 1
  )
  select
    objective_skills.skill,
    coalesce(objective_stats.activity_count, 0),
    coalesce(objective_stats.scored_count, 0),
    objective_stats.total_score,
    objective_stats.total_max_score,
    objective_stats.accuracy_percent,
    objective_stats.latest_activity_at,
    null::text
  from objective_skills
  left join objective_stats using (skill)
  union all
  select 'writing', writing_stats.activity_count, 0::bigint, null::bigint, null::bigint,
    null::numeric, writing_stats.latest_activity_at, (select status from writing_feedback)
  from writing_stats
  union all
  select 'speaking', speaking_stats.activity_count, 0::bigint, null::bigint, null::bigint,
    null::numeric, speaking_stats.latest_activity_at, (select status from speaking_feedback)
  from speaking_stats;
end;
$$;

create function public.get_learner_recent_activity(p_limit integer default 8)
returns table (
  activity_type text,
  skill text,
  entity_id uuid,
  title text,
  status text,
  occurred_at timestamptz,
  href text,
  score integer,
  max_score integer,
  feedback_status text
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_limit < 1 or p_limit > 20 then
    raise exception using errcode = '22023', message = 'p_limit must be between 1 and 20';
  end if;

  return query
  with activity as (
    select
      'lesson'::text as activity_type,
      modules.skill,
      progress.lesson_id as entity_id,
      versions.title,
      progress.status,
      progress.last_accessed_at as occurred_at,
      ('/learn/' || modules.slug || '/' || lessons.slug)::text as href,
      null::integer as score,
      null::integer as max_score,
      null::text as feedback_status
    from public.learner_lesson_progress as progress
    join public.lessons as lessons on lessons.id = progress.lesson_id
    join public.learning_modules as modules on modules.id = lessons.module_id
    join public.lesson_versions as versions on versions.id = progress.lesson_version_id
    where progress.user_id = actor_id

    union all

    select
      'practice', sets.domain, attempts.id, versions.title, attempts.status,
      coalesce(attempts.submitted_at, attempts.last_saved_at),
      case when sets.domain in ('reading', 'listening')
        then '/practice/' || sets.domain || '/' || sets.slug || case when attempts.status = 'scored' then '/result/' || attempts.id else '' end
        else '/practice/' || sets.slug || case when attempts.status = 'scored' then '/result/' || attempts.id else '' end
      end,
      attempts.score::integer, attempts.max_score::integer, null::text
    from public.learner_attempts as attempts
    join public.exercise_sets as sets on sets.id = attempts.exercise_set_id
    join public.exercise_set_versions as versions on versions.id = attempts.exercise_set_version_id
    where attempts.user_id = actor_id
      and not exists (
        select 1 from public.mock_test_section_attempts as sections
        where sections.user_id = actor_id and sections.learner_attempt_id = attempts.id
      )

    union all

    select
      'writing', 'writing', submissions.id, versions.title, submissions.status,
      coalesce(submissions.submitted_at, submissions.last_saved_at),
      case when submissions.status = 'submitted'
        then '/practice/writing/' || tasks.slug || '/submission/' || submissions.id
        else '/practice/writing/' || tasks.slug
      end,
      null::integer, null::integer, feedback.status
    from public.writing_submissions as submissions
    join public.writing_tasks as tasks on tasks.id = submissions.writing_task_id
    join public.writing_task_versions as versions on versions.id = submissions.writing_task_version_id
    left join lateral (
      select runs.status
      from public.writing_feedback_runs as runs
      where runs.user_id = actor_id and runs.submission_id = submissions.id
      order by runs.requested_at desc
      limit 1
    ) as feedback on true
    where submissions.user_id = actor_id
      and not exists (
        select 1 from public.mock_test_section_attempts as sections
        where sections.user_id = actor_id and sections.writing_submission_id = submissions.id
      )

    union all

    select
      'speaking', 'speaking', attempts.id, versions.title, attempts.status,
      coalesce(attempts.submitted_at, attempts.started_at),
      '/practice/speaking/' || sets.slug || '/attempt/' || attempts.id,
      null::integer, null::integer, feedback.status
    from public.speaking_attempts as attempts
    join public.speaking_sets as sets on sets.id = attempts.speaking_set_id
    join public.speaking_set_versions as versions on versions.id = attempts.speaking_set_version_id
    left join lateral (
      select runs.status
      from public.speaking_feedback_runs as runs
      where runs.user_id = actor_id and runs.attempt_id = attempts.id
      order by runs.requested_at desc
      limit 1
    ) as feedback on true
    where attempts.user_id = actor_id
      and not exists (
        select 1 from public.mock_test_section_attempts as sections
        where sections.user_id = actor_id and sections.speaking_attempt_id = attempts.id
      )

    union all

    select
      'mock_test', 'mock_test', sessions.id, versions.title, sessions.status,
      coalesce(sessions.completed_at, sessions.submitted_at, sessions.started_at),
      case when sessions.status = 'in_progress'
        then '/mock-tests/' || tests.slug || '/session/' || sessions.id
        else '/mock-tests/' || tests.slug || '/session/' || sessions.id || '/summary'
      end,
      null::integer, null::integer, null::text
    from public.mock_test_sessions as sessions
    join public.mock_tests as tests on tests.id = sessions.mock_test_id
    join public.mock_test_versions as versions on versions.id = sessions.mock_test_version_id
    where sessions.user_id = actor_id
  )
  select activity.activity_type, activity.skill, activity.entity_id, activity.title,
    activity.status, activity.occurred_at, activity.href, activity.score,
    activity.max_score, activity.feedback_status
  from activity
  order by activity.occurred_at desc, activity.entity_id
  limit p_limit;
end;
$$;

create function public.get_learner_mock_test_history(p_limit integer default 8)
returns table (
  session_id uuid,
  mock_test_slug text,
  title text,
  status text,
  started_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  reading_score integer,
  reading_max_score integer,
  listening_score integer,
  listening_max_score integer,
  href text
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_limit < 1 or p_limit > 20 then
    raise exception using errcode = '22023', message = 'p_limit must be between 1 and 20';
  end if;

  return query
  select
    sessions.id,
    tests.slug,
    versions.title,
    sessions.status,
    sessions.started_at,
    sessions.submitted_at,
    sessions.completed_at,
    results.reading_score::integer,
    results.reading_max_score::integer,
    results.listening_score::integer,
    results.listening_max_score::integer,
    case when sessions.status = 'in_progress'
      then '/mock-tests/' || tests.slug || '/session/' || sessions.id
      else '/mock-tests/' || tests.slug || '/session/' || sessions.id || '/summary'
    end
  from public.mock_test_sessions as sessions
  join public.mock_tests as tests on tests.id = sessions.mock_test_id
  join public.mock_test_versions as versions on versions.id = sessions.mock_test_version_id
  left join public.mock_test_results as results
    on results.session_id = sessions.id and results.user_id = actor_id
  where sessions.user_id = actor_id
  order by coalesce(sessions.completed_at, sessions.submitted_at, sessions.started_at) desc, sessions.id
  limit p_limit;
end;
$$;

revoke all on function public.get_learner_progress_overview() from public, anon;
revoke all on function public.get_learner_skill_progress() from public, anon;
revoke all on function public.get_learner_recent_activity(integer) from public, anon;
revoke all on function public.get_learner_mock_test_history(integer) from public, anon;
grant execute on function public.get_learner_progress_overview() to authenticated;
grant execute on function public.get_learner_skill_progress() to authenticated;
grant execute on function public.get_learner_recent_activity(integer) to authenticated;
grant execute on function public.get_learner_mock_test_history(integer) to authenticated;

comment on function public.get_learner_progress_overview() is
  'Owner-scoped lesson and active-work counts derived from persisted learner state.';
comment on function public.get_learner_skill_progress() is
  'Owner-scoped skill evidence. Objective accuracy uses persisted scored attempts; Writing and Speaking never synthesize scores.';
comment on function public.get_learner_recent_activity(integer) is
  'Bounded owner-scoped activity feed. It intentionally excludes answer keys, essays, transcripts and audio paths.';
comment on function public.get_learner_mock_test_history(integer) is
  'Bounded owner-scoped mock history containing only persisted session and raw section score metadata.';

commit;

alter table public.speaking_audio_assets
  add column deleted_at timestamptz,
  add column cleanup_started_at timestamptz;

alter table public.speaking_upload_intents
  add column storage_deleted_at timestamptz;

alter table public.speaking_audio_assets
  alter column retention_until set default (now() + interval '30 days');

update public.speaking_audio_assets
set retention_until = created_at + interval '30 days'
where retention_until is null;

alter table public.speaking_audio_assets
  alter column retention_until set not null,
  drop constraint speaking_audio_assets_status_check,
  add constraint speaking_audio_assets_status_check
    check (status in ('ready', 'orphaned', 'cleanup_pending', 'deleted')),
  add constraint speaking_audio_assets_retention_check
    check (retention_until >= created_at),
  add constraint speaking_audio_assets_deleted_state_check
    check ((status = 'deleted') = (deleted_at is not null)),
  add constraint speaking_audio_assets_cleanup_state_check
    check ((status = 'cleanup_pending') = (cleanup_started_at is not null));

create index speaking_audio_assets_retention_cleanup_idx
on public.speaking_audio_assets (retention_until, id)
where status in ('ready', 'orphaned', 'cleanup_pending');

create index speaking_upload_intents_expired_cleanup_idx
on public.speaking_upload_intents (expires_at, id)
where status = 'expired' and storage_deleted_at is null;

create or replace function public.claim_speaking_audio_cleanup(p_batch_size integer default 100)
returns table (id uuid, storage_path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidates as (
    select assets.id
    from public.speaking_audio_assets assets
    where (
      assets.status = 'orphaned'
      or (assets.status = 'ready' and assets.retention_until <= now())
      or (
        assets.status = 'cleanup_pending'
        and assets.cleanup_started_at <= now() - interval '15 minutes'
      )
    )
    order by assets.retention_until, assets.id
    for update skip locked
    limit least(greatest(p_batch_size, 1), 100)
  )
  update public.speaking_audio_assets assets
  set status = 'cleanup_pending', cleanup_started_at = now()
  from candidates
  where assets.id = candidates.id
  returning assets.id, assets.storage_path;
end;
$$;

create or replace function public.start_speaking_transcript_request(
  p_response_id uuid, p_idempotency_key text, p_consent_version text, p_provider text, p_model text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_response public.speaking_responses; target_attempt public.speaking_attempts;
  target_asset public.speaking_audio_assets; target_run public.speaking_transcript_runs;
  previous_count integer; weekly_used integer; burst_used integer;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if nullif(private.speaking_signing_secret(), '') is null then raise exception 'Speaking AI is not configured'; end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200
    or p_consent_version <> 'speaking-ai-v1' then raise exception 'Invalid transcript request'; end if;
  select * into target_response from public.speaking_responses where id = p_response_id and user_id = actor_id;
  if not found or target_response.submitted_at is null then raise exception 'Only submitted responses can be transcribed'; end if;
  select * into target_attempt from public.speaking_attempts where id = target_response.attempt_id and user_id = actor_id;
  if target_attempt.status <> 'submitted' then raise exception 'Only submitted attempts can be transcribed'; end if;
  select * into target_asset from public.speaking_audio_assets where id = target_response.audio_asset_id and status = 'ready';
  if not found then raise exception 'Verified audio is unavailable'; end if;
  select * into target_run from public.speaking_transcript_runs where user_id = actor_id and request_idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('runId', target_run.id, 'bucketId', target_asset.bucket_id, 'storagePath', target_asset.storage_path); end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor_id::text || ':speaking-transcript', 0));
  select count(*) into previous_count from public.speaking_transcript_runs where response_id = target_response.id;
  if previous_count >= 2 then raise exception 'Transcript retry limit reached'; end if;
  select count(*) into weekly_used from public.speaking_transcript_runs
  where user_id = actor_id and requested_at >= now() - interval '7 days';
  if weekly_used >= 20 then raise exception 'Speaking transcript weekly quota reached'; end if;
  select count(*) into burst_used from public.speaking_transcript_runs
  where user_id = actor_id and requested_at >= now() - interval '1 minute';
  if burst_used >= 5 then raise exception 'Speaking transcript rate limit reached'; end if;
  update public.speaking_transcript_runs set status = 'failed', completed_at = now(), error_code = 'lease_expired'
  where response_id = target_response.id and status = 'pending' and lease_expires_at <= now();
  if exists (select 1 from public.speaking_transcript_runs where response_id = target_response.id and status in ('pending', 'ready')) then
    raise exception 'Transcript already exists or is being prepared';
  end if;
  insert into public.speaking_transcript_runs (
    user_id, response_id, provider, model, request_idempotency_key, audio_checksum,
    consent_version, attempt_number, lease_expires_at
  ) values (actor_id, target_response.id, left(p_provider, 80), left(p_model, 120), p_idempotency_key,
    target_asset.sha256_checksum, p_consent_version, previous_count + 1, now() + interval '2 minutes')
  returning * into target_run;
  return jsonb_build_object('runId', target_run.id, 'bucketId', target_asset.bucket_id, 'storagePath', target_asset.storage_path);
end; $$;

create or replace function public.start_speaking_feedback_request(
  p_attempt_id uuid, p_idempotency_key text, p_consent_version text, p_provider text, p_model text,
  p_transcript_bundle_checksum text
) returns public.speaking_feedback_runs language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid(); target_attempt public.speaking_attempts; target_run public.speaking_feedback_runs;
  previous_count integer; weekly_used integer; burst_used integer;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if nullif(private.speaking_signing_secret(), '') is null then raise exception 'Speaking AI is not configured'; end if;
  if p_consent_version <> 'speaking-ai-v1' or p_transcript_bundle_checksum !~ '^[0-9a-f]{64}$'
    or p_idempotency_key is null or btrim(p_idempotency_key) = '' or char_length(p_idempotency_key) > 200 then
    raise exception 'Invalid feedback request';
  end if;
  select * into target_attempt from public.speaking_attempts where id = p_attempt_id and user_id = actor_id;
  if not found or target_attempt.status <> 'submitted' then raise exception 'Only submitted attempts can receive feedback'; end if;
  if exists (
    select 1 from public.speaking_responses responses where responses.attempt_id = target_attempt.id
    and not exists (select 1 from public.speaking_transcripts transcripts where transcripts.response_id = responses.id)
  ) then raise exception 'Transcripts are not ready for every response'; end if;
  select * into target_run from public.speaking_feedback_runs where user_id = actor_id and request_idempotency_key = p_idempotency_key;
  if found then return target_run; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor_id::text || ':speaking-feedback', 0));
  select count(*) into previous_count from public.speaking_feedback_runs where attempt_id = target_attempt.id;
  if previous_count >= 2 then raise exception 'Feedback retry limit reached'; end if;
  select count(*) into weekly_used from public.speaking_feedback_runs
  where user_id = actor_id and requested_at >= now() - interval '7 days';
  if weekly_used >= 5 then raise exception 'Speaking feedback weekly quota reached'; end if;
  select count(*) into burst_used from public.speaking_feedback_runs
  where user_id = actor_id and requested_at >= now() - interval '1 minute';
  if burst_used >= 2 then raise exception 'Speaking feedback rate limit reached'; end if;
  update public.speaking_feedback_runs set status = 'failed', completed_at = now(), error_code = 'lease_expired'
  where attempt_id = target_attempt.id and status = 'pending' and lease_expires_at <= now();
  if exists (select 1 from public.speaking_feedback_runs where attempt_id = target_attempt.id and status in ('pending', 'ready')) then
    raise exception 'Feedback already exists or is being prepared';
  end if;
  insert into public.speaking_feedback_runs (
    user_id, attempt_id, provider, model, request_idempotency_key, transcript_bundle_checksum,
    rubric_version, prompt_version, consent_version, attempt_number, lease_expires_at
  ) values (actor_id, target_attempt.id, left(p_provider, 80), left(p_model, 120), p_idempotency_key,
    p_transcript_bundle_checksum, 'speaking-practice-v1', 'speaking-feedback-v1', p_consent_version,
    previous_count + 1, now() + interval '2 minutes') returning * into target_run;
  return target_run;
end; $$;

revoke all on function public.start_speaking_transcript_request(uuid, text, text, text, text),
  public.start_speaking_feedback_request(uuid, text, text, text, text, text),
  public.claim_speaking_audio_cleanup(integer) from public, anon, authenticated;
grant execute on function public.start_speaking_transcript_request(uuid, text, text, text, text),
  public.start_speaking_feedback_request(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.claim_speaking_audio_cleanup(integer) to service_role;

comment on column public.speaking_audio_assets.retention_until is
  'Private recording deletion deadline. Production cleanup removes the Storage object before marking metadata deleted.';
comment on column public.speaking_audio_assets.deleted_at is
  'Timestamp set only after the private Storage object has been removed by the authenticated cleanup job.';
comment on column public.speaking_audio_assets.cleanup_started_at is
  'Server-only cleanup lease timestamp. Stale leases become retryable after 15 minutes.';
comment on column public.speaking_upload_intents.storage_deleted_at is
  'Timestamp set after an expired upload path has been removed from private Storage.';

-- Phase 10C follow-up: platform-created RLS event-trigger helpers are not API RPCs.
-- Some hosted projects contain this helper while a clean local stack does not,
-- so keep the forward migration portable across both environments.
do $migration$
begin
  if pg_catalog.to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end
$migration$;

begin;

create table public.placement_tests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint placement_tests_publish_integrity check (
    (status = 'published' and published_at is not null)
    or (status <> 'published')
  )
);

create table public.placement_questions (
  id uuid primary key default gen_random_uuid(),
  placement_test_id uuid not null references public.placement_tests (id) on delete cascade,
  position smallint not null check (position between 1 and 100),
  skill text not null check (skill in ('grammar', 'vocabulary', 'reading')),
  prompt text not null,
  options jsonb not null,
  correct_option_id text not null,
  created_at timestamptz not null default now(),
  unique (placement_test_id, position),
  constraint placement_questions_options_shape check (
    jsonb_typeof(options) = 'array'
    and jsonb_array_length(options) between 2 and 6
  )
);

create table public.placement_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  placement_test_id uuid not null references public.placement_tests (id),
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  answers jsonb not null default '{}'::jsonb,
  score smallint,
  max_score smallint,
  recommended_level text,
  start_idempotency_key uuid not null,
  submit_idempotency_key uuid,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, start_idempotency_key),
  constraint placement_attempts_answers_shape check (jsonb_typeof(answers) = 'object'),
  constraint placement_attempts_result_integrity check (
    (status = 'in_progress' and score is null and max_score is null
      and recommended_level is null and submitted_at is null)
    or
    (status = 'submitted' and score is not null and max_score is not null
      and score between 0 and max_score
      and recommended_level in ('A1', 'A2', 'B1')
      and submitted_at is not null and submit_idempotency_key is not null)
  )
);

create index placement_attempts_user_recent_idx
on public.placement_attempts (user_id, started_at desc);

create index placement_questions_test_position_idx
on public.placement_questions (placement_test_id, position);

alter table public.placement_tests enable row level security;
alter table public.placement_questions enable row level security;
alter table public.placement_attempts enable row level security;

revoke all on table public.placement_tests from public, anon, authenticated;
revoke all on table public.placement_questions from public, anon, authenticated;
revoke all on table public.placement_attempts from public, anon, authenticated;
grant select on table public.placement_attempts to authenticated;

create policy "Learners can read their own placement attempts"
on public.placement_attempts
for select
to authenticated
using ((select auth.uid()) = user_id);

create trigger set_placement_tests_updated_at
before update on public.placement_tests
for each row execute function public.set_profile_updated_at();

create trigger set_placement_attempts_updated_at
before update on public.placement_attempts
for each row execute function public.set_profile_updated_at();

create function public.get_active_placement_test(p_slug text default 'english-foundation')
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', tests.id,
    'slug', tests.slug,
    'title', tests.title,
    'version', tests.version,
    'questions', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', questions.id,
          'position', questions.position,
          'skill', questions.skill,
          'prompt', questions.prompt,
          'options', questions.options
        ) order by questions.position
      ) filter (where questions.id is not null),
      '[]'::jsonb
    )
  )
  from public.placement_tests as tests
  left join public.placement_questions as questions
    on questions.placement_test_id = tests.id
  where tests.slug = p_slug
    and tests.status = 'published'
  group by tests.id;
$$;

create function public.start_placement_attempt(
  p_slug text,
  p_idempotency_key uuid
)
returns public.placement_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  selected_test_id uuid;
  attempt public.placement_attempts;
begin
  if actor_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;

  select tests.id into selected_test_id
  from public.placement_tests as tests
  where tests.slug = p_slug and tests.status = 'published';

  if selected_test_id is null then
    raise exception using errcode = 'P0002', message = 'placement test not found';
  end if;

  insert into public.placement_attempts (
    user_id, placement_test_id, start_idempotency_key
  ) values (
    actor_id, selected_test_id, p_idempotency_key
  )
  on conflict (user_id, start_idempotency_key) do update
    set start_idempotency_key = excluded.start_idempotency_key
  returning * into attempt;

  return attempt;
end;
$$;

create function public.submit_placement_attempt(
  p_attempt_id uuid,
  p_answers jsonb,
  p_idempotency_key uuid
)
returns public.placement_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  attempt public.placement_attempts;
  correct_count integer;
  question_count integer;
  result_level text;
begin
  if actor_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;

  if jsonb_typeof(p_answers) <> 'object' then
    raise exception using errcode = '22023', message = 'answers must be an object';
  end if;

  select attempts.* into attempt
  from public.placement_attempts as attempts
  where attempts.id = p_attempt_id and attempts.user_id = actor_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'placement attempt not found';
  end if;

  if attempt.status = 'submitted' then
    if attempt.submit_idempotency_key = p_idempotency_key then
      return attempt;
    end if;
    raise exception using errcode = '55000', message = 'placement attempt already submitted';
  end if;

  select count(*)::integer into question_count
  from public.placement_questions as questions
  where questions.placement_test_id = attempt.placement_test_id;

  if question_count = 0 or jsonb_object_length(p_answers) <> question_count then
    raise exception using errcode = '23514', message = 'all placement questions must be answered';
  end if;

  select count(*)::integer into correct_count
  from public.placement_questions as questions
  where questions.placement_test_id = attempt.placement_test_id
    and p_answers ->> questions.id::text = questions.correct_option_id;

  result_level := case
    when correct_count <= 2 then 'A1'
    when correct_count <= 4 then 'A2'
    else 'B1'
  end;

  update public.placement_attempts
  set
    status = 'submitted',
    answers = p_answers,
    score = correct_count,
    max_score = question_count,
    recommended_level = result_level,
    submit_idempotency_key = p_idempotency_key,
    submitted_at = now()
  where id = attempt.id
  returning * into attempt;

  update public.learner_profiles
  set current_band = case result_level when 'A1' then 2.5 when 'A2' then 3.5 else 4.5 end
  where user_id = actor_id and onboarding_completed_at is null;

  return attempt;
end;
$$;

revoke all on function public.get_active_placement_test(text) from public, anon, authenticated;
revoke all on function public.start_placement_attempt(text, uuid) from public, anon, authenticated;
revoke all on function public.submit_placement_attempt(uuid, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.get_active_placement_test(text) to authenticated;
grant execute on function public.start_placement_attempt(text, uuid) to authenticated;
grant execute on function public.submit_placement_attempt(uuid, jsonb, uuid) to authenticated;

with inserted_test as (
  insert into public.placement_tests (slug, title, version, status, published_at)
  values ('english-foundation', 'English Foundation Placement Test', 1, 'published', now())
  returning id
)
insert into public.placement_questions (
  placement_test_id, position, skill, prompt, options, correct_option_id
)
select inserted_test.id, question_seed.position, question_seed.skill, question_seed.prompt,
  question_seed.options::jsonb, question_seed.correct_option_id
from inserted_test
cross join (values
  (1, 'grammar', 'She ___ a student.', '[{"id":"am","label":"am"},{"id":"is","label":"is"},{"id":"are","label":"are"},{"id":"be","label":"be"}]', 'is'),
  (2, 'vocabulary', 'Choose the plural form of “child”.', '[{"id":"childs","label":"childs"},{"id":"children","label":"children"},{"id":"childes","label":"childes"}]', 'children'),
  (3, 'grammar', 'We usually study English ___ the evening.', '[{"id":"at","label":"at"},{"id":"on","label":"on"},{"id":"in","label":"in"}]', 'in'),
  (4, 'grammar', 'Yesterday, they ___ to the library.', '[{"id":"go","label":"go"},{"id":"went","label":"went"},{"id":"gone","label":"gone"}]', 'went'),
  (5, 'grammar', 'This exercise is ___ than the previous one.', '[{"id":"easy","label":"easy"},{"id":"easier","label":"easier"},{"id":"easiest","label":"easiest"}]', 'easier')
) as question_seed(position, skill, prompt, options, correct_option_id);

commit;

begin;

create or replace function public.submit_placement_attempt(
  p_attempt_id uuid,
  p_answers jsonb,
  p_idempotency_key uuid
)
returns public.placement_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  attempt public.placement_attempts;
  answer_count integer;
  correct_count integer;
  question_count integer;
  result_level text;
begin
  if actor_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;

  if jsonb_typeof(p_answers) <> 'object' then
    raise exception using errcode = '22023', message = 'answers must be an object';
  end if;

  select attempts.* into attempt
  from public.placement_attempts as attempts
  where attempts.id = p_attempt_id and attempts.user_id = actor_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'placement attempt not found';
  end if;

  if attempt.status = 'submitted' then
    if attempt.submit_idempotency_key = p_idempotency_key then
      return attempt;
    end if;
    raise exception using errcode = '55000', message = 'placement attempt already submitted';
  end if;

  select count(*)::integer into question_count
  from public.placement_questions as questions
  where questions.placement_test_id = attempt.placement_test_id;

  select count(*)::integer into answer_count
  from jsonb_object_keys(p_answers);

  if question_count = 0 or answer_count <> question_count then
    raise exception using errcode = '23514', message = 'all placement questions must be answered';
  end if;

  select count(*)::integer into correct_count
  from public.placement_questions as questions
  where questions.placement_test_id = attempt.placement_test_id
    and p_answers ->> questions.id::text = questions.correct_option_id;

  result_level := case
    when correct_count <= 2 then 'A1'
    when correct_count <= 4 then 'A2'
    else 'B1'
  end;

  update public.placement_attempts
  set
    status = 'submitted',
    answers = p_answers,
    score = correct_count,
    max_score = question_count,
    recommended_level = result_level,
    submit_idempotency_key = p_idempotency_key,
    submitted_at = now()
  where id = attempt.id
  returning * into attempt;

  update public.learner_profiles
  set current_band = case result_level when 'A1' then 2.5 when 'A2' then 3.5 else 4.5 end
  where user_id = actor_id and onboarding_completed_at is null;

  return attempt;
end;
$$;

revoke all on function public.submit_placement_attempt(uuid, jsonb, uuid)
from public, anon, authenticated;
grant execute on function public.submit_placement_attempt(uuid, jsonb, uuid)
to authenticated;

commit;

create table public.learner_vocabulary_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  vocabulary_entry_id uuid not null references public.vocabulary_entries (id) on delete cascade,
  familiarity text not null default 'learning',
  review_count integer not null default 0,
  last_reviewed_at timestamptz not null default now(),
  next_review_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, vocabulary_entry_id),
  constraint learner_vocabulary_progress_familiarity_check
    check (familiarity in ('again', 'learning', 'mastered')),
  constraint learner_vocabulary_progress_review_count_check
    check (review_count between 0 and 1000000)
);

create index learner_vocabulary_progress_due_idx
  on public.learner_vocabulary_progress (user_id, next_review_at);

alter table public.learner_vocabulary_progress enable row level security;

create policy learner_vocabulary_progress_select_own
  on public.learner_vocabulary_progress
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create function public.record_vocabulary_review(
  p_vocabulary_entry_id uuid,
  p_familiarity text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  due_at timestamptz;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_familiarity not in ('again', 'learning', 'mastered') then
    raise exception using errcode = '22023', message = 'invalid vocabulary familiarity';
  end if;
  if not exists (
    select 1 from public.vocabulary_entries where id = p_vocabulary_entry_id
  ) then
    raise exception using errcode = 'P0002', message = 'vocabulary entry not found';
  end if;

  due_at := case p_familiarity
    when 'again' then now() + interval '10 minutes'
    when 'learning' then now() + interval '1 day'
    else now() + interval '7 days'
  end;

  insert into public.learner_vocabulary_progress (
    user_id, vocabulary_entry_id, familiarity, review_count,
    last_reviewed_at, next_review_at
  ) values (
    actor_id, p_vocabulary_entry_id, p_familiarity, 1, now(), due_at
  )
  on conflict (user_id, vocabulary_entry_id) do update set
    familiarity = excluded.familiarity,
    review_count = public.learner_vocabulary_progress.review_count + 1,
    last_reviewed_at = excluded.last_reviewed_at,
    next_review_at = excluded.next_review_at,
    updated_at = now();
end;
$$;

create function public.get_vocabulary_progress_summary()
returns table (
  reviewing bigint,
  mastered bigint,
  reviewed_today bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(*) filter (where familiarity in ('again', 'learning')) as reviewing,
    count(*) filter (where familiarity = 'mastered') as mastered,
    count(*) filter (where last_reviewed_at >= date_trunc('day', now())) as reviewed_today
  from public.learner_vocabulary_progress
  where user_id = (select auth.uid());
$$;

revoke all on table public.learner_vocabulary_progress from public, anon, authenticated;
grant select on table public.learner_vocabulary_progress to authenticated;
revoke all on function public.record_vocabulary_review(uuid, text) from public, anon;
grant execute on function public.record_vocabulary_review(uuid, text) to authenticated;
revoke all on function public.get_vocabulary_progress_summary() from public, anon;
grant execute on function public.get_vocabulary_progress_summary() to authenticated;

comment on function public.record_vocabulary_review(uuid, text) is
  'Records an authenticated learner vocabulary rating and schedules the next review.';

create function public.check_exercise_answer(p_attempt_id uuid, p_question_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  target_attempt public.learner_attempts;
  target_question public.exercise_questions;
  target_answer public.learner_answers;
  answer_key private.exercise_answer_keys;
  review_allowed boolean;
  answer_correct boolean := false;
  selected_count integer;
  correct_count integer;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'authentication required'; end if;
  select attempts.* into target_attempt from public.learner_attempts as attempts
  where attempts.id = p_attempt_id and attempts.user_id = actor_id;
  if not found then raise exception using errcode = 'P0002', message = 'attempt not found'; end if;
  if target_attempt.status <> 'in_progress' then raise exception using errcode = '55000', message = 'attempt is not in progress'; end if;

  select questions.* into target_question from public.exercise_questions as questions
  where questions.id = p_question_id and questions.exercise_set_version_id = target_attempt.exercise_set_version_id;
  if not found then raise exception using errcode = 'P0002', message = 'question not found'; end if;
  select answers.* into target_answer from public.learner_answers as answers
  where answers.attempt_id = target_attempt.id and answers.question_id = target_question.id;
  if not found then raise exception using errcode = 'P0002', message = 'answer not found'; end if;
  select keys.* into answer_key from private.exercise_answer_keys as keys where keys.question_id = target_question.id;

  if target_question.question_type in ('single_choice', 'true_false', 'multiple_choice') then
    select count(*)::integer into selected_count from public.learner_answer_options as selections where selections.answer_id = target_answer.id;
    select count(*)::integer into correct_count from private.exercise_correct_options as expected where expected.question_id = target_question.id;
    answer_correct := selected_count = correct_count and not exists (
      select 1 from public.learner_answer_options as selections
      where selections.answer_id = target_answer.id and not exists (
        select 1 from private.exercise_correct_options as expected
        where expected.question_id = target_question.id and expected.option_id = selections.option_id
      )
    );
  else
    answer_correct := exists (
      select 1 from private.exercise_correct_text_answers as expected
      where expected.question_id = target_question.id
        and expected.normalized_answer = private.normalize_exact_answer(target_answer.answer_text, answer_key.case_sensitive)
    );
  end if;

  select versions.allow_review into review_allowed from public.exercise_set_versions as versions
  where versions.id = target_attempt.exercise_set_version_id;
  return jsonb_build_object(
    'questionId', target_question.id,
    'isCorrect', answer_correct,
    'correctOptionIds', case when review_allowed then coalesce((select jsonb_agg(expected.option_id order by expected.option_id) from private.exercise_correct_options as expected where expected.question_id = target_question.id), '[]'::jsonb) else null end,
    'acceptedTextAnswers', case when review_allowed then coalesce((select jsonb_agg(expected.answer_text order by expected.answer_text) from private.exercise_correct_text_answers as expected where expected.question_id = target_question.id), '[]'::jsonb) else null end,
    'explanationMarkdown', case when review_allowed then answer_key.explanation_markdown else null end
  );
end;
$$;

revoke all on function public.check_exercise_answer(uuid, uuid) from public, anon;
grant execute on function public.check_exercise_answer(uuid, uuid) to authenticated;
comment on function public.check_exercise_answer(uuid, uuid) is
  'Returns authenticated per-question learning feedback without finalizing the attempt.';

begin;

alter table public.placement_attempts
  add column if not exists current_position smallint not null default 1,
  add column if not exists revision bigint not null default 0;

alter table public.placement_attempts
  add constraint placement_attempts_current_position_check
    check (current_position between 1 and 100),
  add constraint placement_attempts_revision_check
    check (revision >= 0);

create index if not exists placement_attempts_active_resume_idx
on public.placement_attempts (user_id, placement_test_id, updated_at desc, id desc)
where status = 'in_progress';

create or replace function public.start_placement_attempt(
  p_slug text,
  p_idempotency_key uuid
)
returns public.placement_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  selected_test_id uuid;
  attempt public.placement_attempts;
begin
  if actor_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;

  select tests.id into selected_test_id
  from public.placement_tests as tests
  where tests.slug = p_slug and tests.status = 'published';
  if selected_test_id is null then
    raise exception using errcode = 'P0002', message = 'placement test not found';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(actor_id::text || ':' || selected_test_id::text, 0)
  );

  select attempts.* into attempt
  from public.placement_attempts as attempts
  where attempts.user_id = actor_id
    and attempts.placement_test_id = selected_test_id
    and attempts.status = 'in_progress'
  order by attempts.updated_at desc, attempts.id desc
  limit 1
  for update;
  if found then return attempt; end if;

  insert into public.placement_attempts (
    user_id, placement_test_id, start_idempotency_key, current_position, revision
  ) values (
    actor_id, selected_test_id, p_idempotency_key, 1, 0
  )
  returning * into attempt;
  return attempt;
end;
$$;

create function public.save_placement_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_option_id text,
  p_current_position integer,
  p_expected_revision bigint
)
returns public.placement_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  attempt public.placement_attempts;
  question public.placement_questions;
  question_count integer;
begin
  if actor_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;

  select attempts.* into attempt
  from public.placement_attempts as attempts
  where attempts.id = p_attempt_id and attempts.user_id = actor_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'placement attempt not found';
  end if;
  if attempt.status <> 'in_progress' then
    raise exception using errcode = '55000', message = 'placement attempt is not active';
  end if;
  if attempt.revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'placement attempt revision conflict';
  end if;

  select questions.* into question
  from public.placement_questions as questions
  where questions.id = p_question_id
    and questions.placement_test_id = attempt.placement_test_id;
  if not found or not exists (
    select 1 from jsonb_array_elements(question.options) as option
    where option ->> 'id' = p_option_id
  ) then
    raise exception using errcode = '22023', message = 'invalid placement answer';
  end if;

  select count(*)::integer into question_count
  from public.placement_questions as questions
  where questions.placement_test_id = attempt.placement_test_id;
  if p_current_position < 1 or p_current_position > question_count then
    raise exception using errcode = '22023', message = 'invalid placement position';
  end if;

  update public.placement_attempts
  set answers = jsonb_set(answers, array[p_question_id::text], to_jsonb(p_option_id), true),
      current_position = p_current_position,
      revision = revision + 1
  where id = attempt.id
  returning * into attempt;
  return attempt;
end;
$$;

create function public.update_placement_position(
  p_attempt_id uuid,
  p_current_position integer,
  p_expected_revision bigint
)
returns public.placement_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  attempt public.placement_attempts;
  question_count integer;
begin
  if actor_id is null then raise exception using errcode = '28000', message = 'authentication required'; end if;
  select attempts.* into attempt from public.placement_attempts as attempts
  where attempts.id = p_attempt_id and attempts.user_id = actor_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'placement attempt not found'; end if;
  if attempt.status <> 'in_progress' then raise exception using errcode = '55000', message = 'placement attempt is not active'; end if;
  if attempt.revision <> p_expected_revision then raise exception using errcode = '40001', message = 'placement attempt revision conflict'; end if;
  select count(*)::integer into question_count from public.placement_questions
  where placement_test_id = attempt.placement_test_id;
  if p_current_position < 1 or p_current_position > question_count then
    raise exception using errcode = '22023', message = 'invalid placement position';
  end if;
  update public.placement_attempts set current_position = p_current_position, revision = revision + 1
  where id = attempt.id returning * into attempt;
  return attempt;
end;
$$;

create or replace function public.submit_placement_attempt(
  p_attempt_id uuid,
  p_answers jsonb,
  p_idempotency_key uuid
)
returns public.placement_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  attempt public.placement_attempts;
  correct_count integer;
  question_count integer;
  result_level text;
begin
  if actor_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;
  if jsonb_typeof(p_answers) <> 'object' then
    raise exception using errcode = '22023', message = 'answers must be an object';
  end if;

  select attempts.* into attempt
  from public.placement_attempts as attempts
  where attempts.id = p_attempt_id and attempts.user_id = actor_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'placement attempt not found';
  end if;

  if attempt.status = 'submitted' then
    if attempt.submit_idempotency_key = p_idempotency_key
      and attempt.answers = p_answers then
      return attempt;
    end if;
    if attempt.submit_idempotency_key = p_idempotency_key then
      raise exception using errcode = '22023', message = 'idempotency key payload mismatch';
    end if;
    raise exception using errcode = '55000', message = 'placement attempt already submitted';
  end if;

  select count(*)::integer into question_count
  from public.placement_questions as questions
  where questions.placement_test_id = attempt.placement_test_id;
  if question_count = 0 or jsonb_object_length(attempt.answers) <> question_count then
    raise exception using errcode = '23514', message = 'all placement questions must be autosaved';
  end if;
  if attempt.answers <> p_answers then
    raise exception using errcode = '40001', message = 'placement answers are not fully saved';
  end if;

  select count(*)::integer into correct_count
  from public.placement_questions as questions
  where questions.placement_test_id = attempt.placement_test_id
    and attempt.answers ->> questions.id::text = questions.correct_option_id;
  result_level := case
    when correct_count <= 2 then 'A1'
    when correct_count <= 4 then 'A2'
    else 'B1'
  end;

  update public.placement_attempts
  set status = 'submitted',
      score = correct_count,
      max_score = question_count,
      recommended_level = result_level,
      submit_idempotency_key = p_idempotency_key,
      submitted_at = now()
  where id = attempt.id
  returning * into attempt;

  update public.learner_profiles
  set current_band = case result_level when 'A1' then 2.5 when 'A2' then 3.5 else 4.5 end
  where user_id = actor_id and onboarding_completed_at is null;
  return attempt;
end;
$$;

revoke all on function public.save_placement_answer(uuid, uuid, text, integer, bigint)
from public, anon, authenticated;
grant execute on function public.save_placement_answer(uuid, uuid, text, integer, bigint)
to authenticated;
revoke all on function public.update_placement_position(uuid, integer, bigint)
from public, anon, authenticated;
grant execute on function public.update_placement_position(uuid, integer, bigint)
to authenticated;

commit;

begin;

create or replace function public.submit_placement_attempt(
  p_attempt_id uuid,
  p_answers jsonb,
  p_idempotency_key uuid
)
returns public.placement_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  attempt public.placement_attempts;
  answer_count integer;
  correct_count integer;
  question_count integer;
  result_level text;
begin
  if actor_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;
  if jsonb_typeof(p_answers) <> 'object' then
    raise exception using errcode = '22023', message = 'answers must be an object';
  end if;

  select attempts.* into attempt
  from public.placement_attempts as attempts
  where attempts.id = p_attempt_id and attempts.user_id = actor_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'placement attempt not found';
  end if;

  if attempt.status = 'submitted' then
    if attempt.submit_idempotency_key = p_idempotency_key
      and attempt.answers = p_answers then
      return attempt;
    end if;
    if attempt.submit_idempotency_key = p_idempotency_key then
      raise exception using errcode = '22023', message = 'idempotency key payload mismatch';
    end if;
    raise exception using errcode = '55000', message = 'placement attempt already submitted';
  end if;

  select count(*)::integer into question_count
  from public.placement_questions as questions
  where questions.placement_test_id = attempt.placement_test_id;
  select count(*)::integer into answer_count
  from pg_catalog.jsonb_object_keys(attempt.answers);
  if question_count = 0 or answer_count <> question_count then
    raise exception using errcode = '23514', message = 'all placement questions must be autosaved';
  end if;
  if attempt.answers <> p_answers then
    raise exception using errcode = '40001', message = 'placement answers are not fully saved';
  end if;

  select count(*)::integer into correct_count
  from public.placement_questions as questions
  where questions.placement_test_id = attempt.placement_test_id
    and attempt.answers ->> questions.id::text = questions.correct_option_id;
  result_level := case
    when correct_count <= 2 then 'A1'
    when correct_count <= 4 then 'A2'
    else 'B1'
  end;

  update public.placement_attempts
  set status = 'submitted',
      score = correct_count,
      max_score = question_count,
      recommended_level = result_level,
      submit_idempotency_key = p_idempotency_key,
      submitted_at = now()
  where id = attempt.id
  returning * into attempt;

  update public.learner_profiles
  set current_band = case result_level when 'A1' then 2.5 when 'A2' then 3.5 else 4.5 end
  where user_id = actor_id and onboarding_completed_at is null;
  return attempt;
end;
$$;

commit;

begin;

create or replace function public.save_placement_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_option_id text,
  p_current_position integer,
  p_expected_revision bigint
)
returns public.placement_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  attempt public.placement_attempts;
  question public.placement_questions;
  question_count integer;
begin
  if actor_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;

  select attempts.* into attempt
  from public.placement_attempts as attempts
  where attempts.id = p_attempt_id and attempts.user_id = actor_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'placement attempt not found';
  end if;
  if attempt.status <> 'in_progress' then
    raise exception using errcode = '55000', message = 'placement attempt is not active';
  end if;
  if attempt.revision <> p_expected_revision then
    raise exception using errcode = 'PT409', message = 'placement attempt revision conflict';
  end if;

  select questions.* into question
  from public.placement_questions as questions
  where questions.id = p_question_id
    and questions.placement_test_id = attempt.placement_test_id;
  if not found or not exists (
    select 1 from pg_catalog.jsonb_array_elements(question.options) as option
    where option ->> 'id' = p_option_id
  ) then
    raise exception using errcode = '22023', message = 'invalid placement answer';
  end if;

  select count(*)::integer into question_count
  from public.placement_questions as questions
  where questions.placement_test_id = attempt.placement_test_id;
  if p_current_position < 1 or p_current_position > question_count then
    raise exception using errcode = '22023', message = 'invalid placement position';
  end if;

  update public.placement_attempts
  set answers = pg_catalog.jsonb_set(
        answers,
        array[p_question_id::text],
        pg_catalog.to_jsonb(p_option_id),
        true
      ),
      current_position = p_current_position,
      revision = revision + 1
  where id = attempt.id
  returning * into attempt;
  return attempt;
end;
$$;

create or replace function public.update_placement_position(
  p_attempt_id uuid,
  p_current_position integer,
  p_expected_revision bigint
)
returns public.placement_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  attempt public.placement_attempts;
  question_count integer;
begin
  if actor_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;
  select attempts.* into attempt
  from public.placement_attempts as attempts
  where attempts.id = p_attempt_id and attempts.user_id = actor_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'placement attempt not found';
  end if;
  if attempt.status <> 'in_progress' then
    raise exception using errcode = '55000', message = 'placement attempt is not active';
  end if;
  if attempt.revision <> p_expected_revision then
    raise exception using errcode = 'PT409', message = 'placement attempt revision conflict';
  end if;
  select count(*)::integer into question_count
  from public.placement_questions
  where placement_test_id = attempt.placement_test_id;
  if p_current_position < 1 or p_current_position > question_count then
    raise exception using errcode = '22023', message = 'invalid placement position';
  end if;
  update public.placement_attempts
  set current_position = p_current_position,
      revision = revision + 1
  where id = attempt.id
  returning * into attempt;
  return attempt;
end;
$$;

create or replace function public.submit_placement_attempt(
  p_attempt_id uuid,
  p_answers jsonb,
  p_idempotency_key uuid
)
returns public.placement_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  attempt public.placement_attempts;
  answer_count integer;
  correct_count integer;
  question_count integer;
  result_level text;
begin
  if actor_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;
  if pg_catalog.jsonb_typeof(p_answers) <> 'object' then
    raise exception using errcode = '22023', message = 'answers must be an object';
  end if;

  select attempts.* into attempt
  from public.placement_attempts as attempts
  where attempts.id = p_attempt_id and attempts.user_id = actor_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'placement attempt not found';
  end if;

  if attempt.status = 'submitted' then
    if attempt.submit_idempotency_key = p_idempotency_key
      and attempt.answers = p_answers then
      return attempt;
    end if;
    if attempt.submit_idempotency_key = p_idempotency_key then
      raise exception using errcode = '22023', message = 'idempotency key payload mismatch';
    end if;
    raise exception using errcode = '55000', message = 'placement attempt already submitted';
  end if;

  select count(*)::integer into question_count
  from public.placement_questions as questions
  where questions.placement_test_id = attempt.placement_test_id;
  select count(*)::integer into answer_count
  from pg_catalog.jsonb_object_keys(attempt.answers);
  if question_count = 0 or answer_count <> question_count then
    raise exception using errcode = '23514', message = 'all placement questions must be autosaved';
  end if;
  if attempt.answers <> p_answers then
    raise exception using errcode = 'PT409', message = 'placement answers are not fully saved';
  end if;

  select count(*)::integer into correct_count
  from public.placement_questions as questions
  where questions.placement_test_id = attempt.placement_test_id
    and attempt.answers ->> questions.id::text = questions.correct_option_id;
  result_level := case
    when correct_count <= 2 then 'A1'
    when correct_count <= 4 then 'A2'
    else 'B1'
  end;

  update public.placement_attempts
  set status = 'submitted',
      score = correct_count,
      max_score = question_count,
      recommended_level = result_level,
      submit_idempotency_key = p_idempotency_key,
      submitted_at = now()
  where id = attempt.id
  returning * into attempt;

  update public.learner_profiles
  set current_band = case result_level when 'A1' then 2.5 when 'A2' then 3.5 else 4.5 end
  where user_id = actor_id and onboarding_completed_at is null;
  return attempt;
end;
$$;

commit;

begin;

create or replace function public.save_writing_draft(
  p_submission_id uuid,
  p_draft_text text,
  p_expected_revision integer
)
returns public.writing_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target public.writing_submissions;
  target_minimum integer;
  calculated_word_count integer;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_submission_id is null or p_expected_revision is null or p_expected_revision < 0 then
    raise exception using errcode = '22023', message = 'invalid draft save input';
  end if;
  if p_draft_text is null or char_length(p_draft_text) > 20000 then
    raise exception using errcode = '22023', message = 'writing draft is too large';
  end if;

  select submissions.* into target
  from public.writing_submissions as submissions
  where submissions.id = p_submission_id and submissions.user_id = actor_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'writing submission not found';
  end if;
  if target.status <> 'draft' then
    raise exception using errcode = '55000', message = 'submitted writing is immutable';
  end if;

  select versions.minimum_words into target_minimum
  from public.writing_task_versions as versions
  where versions.id = target.writing_task_version_id;

  if p_expected_revision <> target.server_revision then
    if p_expected_revision < target.server_revision and p_draft_text = target.draft_text then
      return target;
    end if;
    raise exception using errcode = 'PT409', message = 'stale or conflicting writing revision';
  end if;
  if p_draft_text = target.draft_text then return target; end if;

  calculated_word_count := private.count_writing_words(p_draft_text);
  update public.writing_submissions set
    draft_text = p_draft_text,
    server_revision = server_revision + 1,
    word_count = calculated_word_count,
    minimum_words_met = calculated_word_count >= target_minimum,
    last_saved_at = now()
  where id = target.id
  returning * into target;
  return target;
end;
$$;

commit;

begin;

-- Learners have no DELETE grant on this table, so immutability remains enforced
-- for application traffic. Restricting privileged/cascaded deletes here prevents
-- Auth account deletion once a learner has submitted an essay.
drop trigger if exists protect_writing_submission on public.writing_submissions;
create trigger protect_writing_submission
before update on public.writing_submissions
for each row execute function public.protect_writing_submission();

commit;

begin;

-- Client roles have no DELETE grants on learner-owned Speaking tables. Keep
-- immutability checks on updates while allowing privileged Auth/profile
-- deletion cascades for privacy erasure and isolated test cleanup.
drop trigger if exists protect_speaking_attempt on public.speaking_attempts;
create trigger protect_speaking_attempt
before update on public.speaking_attempts
for each row execute function public.protect_speaking_attempt();

drop trigger if exists protect_speaking_response on public.speaking_responses;
create trigger protect_speaking_response
before update on public.speaking_responses
for each row execute function public.protect_speaking_response();

drop trigger if exists protect_speaking_audio_asset on public.speaking_audio_assets;
create trigger protect_speaking_audio_asset
before update on public.speaking_audio_assets
for each row execute function public.protect_speaking_audio_asset();

drop trigger if exists protect_speaking_transcript on public.speaking_transcripts;
create trigger protect_speaking_transcript
before update on public.speaking_transcripts
for each row execute function public.protect_speaking_transcript();

drop trigger if exists protect_speaking_feedback on public.speaking_feedback;
create trigger protect_speaking_feedback
before update on public.speaking_feedback
for each row execute function public.protect_speaking_feedback();

commit;

begin;

do $$
begin
  if not exists (
    select 1
    from vault.decrypted_secrets
    where name = 'speaking_pipeline_signing_secret'
      and nullif(decrypted_secret, '') is not null
  ) then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'speaking_pipeline_signing_secret',
      'Speaking upload and optional AI pipeline signatures'
    );
  end if;
end;
$$;

create or replace function public.get_speaking_pipeline_signing_secret()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  result text;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception using errcode = '42501', message = 'service role required';
  end if;
  select decrypted_secret into result
  from vault.decrypted_secrets
  where name = 'speaking_pipeline_signing_secret'
  order by created_at desc
  limit 1;
  if nullif(result, '') is null then
    raise exception using errcode = '55000', message = 'speaking pipeline is not configured';
  end if;
  return result;
end;
$$;

revoke all on function public.get_speaking_pipeline_signing_secret() from public, anon, authenticated;
grant execute on function public.get_speaking_pipeline_signing_secret() to service_role;

comment on function public.get_speaking_pipeline_signing_secret() is
  'Server-only secret bridge for trusted service-role runtimes; never executable by learner roles.';

commit;

begin;

-- User-owned immutable records remain protected from learner DELETE by grants
-- and RLS. Their internal ownership graph must cascade so deleting an Auth
-- account can actually satisfy privacy erasure and test-fixture cleanup.
alter table public.writing_feedback_runs
  drop constraint writing_feedback_runs_submission_owner_fkey,
  add constraint writing_feedback_runs_submission_owner_fkey
    foreign key (submission_id, user_id)
    references public.writing_submissions (id, user_id) on delete cascade;
alter table public.writing_feedback
  drop constraint writing_feedback_run_scope_fkey,
  add constraint writing_feedback_run_scope_fkey
    foreign key (run_id, submission_id, user_id)
    references public.writing_feedback_runs (id, submission_id, user_id) on delete cascade;
drop trigger if exists protect_writing_feedback on public.writing_feedback;
create trigger protect_writing_feedback
before update on public.writing_feedback
for each row execute function public.protect_writing_feedback();

alter table public.speaking_responses
  drop constraint speaking_responses_attempt_owner_fkey,
  add constraint speaking_responses_attempt_owner_fkey
    foreign key (attempt_id, user_id)
    references public.speaking_attempts (id, user_id) on delete cascade,
  drop constraint speaking_responses_attempt_version_fkey,
  add constraint speaking_responses_attempt_version_fkey
    foreign key (attempt_id, speaking_set_version_id)
    references public.speaking_attempts (id, speaking_set_version_id) on delete cascade;
alter table public.speaking_upload_intents
  drop constraint speaking_upload_intents_response_scope_fkey,
  add constraint speaking_upload_intents_response_scope_fkey
    foreign key (response_id, attempt_id, user_id)
    references public.speaking_responses (id, attempt_id, user_id) on delete cascade;
alter table public.speaking_audio_assets
  drop constraint speaking_audio_assets_upload_intent_id_fkey,
  add constraint speaking_audio_assets_upload_intent_id_fkey
    foreign key (upload_intent_id)
    references public.speaking_upload_intents (id) on delete cascade,
  drop constraint speaking_audio_assets_response_scope_fkey,
  add constraint speaking_audio_assets_response_scope_fkey
    foreign key (response_id, attempt_id, user_id)
    references public.speaking_responses (id, attempt_id, user_id) on delete cascade;
alter table public.speaking_transcript_runs
  drop constraint speaking_transcript_runs_response_owner_fkey,
  add constraint speaking_transcript_runs_response_owner_fkey
    foreign key (response_id, user_id)
    references public.speaking_responses (id, user_id) on delete cascade;
alter table public.speaking_transcripts
  drop constraint speaking_transcripts_run_scope_fkey,
  add constraint speaking_transcripts_run_scope_fkey
    foreign key (run_id, response_id, user_id)
    references public.speaking_transcript_runs (id, response_id, user_id) on delete cascade;
alter table public.speaking_feedback_runs
  drop constraint speaking_feedback_runs_attempt_owner_fkey,
  add constraint speaking_feedback_runs_attempt_owner_fkey
    foreign key (attempt_id, user_id)
    references public.speaking_attempts (id, user_id) on delete cascade;
alter table public.speaking_feedback
  drop constraint speaking_feedback_run_scope_fkey,
  add constraint speaking_feedback_run_scope_fkey
    foreign key (run_id, attempt_id, user_id)
    references public.speaking_feedback_runs (id, attempt_id, user_id) on delete cascade;

alter table public.mock_test_section_attempts
  drop constraint mock_test_section_attempts_session_owner_fkey,
  add constraint mock_test_section_attempts_session_owner_fkey
    foreign key (session_id, user_id)
    references public.mock_test_sessions (id, user_id) on delete cascade,
  drop constraint mock_test_section_attempts_session_version_fkey,
  add constraint mock_test_section_attempts_session_version_fkey
    foreign key (session_id, mock_test_version_id)
    references public.mock_test_sessions (id, mock_test_version_id) on delete cascade;
alter table public.mock_test_results
  drop constraint mock_test_results_session_owner_fkey,
  add constraint mock_test_results_session_owner_fkey
    foreign key (session_id, user_id)
    references public.mock_test_sessions (id, user_id) on delete cascade,
  drop constraint mock_test_results_session_version_fkey,
  add constraint mock_test_results_session_version_fkey
    foreign key (session_id, mock_test_version_id)
    references public.mock_test_sessions (id, mock_test_version_id) on delete cascade;

commit;

begin;

alter table public.mock_test_section_attempts
  drop constraint mock_test_section_attempts_learner_attempt_id_fkey,
  add constraint mock_test_section_attempts_learner_attempt_id_fkey
    foreign key (learner_attempt_id)
    references public.learner_attempts (id) on delete cascade,
  drop constraint mock_test_section_attempts_writing_submission_id_fkey,
  add constraint mock_test_section_attempts_writing_submission_id_fkey
    foreign key (writing_submission_id)
    references public.writing_submissions (id) on delete cascade,
  drop constraint mock_test_section_attempts_speaking_attempt_id_fkey,
  add constraint mock_test_section_attempts_speaking_attempt_id_fkey
    foreign key (speaking_attempt_id)
    references public.speaking_attempts (id) on delete cascade;

alter table public.mock_test_results
  drop constraint mock_test_results_writing_submission_id_fkey,
  add constraint mock_test_results_writing_submission_id_fkey
    foreign key (writing_submission_id)
    references public.writing_submissions (id) on delete cascade,
  drop constraint mock_test_results_speaking_attempt_id_fkey,
  add constraint mock_test_results_speaking_attempt_id_fkey
    foreign key (speaking_attempt_id)
    references public.speaking_attempts (id) on delete cascade;

commit;

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

-- Phase 2: Performance Tuning Indexes
-- Add indexes for frequently queried columns

CREATE INDEX IF NOT EXISTS learner_lesson_progress_user_id_idx ON public.learner_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS learner_lesson_progress_lesson_id_idx ON public.learner_lesson_progress(lesson_id);

CREATE INDEX IF NOT EXISTS learner_section_progress_user_id_idx ON public.learner_section_progress(user_id);
CREATE INDEX IF NOT EXISTS learner_section_progress_lesson_id_idx ON public.learner_section_progress(lesson_id);

CREATE INDEX IF NOT EXISTS ai_generated_contents_created_at_idx ON public.ai_generated_contents(created_at DESC);

-- Phase 1 (P0): Composite Performance Tuning Indexes
-- Add composite indexes for high frequency query paths

BEGIN;

CREATE INDEX IF NOT EXISTS idx_writing_submissions_user_status 
    ON public.writing_submissions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_speaking_attempts_user_status 
    ON public.speaking_attempts(user_id, status);

CREATE INDEX IF NOT EXISTS idx_practice_attempts_user_domain_created 
    ON public.practice_attempts(user_id, domain, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learner_analytics_daily_user_tag_date 
    ON public.learner_analytics_daily(user_id, tag_id, date DESC);

COMMIT;

-- 1. Bảng lưu trữ bài học lý thuyết
CREATE TABLE public.lessons (
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
CREATE TABLE public.user_lesson_progress (
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
CREATE TABLE public.practice_exercises (
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
CREATE TABLE public.exercise_questions (
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

CREATE TABLE private.exercise_answer_keys (
    question_id UUID PRIMARY KEY REFERENCES public.exercise_questions(id) ON DELETE CASCADE,
    correct_answers JSONB NOT NULL, -- Giá trị đúng: ["A"], ["answer1", "answer2"]
    accepted_synonyms JSONB DEFAULT '[]'::jsonb, -- Từ đồng nghĩa chấp nhận được
    case_sensitive BOOLEAN NOT NULL DEFAULT false
);

-- 6. Bảng lưu lượt làm bài tập (Practice Attempts & Drafts)
CREATE TABLE public.exercise_attempts (
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
CREATE INDEX idx_user_lesson_progress_lookup ON public.user_lesson_progress(user_id, status);
CREATE INDEX idx_exercise_attempts_user_status ON public.exercise_attempts(user_id, status);
CREATE INDEX idx_exercise_attempts_exercise_created ON public.exercise_attempts(exercise_id, created_at DESC);
CREATE INDEX idx_exercise_questions_exercise_order ON public.exercise_questions(exercise_id, order_index);

-- Kích hoạt RLS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_attempts ENABLE ROW LEVEL SECURITY;

-- Policies cơ bản
CREATE POLICY "Public read lessons" ON public.lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read exercises" ON public.practice_exercises FOR SELECT TO authenticated USING (is_published = true);
CREATE POLICY "Public read questions" ON public.exercise_questions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users own lesson progress" ON public.user_lesson_progress 
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

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
        SELECT eq.id, eq.question_type, eq.explanation, ak.correct_answers, ak.accepted_synonyms, ak.case_sensitive
        FROM public.exercise_questions eq
        JOIN private.exercise_answer_keys ak ON eq.id = ak.question_id
        WHERE eq.exercise_id = v_exercise_id
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

    SELECT COUNT(*) INTO v_total_questions FROM public.exercise_questions WHERE exercise_id = v_exercise_id;

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

CREATE TABLE IF NOT EXISTS public.vocabulary_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    term TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.vocabulary_vault ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS vocabulary_vault_user_term_idx ON public.vocabulary_vault (user_id, term);
CREATE INDEX IF NOT EXISTS vocabulary_vault_user_id_idx ON public.vocabulary_vault (user_id);

CREATE POLICY "Users can insert their own vocabulary"
    ON public.vocabulary_vault FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own vocabulary"
    ON public.vocabulary_vault FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own vocabulary"
    ON public.vocabulary_vault FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vocabulary"
    ON public.vocabulary_vault FOR DELETE
    USING (auth.uid() = user_id);

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

