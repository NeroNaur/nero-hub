-- ============================================================
-- 003: Prelim/Midterm/Finals terms + Quizlet-style flashcard sets with images
-- Run in Supabase → SQL Editor. Safe to re-run.
-- Works whether or not you ran 002_flashcards.sql.
-- ============================================================

-- ---------- Terms on lessons ----------
alter table public.modules add column if not exists term text;
alter table public.modules drop constraint if exists modules_term_check;
alter table public.modules add constraint modules_term_check check (term in ('prelim', 'midterm', 'finals'));

update public.modules set term = 'prelim'
where slug = 'lesson-1-defining-art' and term is null;

-- ---------- Flashcard sets ----------
create table if not exists public.flashcard_sets (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid not null references public.subjects (id) on delete cascade,
  term        text not null check (term in ('prelim', 'midterm', 'finals')),
  module_id   uuid references public.modules (id) on delete set null,
  title       text not null,
  description text,
  sort_order  int  default 0,
  created_at  timestamptz default now()
);
create index if not exists flashcard_sets_subject_idx on public.flashcard_sets (subject_id, term, sort_order);

-- ---------- Flashcards (cards belong to a set now) ----------
create table if not exists public.flashcards (
  id          uuid primary key default gen_random_uuid(),
  front       text not null,
  back        text not null,
  sort_order  int  default 0,
  created_at  timestamptz default now()
);
alter table public.flashcards add column if not exists set_id uuid references public.flashcard_sets (id) on delete cascade;
alter table public.flashcards add column if not exists front_image text;
alter table public.flashcards add column if not exists back_image text;
alter table public.flashcards add column if not exists module_id uuid;
alter table public.flashcards alter column module_id drop not null;
alter table public.flashcards alter column front drop not null;
alter table public.flashcards alter column back drop not null;

-- Remove the old auto-generated cards (not part of any set).
delete from public.flashcards where set_id is null;

create index if not exists flashcards_set_idx on public.flashcards (set_id, sort_order);

-- ---------- Row Level Security ----------
alter table public.flashcard_sets enable row level security;
alter table public.flashcards     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['flashcard_sets', 'flashcards'] loop
    execute format('drop policy if exists "%1$s public read" on public.%1$I', t);
    execute format('create policy "%1$s public read" on public.%1$I for select using (true)', t);
    execute format('drop policy if exists "%1$s owner write" on public.%1$I', t);
    execute format('create policy "%1$s owner write" on public.%1$I for all to authenticated using (public.is_owner()) with check (public.is_owner())', t);
  end loop;
end $$;

grant select on public.flashcard_sets, public.flashcards to anon, authenticated;
grant insert, update, delete on public.flashcard_sets, public.flashcards to authenticated;

-- ---------- Image storage (public to view, only you can upload) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('flashcard-images', 'flashcard-images', true, 2097152, array['image/webp', 'image/jpeg', 'image/png', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = 2097152;

drop policy if exists "flashcard images public read" on storage.objects;
create policy "flashcard images public read" on storage.objects
  for select using (bucket_id = 'flashcard-images');

drop policy if exists "flashcard images owner insert" on storage.objects;
create policy "flashcard images owner insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'flashcard-images' and public.is_owner());

drop policy if exists "flashcard images owner update" on storage.objects;
create policy "flashcard images owner update" on storage.objects
  for update to authenticated using (bucket_id = 'flashcard-images' and public.is_owner());

drop policy if exists "flashcard images owner delete" on storage.objects;
create policy "flashcard images owner delete" on storage.objects
  for delete to authenticated using (bucket_id = 'flashcard-images' and public.is_owner());
