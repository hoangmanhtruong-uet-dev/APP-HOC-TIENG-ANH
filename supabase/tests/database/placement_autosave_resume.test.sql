begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(16);

insert into auth.users (id, email, raw_user_meta_data) values
  ('82222222-2222-4222-8222-222222222221', 'placement-a@example.test', '{"display_name":"Placement A"}'::jsonb),
  ('82222222-2222-4222-8222-222222222222', 'placement-b@example.test', '{"display_name":"Placement B"}'::jsonb);

select set_config('request.jwt.claim.sub', '82222222-2222-4222-8222-222222222221', true);

select extensions.lives_ok(
  $$ select public.start_placement_attempt('english-foundation', '82222222-2222-4222-8222-222222222231') $$,
  'user A starts placement'
);
select extensions.lives_ok(
  $$ select public.start_placement_attempt('english-foundation', '82222222-2222-4222-8222-222222222232') $$,
  'a repeated start resumes the active placement'
);
select extensions.is(
  (select count(*)::integer from public.placement_attempts where user_id = '82222222-2222-4222-8222-222222222221' and status = 'in_progress'),
  1,
  'only one new active attempt is created'
);

select extensions.lives_ok($$
  select public.save_placement_answer(
    (select id from public.placement_attempts where user_id = '82222222-2222-4222-8222-222222222221' and status = 'in_progress'),
    (select id from public.placement_questions order by position limit 1),
    (select correct_option_id from public.placement_questions order by position limit 1),
    2,
    0
  )
$$, 'user A autosaves an answer and next position');
select extensions.is(
  (select current_position from public.placement_attempts where user_id = '82222222-2222-4222-8222-222222222221' and status = 'in_progress'),
  2::smallint,
  'resume position is persisted'
);
select extensions.is(
  (select revision from public.placement_attempts where user_id = '82222222-2222-4222-8222-222222222221' and status = 'in_progress'),
  1::bigint,
  'autosave advances the optimistic revision'
);
select extensions.throws_ok($$
  select public.save_placement_answer(
    (select id from public.placement_attempts where user_id = '82222222-2222-4222-8222-222222222221' and status = 'in_progress'),
    (select id from public.placement_questions order by position limit 1),
    (select correct_option_id from public.placement_questions order by position limit 1),
    2,
    0
  )
$$, 'PT409', 'placement attempt revision conflict', 'a stale autosave is rejected');

select extensions.lives_ok($$
  select public.save_placement_answer(
    (select id from public.placement_attempts where user_id = '82222222-2222-4222-8222-222222222221' and status = 'in_progress'),
    (select id from public.placement_questions order by position limit 1),
    (select correct_option_id from public.placement_questions order by position limit 1),
    2,
    1
  )
$$, 'saving the same question updates its single JSON object key');
select extensions.is(
  (select count(*)::integer from public.placement_attempts, lateral pg_catalog.jsonb_object_keys(answers) where user_id = '82222222-2222-4222-8222-222222222221' and status = 'in_progress'),
  1,
  'an attempt has at most one answer value per question id'
);

select set_config('request.jwt.claim.sub', '82222222-2222-4222-8222-222222222222', true);
select extensions.throws_ok($$
  select public.save_placement_answer(
    (select id from public.placement_attempts where user_id = '82222222-2222-4222-8222-222222222221' and status = 'in_progress'),
    (select id from public.placement_questions order by position limit 1),
    (select correct_option_id from public.placement_questions order by position limit 1),
    2,
    2
  )
$$, 'P0002', 'placement attempt not found', 'user B cannot mutate user A placement');

select set_config('request.jwt.claim.sub', '82222222-2222-4222-8222-222222222221', true);
select extensions.lives_ok($$
  do $body$
  declare q record; expected_revision bigint := 2;
  begin
    for q in select id, position, correct_option_id from public.placement_questions order by position loop
      if q.position > 1 then
        perform public.save_placement_answer(
          (select id from public.placement_attempts where user_id = '82222222-2222-4222-8222-222222222221' and status = 'in_progress'),
          q.id, q.correct_option_id, q.position, expected_revision
        );
        expected_revision := expected_revision + 1;
      end if;
    end loop;
  end $body$;
$$, 'remaining answers autosave');

select extensions.lives_ok($$
  select public.submit_placement_attempt(
    (select id from public.placement_attempts where user_id = '82222222-2222-4222-8222-222222222221' and status = 'in_progress'),
    (select answers from public.placement_attempts where user_id = '82222222-2222-4222-8222-222222222221' and status = 'in_progress'),
    '82222222-2222-4222-8222-222222222241'
  )
$$, 'placement finishes once');

select extensions.lives_ok($$
  select public.submit_placement_attempt(
    (select id from public.placement_attempts where user_id = '82222222-2222-4222-8222-222222222221' order by submitted_at desc nulls last limit 1),
    (select answers from public.placement_attempts where user_id = '82222222-2222-4222-8222-222222222221' order by submitted_at desc nulls last limit 1),
    '82222222-2222-4222-8222-222222222241'
  )
$$, 'same finish idempotency key replays one completion');

select extensions.throws_ok($$
  select public.submit_placement_attempt(
    (select id from public.placement_attempts where user_id = '82222222-2222-4222-8222-222222222221' order by submitted_at desc nulls last limit 1),
    '{}'::jsonb,
    '82222222-2222-4222-8222-222222222241'
  )
$$, '22023', 'idempotency key payload mismatch', 'same finish key with a different payload is rejected');

select extensions.lives_ok(
  $$ select public.start_placement_attempt('english-foundation', '82222222-2222-4222-8222-222222222242') $$,
  'starting after completion creates a new active attempt'
);
select extensions.is(
  (select count(*)::integer from public.placement_attempts where user_id = '82222222-2222-4222-8222-222222222221' and status = 'in_progress'),
  1,
  'the completed attempt is not resumed as active'
);

select * from extensions.finish();
rollback;
