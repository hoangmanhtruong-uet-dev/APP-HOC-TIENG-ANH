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
