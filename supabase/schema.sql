-- ============================================================
-- nero-hub schema
-- Run once in Supabase → SQL Editor → New query → Run.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / ON CONFLICT.
-- ============================================================

-- ---------- Owner (the only account allowed to edit) ----------
-- Step A: run this whole file once.
-- Step B: sign up once (Authentication → Users → Add user),
--         copy your user UID, then run:
--   insert into public.app_owner (user_id) values ('PASTE-YOUR-UID-HERE');
create table if not exists public.app_owner (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.app_owner where user_id = auth.uid());
$$;

-- ---------- Tables ----------
create table if not exists public.subjects (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  code        text,
  name        text not null,
  term        text,
  color       text default '#7c3aed',
  sort_order  int  default 0,
  created_at  timestamptz default now()
);

create table if not exists public.modules (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid not null references public.subjects (id) on delete cascade,
  slug        text not null,
  title       text not null,
  summary     text,
  sort_order  int  default 0,
  created_at  timestamptz default now(),
  unique (subject_id, slug)
);

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  module_id   uuid not null references public.modules (id) on delete cascade,
  title       text,
  content     text not null,            -- markdown
  sort_order  int  default 0,
  created_at  timestamptz default now()
);

create table if not exists public.questions (
  id          uuid primary key default gen_random_uuid(),
  module_id   uuid not null references public.modules (id) on delete cascade,
  type        text not null check (type in ('mcq', 'true_false', 'identification', 'enumeration')),
  prompt      text not null,
  choices     jsonb,                    -- mcq: ["A","B","C","D"]
  answer      jsonb not null,           -- mcq/identification: "text"; true_false: true/false; enumeration: ["a","b"]
  explanation text,
  difficulty  smallint default 1 check (difficulty between 1 and 3),
  created_at  timestamptz default now()
);

create table if not exists public.attempts (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid references public.subjects (id) on delete cascade,
  module_id   uuid references public.modules (id) on delete cascade,
  kind        text not null check (kind in ('practice', 'quiz', 'exam')),
  score       int  not null,
  total       int  not null,
  duration_s  int,
  answers     jsonb,
  taken_at    timestamptz default now()
);

create index if not exists modules_subject_idx   on public.modules (subject_id, sort_order);
create index if not exists reviews_module_idx    on public.reviews (module_id, sort_order);
create index if not exists questions_module_idx  on public.questions (module_id);
create index if not exists attempts_subject_idx  on public.attempts (subject_id, taken_at desc);

-- ---------- Row Level Security ----------
alter table public.app_owner enable row level security;
alter table public.subjects  enable row level security;
alter table public.modules   enable row level security;
alter table public.reviews   enable row level security;
alter table public.questions enable row level security;
alter table public.attempts  enable row level security;

-- Content: anyone can read, only the owner can write.
do $$
declare t text;
begin
  foreach t in array array['subjects', 'modules', 'reviews', 'questions'] loop
    execute format('drop policy if exists "%1$s public read" on public.%1$I', t);
    execute format('create policy "%1$s public read" on public.%1$I for select using (true)', t);
    execute format('drop policy if exists "%1$s owner write" on public.%1$I', t);
    execute format('create policy "%1$s owner write" on public.%1$I for all to authenticated using (public.is_owner()) with check (public.is_owner())', t);
  end loop;
end $$;

-- Attempts (your scores): only the owner can read or write.
drop policy if exists "attempts owner all" on public.attempts;
create policy "attempts owner all" on public.attempts
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- app_owner: nobody reads it through the API (is_owner() bypasses RLS).

-- ---------- Grants (project has "auto-expose new tables" OFF) ----------
grant usage on schema public to anon, authenticated;
grant select on public.subjects, public.modules, public.reviews, public.questions to anon, authenticated;
grant insert, update, delete on public.subjects, public.modules, public.reviews, public.questions to authenticated;
grant select, insert, update, delete on public.attempts to authenticated;
grant execute on function public.is_owner() to anon, authenticated;

-- ---------- Seed: 2nd Semester SY 2026-2027 ----------
insert into public.subjects (slug, code, name, term, color, sort_order) values
  ('art-appreciation',  'ARTAPP',    'Art Appreciation',                   'Second Semester SY 2026-2027', '#e11d48', 1),
  ('audio-design',      '6ADSE',     'Audio Design and Sound Engineering', 'Second Semester SY 2026-2027', '#0ea5e9', 2),
  ('blockchain',        'BLOCKTECH', 'Blockchain Technology',              'Second Semester SY 2026-2027', '#f59e0b', 3),
  ('rizal',             'RIZAL',     'Life and Works of Rizal',            'Second Semester SY 2026-2027', '#16a34a', 4),
  ('contemporary-world','CONWORLD',  'The Contemporary World',             'Second Semester SY 2026-2027', '#7c3aed', 5)
on conflict (slug) do nothing;
