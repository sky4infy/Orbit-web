# Orbit — web app (Next.js + Supabase + PWA)

## Architecture
```
Next.js (App Router) + TypeScript + TailwindCSS
Supabase (Postgres + Auth)
Deployed on Vercel
Installable as a PWA on phone or laptop — no App Store needed
```

## What you need (one-time)
1. **Node.js LTS** — nodejs.org
2. **Supabase account** — supabase.com (sign up, new project)
3. **Vercel account** — vercel.com (sign up with GitHub — needed for deployment)
4. A **GitHub account**, if you don't have one

## Setup

### 1. Supabase project
- New project on supabase.com
- SQL Editor → run, **in this order**:
  1. `supabase/schema.sql`
  2. `supabase/migrations/002_journey.sql`
  3. `supabase/migrations/003_exams.sql`
  4. `supabase/seed.sql` — **required**, not optional. This seeds a starter
     Physics/Chemistry/Maths/Biology syllabus. Without it every "Add"
     button in the app (task, mistake, test) stays disabled, because
     there are no chapters to attach anything to. Edit the chapter lists
     in this file first if you want a different syllabus — it's plain
     SQL, safe to re-run.
- Settings → API → copy the **Project URL** and **anon public key**.
  The Project URL must be the bare `https://xxxxx.supabase.co` — do
  **not** append `/rest/v1/` or any other path to it; the Supabase SDK
  appends its own paths (`/auth/v1/`, `/rest/v1/`, etc.) itself, so a
  URL that already has a path on it silently breaks sign-up/login.
- Auth → Providers → Email: for fast local testing, you can turn off
  "Confirm email" so `signUp()` returns a usable session immediately
  instead of requiring a verification click first.

### 2. Local env
```bash
cp .env.example .env.local
```
Paste in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
`.env.local` is gitignored — never commit it.

### 3. Install and run
```bash
npm install
npm run dev
```
Open **http://localhost:3000**.

## Using it
- `/login` — sign up (creates a Supabase auth user + a `profile` row via
  the `handle_new_user` trigger) or log in.
- `/planner` — today's tasks, day-completion ring, streak/level, add/edit/
  complete/skip/move tasks.
- `/journey` — syllabus by subject, chapter status + confidence, notes,
  mistakes and revision info per chapter.
- `/week` — 7-day overview, upcoming tests with syllabus-coverage tracking.
- `/mistakes` — log mistakes, resolve them, spaced-repetition revision
  queue (due chapters, self-assessed recall).
- `/profile` — display name, streak, level, sign out.

`middleware.ts` protects all of the above behind auth and bounces signed-
out visitors to `/login`.

## What's here
- `supabase/schema.sql` — core schema (multi-user, RLS on every per-user
  table, `event_log` for a full behavioral timeline, `study_session` for
  future focus-duration analytics)
- `supabase/migrations/002_journey.sql` — richer chapter status lifecycle
  + `my_chapter_status` / `my_subject_progress` views
- `supabase/migrations/003_exams.sql` — exams/tests + syllabus linking +
  `my_exam_readiness` view
- `supabase/seed.sql` — starter subject/chapter reference data
- `src/api/` — one file per domain (`tasks`, `mistakes`, `revisions`,
  `journey`, `exams`, `gamification`, `study_sessions`, `events`,
  `profile`, `chapters`) — all Supabase calls live here, not in components
- `src/components/` — UI; most are wired into a page. `OrbitMasteryMap.tsx`,
  `WeakSpotsPanel.tsx`, and `TimelineView.tsx` are earlier-iteration pieces
  that aren't currently imported anywhere — safe to delete or wire into a
  page if you want them back.

## What's deliberately not built yet
- `study_session` has full API support (`startStudySession`,
  `endStudySession`, `getAverageSessionLength`) but no UI timer calls it
  yet — needed for the "loses focus after ~85 minutes" style insight
  mentioned in the product doc, but that needs real usage data first
  anyway.
- Any predictive/AI logic. Deterministic rules only for now (never exceed
  available hours, never silently drop revision, etc.) — the plan is to
  run this for a few weeks per user before layering AI on top, per the
  product philosophy: build the structured academic memory first, add the
  mentor second.

## Deploying so everyone can use it
1. Push to a GitHub repo (`.gitignore` already excludes `node_modules`,
   `.next`, and `.env*.local` — only source gets committed):
   ```bash
   git init
   git add .
   git commit -m "orbit v1"
   git remote add origin <your-empty-github-repo-url>
   git push -u origin main
   ```
2. On vercel.com → **Add New Project** → import that repo
3. Project settings → **Environment Variables** → add
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same
   values as `.env.local`)
4. Deploy. Vercel gives you a URL like `orbit-yourname.vercel.app`.
5. Everyone opens that link, signs up with their own email/password, and
   can "Add to Home Screen" (Safari share menu on iPhone, install icon in
   Chrome) for a real app-icon feel — no App Store involved.
