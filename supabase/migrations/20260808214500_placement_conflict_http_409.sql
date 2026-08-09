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
