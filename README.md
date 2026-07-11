# Orbit — web app (Next.js + Supabase + PWA)

## Architecture
```
Next.js (App Router) + TypeScript + TailwindCSS
Supabase (Postgres + Auth, same schema as before)
Deployed on Vercel
Installable as a PWA on phone or laptop — no App Store needed
```

## What you need (browser, one-time)
1. **Node.js LTS** — nodejs.org
2. **Supabase account** — supabase.com (sign up, new project)
3. **Vercel account** — vercel.com (sign up with GitHub — needed for deployment)
4. A **GitHub account**, if you don't have one — you'll push this folder there so Vercel can deploy it

## In VS Code

### 1. Open the project
Unzip `orbit-web.zip` → `File → Open Folder` → open terminal (`` Ctrl+` ``).

### 2. Supabase — same as before
- New project on supabase.com
- SQL Editor → paste all of `supabase/schema.sql` → Run
- Settings → API → copy Project URL + anon key

### 3. Local env
```bash
cp .env.example .env.local
```
Paste the URL + anon key in. (Next.js uses `.env.local`, not `.env`.)

### 4. Install and run locally
```bash
npm install
npm run dev
```
Open **http://localhost:3000** in your browser — that's the whole app, on your laptop, no phone needed to test.

### 5. Seed the syllabus
Same as before — Subject/Chapter rows entered once via the Supabase table editor, shared by everyone.

## Deploying so all 10 cousins can use it
1. Push this folder to a new GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "orbit v1"
   git remote add origin <your-empty-github-repo-url>
   git push -u origin main
   ```
2. On vercel.com → **Add New Project** → import that GitHub repo
3. In Vercel's project settings → **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (same values as your `.env.local`)
4. Deploy. Vercel gives you a URL like `orbit-yourname.vercel.app`.
5. Send that link to all 10 cousins. Each opens it, signs up with their own
   email/password, and can **"Add to Home Screen"** (Safari share menu on
   iPhone, or the install icon in Chrome) — it then behaves like a real app
   icon, no App Store involved.

## What's here
- `supabase/schema.sql` — identical schema (multi-user, event_log, study_session, etc.)
- `src/api/` — data-access layer: `tasks`, `mistakes`, `revisions`, `study_sessions`,
  `events`, plus two new files for the richer UI: `chapters.ts` (confidence +
  mistake density per chapter, joined in one call) and `gamification.ts`
  (streak + level, both plain aggregation over `task` — no ML involved)
- `src/components/TimelineView.tsx` — vertical morning→night schedule with a
  live "now" marker on the current time block
- `src/components/OrbitMasteryMap.tsx` — chapters rendered as orbiting dots:
  distance from center = lower confidence, dot size = open mistake count,
  color = subject. This is the piece meant to feel genuinely new — a
  glance-able map of where she's strong vs. shaky, not a spreadsheet of numbers
- `src/components/StreakAndLevel.tsx` — consecutive-day streak + a simple
  XP/level curve from completed-task count
- `src/components/WeakSpotsPanel.tsx` — top chapters by unresolved mistakes
- `src/app/planner/page.tsx` — assembles all of the above into one dashboard-
  style home screen
- `src/app/login/page.tsx`, `middleware.ts` — auth, unchanged

### Why the mastery map is empty until you seed data
It needs `chapter` rows (and ideally a `user_chapter_progress` row per
chapter, though it defaults to 50% confidence if that's missing) to have
anything to plot. Streak and level need completed `task` rows. None of this
is mocked — it's real queries against real tables, so it'll look sparse
until you've used the planner for a few days.

## What's deliberately not built yet
- Mistake log, revision queue, reflection pages — same pattern as the
  components above, calling the already-existing API files.
- An "add task" form on the planner (tasks are still added via the Supabase
  table editor for now).
- Any predictive logic (e.g. "this plan has an X% chance of completion") —
  that's phase 3, and still needs weeks of real data first. Streak/level/
  mastery map are visual, not predictive, so they didn't have to wait.
