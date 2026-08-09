select jsonb_build_object(
  'columns', (
    select jsonb_object_agg(
      column_name,
      jsonb_build_object(
        'type', data_type,
        'nullable', is_nullable,
        'default', column_default
      )
    )
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'placement_attempts'
      and column_name in ('current_position', 'revision')
  ),
  'constraints', (
    select coalesce(jsonb_agg(conname order by conname), '[]'::jsonb)
    from pg_constraint
    where conrelid = 'public.placement_attempts'::regclass
      and conname in (
        'placement_attempts_current_position_check',
        'placement_attempts_revision_check'
      )
  ),
  'resume_index', (
    select jsonb_build_object('name', indexname, 'definition', indexdef)
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'placement_attempts'
      and indexname = 'placement_attempts_active_resume_idx'
  ),
  'rls_enabled', (
    select relrowsecurity
    from pg_class
    where oid = 'public.placement_attempts'::regclass
  ),
  'policies', (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'name', policyname,
          'command', cmd,
          'roles', roles,
          'using', qual
        )
        order by policyname
      ),
      '[]'::jsonb
    )
    from pg_policies
    where schemaname = 'public'
      and tablename = 'placement_attempts'
  ),
  'functions', (
    select jsonb_agg(
      jsonb_build_object(
        'signature', p.oid::regprocedure::text,
        'security_definer', p.prosecdef,
        'config', p.proconfig,
        'auth_uid_check', position('auth.uid' in pg_get_functiondef(p.oid)) > 0,
        'http_conflict', position('PT409' in pg_get_functiondef(p.oid)) > 0,
        'transaction_conflict', position('40001' in pg_get_functiondef(p.oid)) > 0
      )
      order by p.proname
    )
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'start_placement_attempt',
        'save_placement_answer',
        'update_placement_position',
        'submit_placement_attempt'
      )
  ),
  'privileges', jsonb_build_object(
    'save_authenticated', has_function_privilege(
      'authenticated',
      'public.save_placement_answer(uuid,uuid,text,integer,bigint)',
      'EXECUTE'
    ),
    'save_anon', has_function_privilege(
      'anon',
      'public.save_placement_answer(uuid,uuid,text,integer,bigint)',
      'EXECUTE'
    ),
    'save_public', has_function_privilege(
      'public',
      'public.save_placement_answer(uuid,uuid,text,integer,bigint)',
      'EXECUTE'
    ),
    'position_authenticated', has_function_privilege(
      'authenticated',
      'public.update_placement_position(uuid,integer,bigint)',
      'EXECUTE'
    ),
    'position_anon', has_function_privilege(
      'anon',
      'public.update_placement_position(uuid,integer,bigint)',
      'EXECUTE'
    ),
    'table_authenticated_insert', has_table_privilege(
      'authenticated', 'public.placement_attempts', 'INSERT'
    ),
    'table_authenticated_update', has_table_privilege(
      'authenticated', 'public.placement_attempts', 'UPDATE'
    ),
    'table_authenticated_delete', has_table_privilege(
      'authenticated', 'public.placement_attempts', 'DELETE'
    ),
    'table_authenticated_select', has_table_privilege(
      'authenticated', 'public.placement_attempts', 'SELECT'
    )
  ),
  'legacy_duplicates', (
    select jsonb_build_object(
      'affected_users', count(*),
      'extra_active_attempts', coalesce(sum(active_count - 1), 0)
    )
    from (
      select user_id, count(*) as active_count
      from public.placement_attempts
      where status = 'in_progress'
      group by user_id
      having count(*) > 1
    ) duplicates
  )
);
