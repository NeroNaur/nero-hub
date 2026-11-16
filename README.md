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

## Structure
```
Subject → Module → Review | Practice | Mock Quiz
Subject → Mock Exam (questions from every module)
```
