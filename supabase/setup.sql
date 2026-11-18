-- Next Up: database setup.
-- Run this once in Supabase: SQL Editor → New query → paste everything → Run.

create table if not exists public.categories (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  color       text not null default '#69A831',
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.tasks (
  id           text primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 300),
  notes        text not null default '' check (char_length(notes) <= 4000),
  category_id  text references public.categories (id) on delete set null,
  priority     smallint not null default 2 check (priority between 1 and 3),
  due          date,
  done         boolean not null default false,
  done_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- Repeating tasks (added later; safe to re-run)
alter table public.tasks add column if not exists repeat text;
alter table public.tasks drop constraint if exists tasks_repeat_check;
alter table public.tasks add constraint tasks_repeat_check check (
  repeat in ('daily','weekdays','weekly','biweekly','monthly','yearly')
  or repeat ~ '^days:[0-6](,[0-6]){0,6}$'
  or repeat ~ '^every:([1-9]|[1-9][0-9]):(day|week|month|year)(:[0-6](,[0-6]){0,6})?$'
);

create index if not exists tasks_user_idx on public.tasks (user_id);
create index if not exists categories_user_idx on public.categories (user_id);

-- Row level security: every account can only see and change its own rows.
alter table public.categories enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "Own categories" on public.categories;
create policy "Own categories" on public.categories
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Own tasks" on public.tasks;
create policy "Own tasks" on public.tasks
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Live updates between your devices.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'tasks') then
    alter publication supabase_realtime add table public.tasks;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'categories') then
    alter publication supabase_realtime add table public.categories;
  end if;
end $$;

-- Shopping list (added later; safe to re-run)
create table if not exists public.shopping_items (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 200),
  aisle       text not null default 'other',
  done        boolean not null default false,
  done_at     timestamptz,
  created_at  timestamptz not null default now()
);
create table if not exists public.shopping_memory (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  word        text not null,
  aisle       text not null,
  updated_at  timestamptz not null default now()
);
alter table public.shopping_items enable row level security;
alter table public.shopping_memory enable row level security;
drop policy if exists "Own shopping items" on public.shopping_items;
create policy "Own shopping items" on public.shopping_items for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Own shopping memory" on public.shopping_memory;
create policy "Own shopping memory" on public.shopping_memory for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Books (added later; safe to re-run)
create table if not exists public.books (
  id           text primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 300),
  author       text not null default '',
  cover_url    text,
  status       text not null default 'to_read' check (status in ('to_read','reading','read')),
  source_key   text,
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);
alter table public.books enable row level security;
drop policy if exists "Own books" on public.books;
create policy "Own books" on public.books for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter table public.books add column if not exists notes text not null default '' check (char_length(notes) <= 5000);

alter table public.tasks add column if not exists progress smallint not null default 0 check (progress between 0 and 100);
