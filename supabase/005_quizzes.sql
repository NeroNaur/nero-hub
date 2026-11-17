-- ============================================================
-- 005: class quizzes (the real quizzes from class, to retake / review)
-- SQL Editor tab name: "05 - quizzes". Safe to re-run.
-- ============================================================
create table if not exists public.quizzes (
  id             uuid primary key default gen_random_uuid(),
  subject_id     uuid not null references public.subjects (id) on delete cascade,
  term           text not null check (term in ('prelim', 'midterm', 'finals')),
  title          text not null,
  quiz_date      date,
  note           text,
  time_limit_min int,
  module_ids     uuid[] not null default '{}',   -- lessons it covered (optional)
  sort_order     int  default 0,
  created_at     timestamptz default now()
);
create index if not exists quizzes_subject_idx on public.quizzes (subject_id, term, quiz_date desc);

create table if not exists public.quiz_questions (
  id          uuid primary key default gen_random_uuid(),
  quiz_id     uuid not null references public.quizzes (id) on delete cascade,
  type        text not null check (type in ('mcq', 'true_false', 'identification', 'enumeration')),
  prompt      text not null,
  choices     jsonb,
  answer      jsonb not null,
  explanation text,
  sort_order  int default 0,
  created_at  timestamptz default now()
);
create index if not exists quiz_questions_quiz_idx on public.quiz_questions (quiz_id, sort_order);

alter table public.quizzes        enable row level security;
alter table public.quiz_questions enable row level security;

do $$
declare t text;
begin
  foreach t in array array['quizzes', 'quiz_questions'] loop
    execute format('drop policy if exists "%1$s public read" on public.%1$I', t);
    execute format('create policy "%1$s public read" on public.%1$I for select using (true)', t);
    execute format('drop policy if exists "%1$s owner write" on public.%1$I', t);
    execute format('create policy "%1$s owner write" on public.%1$I for all to authenticated using (public.is_owner()) with check (public.is_owner())', t);
  end loop;
end $$;

grant select on public.quizzes, public.quiz_questions to anon, authenticated;
grant insert, update, delete on public.quizzes, public.quiz_questions to authenticated;
