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
