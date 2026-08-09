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
