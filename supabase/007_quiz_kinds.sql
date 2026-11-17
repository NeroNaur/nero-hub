-- ============================================================
-- 007: mock exams & prepared mock quizzes live in the quizzes table
-- SQL Editor tab name: "07 - mock exams & quizzes". Safe to re-run.
-- ============================================================
alter table public.quizzes add column if not exists kind text not null default 'quiz';
alter table public.quizzes drop constraint if exists quizzes_kind_check;
alter table public.quizzes add constraint quizzes_kind_check check (kind in ('quiz', 'mock_quiz', 'mock_exam'));
create index if not exists quizzes_kind_idx on public.quizzes (subject_id, kind, term);
