create table public.learner_vocabulary_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  vocabulary_entry_id uuid not null references public.vocabulary_entries (id) on delete cascade,
  familiarity text not null default 'learning',
  review_count integer not null default 0,
  last_reviewed_at timestamptz not null default now(),
  next_review_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, vocabulary_entry_id),
  constraint learner_vocabulary_progress_familiarity_check
    check (familiarity in ('again', 'learning', 'mastered')),
  constraint learner_vocabulary_progress_review_count_check
    check (review_count between 0 and 1000000)
);

create index learner_vocabulary_progress_due_idx
  on public.learner_vocabulary_progress (user_id, next_review_at);

alter table public.learner_vocabulary_progress enable row level security;

create policy learner_vocabulary_progress_select_own
  on public.learner_vocabulary_progress
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create function public.record_vocabulary_review(
  p_vocabulary_entry_id uuid,
  p_familiarity text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  due_at timestamptz;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
  if p_familiarity not in ('again', 'learning', 'mastered') then
    raise exception using errcode = '22023', message = 'invalid vocabulary familiarity';
  end if;
  if not exists (
    select 1 from public.vocabulary_entries where id = p_vocabulary_entry_id
  ) then
    raise exception using errcode = 'P0002', message = 'vocabulary entry not found';
  end if;

  due_at := case p_familiarity
    when 'again' then now() + interval '10 minutes'
    when 'learning' then now() + interval '1 day'
    else now() + interval '7 days'
  end;

  insert into public.learner_vocabulary_progress (
    user_id, vocabulary_entry_id, familiarity, review_count,
    last_reviewed_at, next_review_at
  ) values (
    actor_id, p_vocabulary_entry_id, p_familiarity, 1, now(), due_at
  )
  on conflict (user_id, vocabulary_entry_id) do update set
    familiarity = excluded.familiarity,
    review_count = public.learner_vocabulary_progress.review_count + 1,
    last_reviewed_at = excluded.last_reviewed_at,
    next_review_at = excluded.next_review_at,
    updated_at = now();
end;
$$;

create function public.get_vocabulary_progress_summary()
returns table (
  reviewing bigint,
  mastered bigint,
  reviewed_today bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(*) filter (where familiarity in ('again', 'learning')) as reviewing,
    count(*) filter (where familiarity = 'mastered') as mastered,
    count(*) filter (where last_reviewed_at >= date_trunc('day', now())) as reviewed_today
  from public.learner_vocabulary_progress
  where user_id = (select auth.uid());
$$;

revoke all on table public.learner_vocabulary_progress from public, anon, authenticated;
grant select on table public.learner_vocabulary_progress to authenticated;
revoke all on function public.record_vocabulary_review(uuid, text) from public, anon;
grant execute on function public.record_vocabulary_review(uuid, text) to authenticated;
revoke all on function public.get_vocabulary_progress_summary() from public, anon;
grant execute on function public.get_vocabulary_progress_summary() to authenticated;

comment on function public.record_vocabulary_review(uuid, text) is
  'Records an authenticated learner vocabulary rating and schedules the next review.';
