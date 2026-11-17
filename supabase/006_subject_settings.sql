-- ============================================================
-- 006: per-subject settings (e.g. which Hallway sections are shown)
-- SQL Editor tab name: "06 - subject settings". Safe to re-run.
-- ============================================================
alter table public.subjects add column if not exists settings jsonb not null default '{}'::jsonb;
