-- Migration to support Cloudflare R2 for speaking audio
alter table public.speaking_audio_assets drop constraint if exists speaking_audio_assets_bucket_check;
alter table public.speaking_audio_assets drop constraint if exists speaking_audio_checksum_check;
alter table public.speaking_audio_assets alter column upload_intent_id drop not null;

create or replace function public.finalize_r2_speaking_upload(
  p_attempt_id uuid,
  p_prompt_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint,
  p_duration_seconds numeric
) returns public.speaking_audio_assets language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  target_attempt public.speaking_attempts;
  target_response public.speaking_responses;
  result public.speaking_audio_assets;
  old_asset_id uuid;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  
  select * into target_attempt from public.speaking_attempts 
  where id = p_attempt_id and user_id = actor_id for update;
  if target_attempt.status <> 'in_progress' then raise exception 'Speaking attempt is not editable'; end if;

  insert into public.speaking_responses (user_id, attempt_id, speaking_set_version_id, prompt_id)
  values (actor_id, target_attempt.id, target_attempt.speaking_set_version_id, p_prompt_id)
  on conflict (attempt_id, prompt_id) do update set updated_at = public.speaking_responses.updated_at
  returning * into target_response;
  
  old_asset_id := target_response.audio_asset_id;

  insert into public.speaking_audio_assets (
    user_id, attempt_id, response_id, bucket_id, storage_path, mime_type,
    size_bytes, duration_seconds, sha256_checksum
  ) values (
    actor_id, target_attempt.id, target_response.id, 'cloudflare-r2', p_storage_path,
    p_mime_type, p_size_bytes, p_duration_seconds, '0000000000000000000000000000000000000000000000000000000000000000'
  ) returning * into result;

  update public.speaking_responses set audio_asset_id = result.id where id = target_response.id;
  if old_asset_id is not null then update public.speaking_audio_assets set status = 'orphaned' where id = old_asset_id; end if;

  return result;
end; $$;

revoke all on function public.finalize_r2_speaking_upload(uuid, uuid, text, text, bigint, numeric) from public, anon, authenticated;
grant execute on function public.finalize_r2_speaking_upload(uuid, uuid, text, text, bigint, numeric) to authenticated;

