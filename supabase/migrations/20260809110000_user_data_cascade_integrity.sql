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
