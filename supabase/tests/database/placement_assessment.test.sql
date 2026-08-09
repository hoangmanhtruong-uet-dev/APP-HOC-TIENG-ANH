begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(16);

select extensions.has_table('public', 'placement_tests', 'placement tests table exists');
select extensions.has_table('public', 'placement_questions', 'placement questions table exists');
select extensions.has_table('public', 'placement_attempts', 'placement attempts table exists');

select extensions.ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.placement_attempts'::regclass),
  'RLS is enabled on placement attempts'
);

select extensions.policies_are(
  'public',
  'placement_attempts',
  array['Learners can read their own placement attempts'],
  'placement attempts expose only owner read policy'
);

select extensions.ok(
  has_table_privilege('authenticated', 'public.placement_attempts', 'select')
  and not has_table_privilege('authenticated', 'public.placement_attempts', 'insert')
  and not has_table_privilege('authenticated', 'public.placement_attempts', 'update'),
  'authenticated learners cannot write placement results directly'
);

select extensions.ok(
  not has_table_privilege('authenticated', 'public.placement_questions', 'select'),
  'answer-bearing question rows are not directly readable'
);

select extensions.ok(
  has_function_privilege('authenticated', 'public.get_active_placement_test(text)', 'execute')
  and not has_function_privilege('anon', 'public.get_active_placement_test(text)', 'execute'),
  'only authenticated users can read published placement content'
);

select extensions.ok(
  has_function_privilege('authenticated', 'public.start_placement_attempt(text,uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.submit_placement_attempt(uuid,jsonb,uuid)', 'execute'),
  'authenticated users can execute placement workflow RPCs'
);

select extensions.is(
  jsonb_array_length(public.get_active_placement_test('english-foundation') -> 'questions'),
  5,
  'published foundation test returns five questions'
);

select extensions.ok(
  not (public.get_active_placement_test('english-foundation')::text like '%correct_option_id%'),
  'public placement payload never exposes the answer key'
);

insert into auth.users (id, email, raw_user_meta_data)
values (
  '81111111-1111-4111-8111-111111111111',
  'placement-user@example.test',
  '{"display_name":"Placement Learner"}'::jsonb
);

select set_config('request.jwt.claim.sub', '81111111-1111-4111-8111-111111111111', true);

select extensions.lives_ok(
  $$ select public.start_placement_attempt(
    'english-foundation',
    '81111111-1111-4111-8111-111111111112'::uuid
  ) $$,
  'learner can start a placement attempt'
);

select extensions.lives_ok(
  $$
    do $body$
    declare
      question record;
      attempt_id uuid;
      expected_revision bigint := 0;
    begin
      select id into attempt_id
      from public.placement_attempts
      where user_id = '81111111-1111-4111-8111-111111111111'::uuid
      order by started_at desc limit 1;
      for question in
        select id, position, correct_option_id
        from public.placement_questions
        where placement_test_id = (
          select id from public.placement_tests where slug = 'english-foundation'
        )
        order by position
      loop
        perform public.save_placement_answer(
          attempt_id,
          question.id,
          question.correct_option_id,
          question.position,
          expected_revision
        );
        expected_revision := expected_revision + 1;
      end loop;
    end $body$
  $$,
  'learner autosaves every placement answer before submitting'
);

select extensions.lives_ok(
  $$
    select public.submit_placement_attempt(
      (
        select id from public.placement_attempts
        where user_id = '81111111-1111-4111-8111-111111111111'::uuid
        order by started_at desc limit 1
      ),
      (
        select jsonb_object_agg(id::text, correct_option_id)
        from public.placement_questions
        where placement_test_id = (
          select id from public.placement_tests where slug = 'english-foundation'
        )
      ),
      '81111111-1111-4111-8111-111111111113'::uuid
    )
  $$,
  'server scores and submits a complete placement attempt'
);

select extensions.is(
  (select score from public.placement_attempts where user_id = '81111111-1111-4111-8111-111111111111'::uuid),
  5::smallint,
  'all correct answers receive full score'
);

select extensions.is(
  (select recommended_level from public.placement_attempts where user_id = '81111111-1111-4111-8111-111111111111'::uuid),
  'B1',
  'full score recommends B1'
);

select * from extensions.finish();
rollback;
