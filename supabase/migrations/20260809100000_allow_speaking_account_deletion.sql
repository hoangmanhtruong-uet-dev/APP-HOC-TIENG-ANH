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
