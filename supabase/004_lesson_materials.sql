-- ============================================================
-- 004: lesson materials (PDF / Docs / Slides / Video / Link)
-- SQL Editor tab name: "04 - lesson materials". Safe to re-run.
-- ============================================================
create table if not exists public.materials (
  id           uuid primary key default gen_random_uuid(),
  module_id    uuid not null references public.modules (id) on delete cascade,
  kind         text not null check (kind in ('pdf', 'docs', 'slides', 'video', 'link')),
  title        text not null,
  url          text not null,          -- public file URL or external link
  storage_path text,                   -- set when the file is stored on Supabase
  file_name    text,
  size_bytes   bigint,
  sort_order   int  default 0,
  created_at   timestamptz default now()
);
create index if not exists materials_module_idx on public.materials (module_id, sort_order);

alter table public.materials enable row level security;
drop policy if exists "materials public read" on public.materials;
create policy "materials public read" on public.materials for select using (true);
drop policy if exists "materials owner write" on public.materials;
create policy "materials owner write" on public.materials
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

grant select on public.materials to anon, authenticated;
grant insert, update, delete on public.materials to authenticated;

-- ---------- File storage (50 MB max per file on the free plan) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'materials', 'materials', true, 52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update set public = true, file_size_limit = 52428800, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "materials files public read" on storage.objects;
create policy "materials files public read" on storage.objects
  for select using (bucket_id = 'materials');
drop policy if exists "materials files owner insert" on storage.objects;
create policy "materials files owner insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'materials' and public.is_owner());
drop policy if exists "materials files owner update" on storage.objects;
create policy "materials files owner update" on storage.objects
  for update to authenticated using (bucket_id = 'materials' and public.is_owner());
drop policy if exists "materials files owner delete" on storage.objects;
create policy "materials files owner delete" on storage.objects
  for delete to authenticated using (bucket_id = 'materials' and public.is_owner());
