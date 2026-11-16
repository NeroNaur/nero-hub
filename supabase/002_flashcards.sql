-- ============================================================
-- 002: flashcards table
-- Run in Supabase → SQL Editor after schema.sql. Safe to re-run.
-- ============================================================
create table if not exists public.flashcards (
  id          uuid primary key default gen_random_uuid(),
  module_id   uuid not null references public.modules (id) on delete cascade,
  front       text not null,
  back        text not null,
  sort_order  int  default 0,
  created_at  timestamptz default now()
);

create index if not exists flashcards_module_idx on public.flashcards (module_id, sort_order);

alter table public.flashcards enable row level security;

drop policy if exists "flashcards public read" on public.flashcards;
create policy "flashcards public read" on public.flashcards for select using (true);

drop policy if exists "flashcards owner write" on public.flashcards;
create policy "flashcards owner write" on public.flashcards
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

grant select on public.flashcards to anon, authenticated;
grant insert, update, delete on public.flashcards to authenticated;
