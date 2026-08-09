begin;

do $$
begin
  if not exists (
    select 1
    from vault.decrypted_secrets
    where name = 'speaking_pipeline_signing_secret'
      and nullif(decrypted_secret, '') is not null
  ) then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'speaking_pipeline_signing_secret',
      'Speaking upload and optional AI pipeline signatures'
    );
  end if;
end;
$$;

create or replace function public.get_speaking_pipeline_signing_secret()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  result text;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception using errcode = '42501', message = 'service role required';
  end if;
  select decrypted_secret into result
  from vault.decrypted_secrets
  where name = 'speaking_pipeline_signing_secret'
  order by created_at desc
  limit 1;
  if nullif(result, '') is null then
    raise exception using errcode = '55000', message = 'speaking pipeline is not configured';
  end if;
  return result;
end;
$$;

revoke all on function public.get_speaking_pipeline_signing_secret() from public, anon, authenticated;
grant execute on function public.get_speaking_pipeline_signing_secret() to service_role;

comment on function public.get_speaking_pipeline_signing_secret() is
  'Server-only secret bridge for trusted service-role runtimes; never executable by learner roles.';

commit;
