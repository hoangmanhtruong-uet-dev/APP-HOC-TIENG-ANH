begin;

-- Learners have no DELETE grant on this table, so immutability remains enforced
-- for application traffic. Restricting privileged/cascaded deletes here prevents
-- Auth account deletion once a learner has submitted an essay.
drop trigger if exists protect_writing_submission on public.writing_submissions;
create trigger protect_writing_submission
before update on public.writing_submissions
for each row execute function public.protect_writing_submission();

commit;
