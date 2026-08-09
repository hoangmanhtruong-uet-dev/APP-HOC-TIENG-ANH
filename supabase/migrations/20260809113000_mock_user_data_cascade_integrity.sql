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
