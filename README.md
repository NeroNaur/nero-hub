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

## Each subject has
Hallway · Study · Flashcards · Practice (incl. Mock Quiz) · Mock Exam · Review (mistake bank) · Progress · Focus (Pomodoro)

Lessons and flashcard sets are grouped by term: Prelim / Midterm / Finals.
Flashcard sets are made by hand (Quizlet-style editor with images), not generated from lesson imports.

Progress, scores and the mistake bank are stored in each visitor's browser (localStorage), so classmates can use the site without accounts.

## Local dev with test data
```
VITE_MOCK=1 npm run dev
```
