-- ============================================================
-- ORBIT — schema.sql (v2 — multi-user)
-- Run this in Supabase SQL editor (or via CLI: supabase db push)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- PROFILE (thin wrapper over auth.users, display info only) ----------
create table profile (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- ---------- SUBJECT ----------
-- Subjects/chapters are shared reference data (syllabus is the same for
-- everyone), not per-user rows. Saves you re-entering the syllabus 10 times.
create table subject (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now()
);

-- ---------- CHAPTER ----------
create table chapter (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid not null references subject(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- ---------- USER_CHAPTER_PROGRESS ----------
-- Confidence/mastery is a property of (user, chapter), not chapter alone.
-- This is the fix for the biggest issue in v1 now that it's multi-user.
create table user_chapter_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references chapter(id) on delete cascade,
  confidence_score int not null default 50 check (confidence_score between 0 and 100),
  mastery_level text not null default 'learning' check (mastery_level in ('learning','practicing','confident','mastered')),
  last_revised_at timestamptz,
  unique (user_id, chapter_id)
);

-- ---------- TASK (the daily planner) ----------
create table task (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references chapter(id) on delete cascade,
  title text not null,
  scheduled_date date not null,
  time_slot text not null check (time_slot in ('morning','afternoon','evening','night')),
  effort_level text not null check (effort_level in ('low','medium','high')),
  priority int not null default 2 check (priority between 1 and 3), -- 1=high 2=medium 3=low
  position int not null default 0, -- drag-reorder within a slot
  status text not null default 'pending' check (status in ('pending','completed','skipped','moved')),
  incomplete_reason text check (incomplete_reason in
    ('too_difficult','distraction','ran_out_of_time','coaching_overran','illness','bad_planning', null)),
  estimated_minutes int,
  actual_minutes int,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ---------- STUDY_SESSION ----------
-- Real elapsed time tracking, decoupled from task planning. This is what
-- lets you eventually compute "she loses focus after ~85 minutes" from
-- actual timestamps instead of self-reported estimates.
create table study_session (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references task(id) on delete set null,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  paused_seconds int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- MISTAKE ----------
create table mistake (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references chapter(id) on delete cascade,
  task_id uuid references task(id) on delete set null,
  mistake_type text not null check (mistake_type in
    ('conceptual','calculation','silly','time_pressure','misread_question')),
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  description text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- REVISION ----------
create table revision (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references chapter(id) on delete cascade,
  mistake_id uuid references mistake(id) on delete set null,
  due_date date not null,
  interval_days int not null default 1,
  review_count int not null default 0,
  success_count int not null default 0,
  failure_count int not null default 0,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- REFLECTION (one per user per day) ----------
create table reflection (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  wins text,
  blockers text,
  tomorrow_focus text,
  sleep_hours numeric(3,1),
  energy_rating int check (energy_rating between 1 and 5),
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

-- ---------- EVENT_LOG ----------
-- Generic append-only event stream. Every meaningful action gets a row here
-- IN ADDITION to its normal table write. This is what phase 2/3 pattern
-- detection and any future "AI coach" will query first — a full timeline
-- of behavior, not just current-state snapshots.
create table event_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in
    ('task_created','task_completed','task_skipped','task_moved',
     'mistake_logged','revision_completed','reflection_submitted','study_session_ended')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_task_user_date on task(user_id, scheduled_date);
create index idx_task_chapter on task(chapter_id);
create index idx_task_incomplete_reason on task(incomplete_reason) where incomplete_reason is not null;
create index idx_study_session_task on study_session(task_id);
create index idx_study_session_user on study_session(user_id, start_time);
create index idx_mistake_chapter on mistake(chapter_id);
create index idx_mistake_user on mistake(user_id);
create index idx_revision_due on revision(user_id, due_date);
create index idx_chapter_subject on chapter(subject_id);
create index idx_progress_user_chapter on user_chapter_progress(user_id, chapter_id);
create index idx_event_log_user_type on event_log(user_id, event_type, created_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- subject/chapter are shared read-only reference data (everyone can read,
-- nobody can write from the client — you seed these yourself once).
-- Every other table is strictly per-user.
-- ============================================================
alter table profile enable row level security;
alter table subject enable row level security;
alter table chapter enable row level security;
alter table user_chapter_progress enable row level security;
alter table task enable row level security;
alter table study_session enable row level security;
alter table mistake enable row level security;
alter table revision enable row level security;
alter table reflection enable row level security;
alter table event_log enable row level security;

create policy "own profile" on profile for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "read shared subjects" on subject for select using (true);
create policy "read shared chapters" on chapter for select using (true);
create policy "own rows only" on user_chapter_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on task for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on study_session for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on mistake for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on revision for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on reflection for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on event_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create a profile row whenever someone signs up via Supabase auth.
create function handle_new_user() returns trigger as $$
begin
  insert into public.profile (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
