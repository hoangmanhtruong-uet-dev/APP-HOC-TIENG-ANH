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
