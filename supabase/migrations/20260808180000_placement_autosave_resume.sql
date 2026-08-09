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
