# nero-hub

Personal study hub: per-subject modules with **Review**, **Practice**, **Mock Quiz** and **Mock Exam**.
Vue 3 + Vite + Tailwind, Supabase for data, deployed on Vercel.

## Setup
1. **Database:** open Supabase → SQL Editor, paste `supabase/schema.sql`, and run it.
2. **Owner account:** Supabase → Authentication → Users → Add user (your email). Copy the UID, then run:
   ```sql
   insert into public.app_owner (user_id) values ('YOUR-UID');
   ```
   Then turn off new signups (Authentication → Sign In / Providers).
3. **Env vars:** copy `.env.example` to `.env` (local) and add the same two values in Vercel → Settings → Environment Variables.
4. `npm install && npm run dev`

Then run `supabase/003_terms_flashcard_sets.sql` (terms, flashcard sets, image storage). `002` is optional/superseded.
Then `supabase/004_lesson_materials.sql` (lesson PDFs/docs/slides/video links + file storage).
Then `supabase/005_quizzes.sql` (class quizzes to retake / review).
Then `supabase/006_subject_settings.sql` (per-subject Hallway show/hide).
Then `supabase/007_quiz_kinds.sql` (prepared mock quizzes + mock exams).

## Each subject has
Hallway · Study · Materials · Flashcards · Practice (prepared + random mock quizzes) · Quizzes (from class) · Mock Exam (prepared) · Review (mistake bank) · Progress

Lessons and flashcard sets are grouped by term: Prelim / Midterm / Finals.
Flashcard sets are made by hand (Quizlet-style editor with images), not generated from lesson imports.

Progress, scores and the mistake bank are stored in each visitor's browser (localStorage), so classmates can use the site without accounts.

## Local dev with test data
```
VITE_MOCK=1 npm run dev
```

## Keep-alive
`api/keepalive.js` runs every 2 days (Vercel cron in `vercel.json`) and makes one tiny read
from Supabase, so the free project doesn't pause from inactivity. It uses the same
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` environment variables.

## Backups
Admin → "⬇ Backup" per subject (or "Back up all subjects"); Hallway (Edit mode) → ⬇ per lesson.
Backups use the import format, so lessons/quizzes can be re-imported with the "+ Add" boxes.
