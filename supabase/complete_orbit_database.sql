-- ============================================================
-- ORBIT — complete_orbit_database.sql (Unified Master Schema & Seed)
-- Complete, self-contained, idempotent setup for Orbit Web v2.
-- Run this in the Supabase SQL Editor (1-Click Execution).
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. BASE TABLES
-- ============================================================

-- ---------- PROFILE (User metadata wrapper) ----------
create table if not exists public.profile (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- ---------- SUBJECT (Curriculum taxonomy & Custom subjects) ----------
create table if not exists public.subject (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  track text not null default 'jee_nsep' check (track in ('jee_nsep', 'college_cs_aiml', 'all')),
  created_at timestamptz not null default now(),
  constraint subject_name_unique unique (name)
);

-- ---------- CHAPTER (Syllabus chapters & Custom chapters) ----------
create table if not exists public.chapter (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subject(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint chapter_subject_name_unique unique (subject_id, name)
);

-- ---------- USER_CHAPTER_PROGRESS (Personal mastery & confidence) ----------
create table if not exists public.user_chapter_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references public.chapter(id) on delete cascade,
  confidence_score int not null default 50 check (confidence_score between 0 and 100),
  status text not null default 'not_started' check (
    status in ('not_started', 'learning', 'practicing', 'revision_due', 'mastered', 'locked')
  ),
  notes text,
  last_revised_at timestamptz,
  created_at timestamptz not null default now(),
  constraint user_chapter_unique unique (user_id, chapter_id)
);

-- ---------- TASK (Daily Planner) ----------
create table if not exists public.task (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references public.chapter(id) on delete cascade,
  title text not null,
  scheduled_date date not null,
  time_slot text not null check (time_slot in ('morning', 'afternoon', 'evening', 'night')),
  effort_level text not null check (effort_level in ('low', 'medium', 'high')),
  priority int not null default 2 check (priority between 1 and 3), -- 1=high 2=medium 3=low
  position int not null default 0,
  status text not null default 'pending' check (status in ('pending', 'completed', 'skipped', 'moved')),
  incomplete_reason text check (incomplete_reason in (
    'too_difficult', 'distraction', 'ran_out_of_time',
    'coaching_overran', 'illness', 'bad_planning', null
  )),
  estimated_minutes int default 45,
  actual_minutes int,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ---------- STUDY_SESSION (Focus Timer Logs) ----------
create table if not exists public.study_session (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.task(id) on delete set null,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  paused_seconds int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- MISTAKE (Error Taxonomy & Mistake Book) ----------
create table if not exists public.mistake (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references public.chapter(id) on delete cascade,
  task_id uuid references public.task(id) on delete set null,
  mistake_type text not null check (mistake_type in (
    'conceptual', 'calculation', 'silly', 'time_pressure', 'misread_question',
    'tle', 'corner_case', 'logic_flaw', 'memory_oom'
  )),
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  description text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- REVISION (Spaced Repetition & Forgetting Curve) ----------
create table if not exists public.revision (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references public.chapter(id) on delete cascade,
  mistake_id uuid references public.mistake(id) on delete set null,
  due_date date not null,
  interval_days int not null default 1,
  review_count int not null default 0,
  success_count int not null default 0,
  failure_count int not null default 0,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint user_chapter_revision_unique unique (user_id, chapter_id)
);

-- ---------- REFLECTION (Daily Fatigue & Energy Logs) ----------
create table if not exists public.reflection (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  wins text,
  blockers text,
  tomorrow_focus text,
  sleep_hours numeric(3,1),
  energy_rating int check (energy_rating between 1 and 5),
  created_at timestamptz not null default now(),
  constraint user_day_reflection_unique unique (user_id, day)
);

-- ---------- EVENT_LOG (Behavioral Event Stream) ----------
create table if not exists public.event_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in (
    'task_created', 'task_completed', 'task_skipped', 'task_moved',
    'mistake_logged', 'revision_completed', 'reflection_submitted',
    'study_session_ended', 'chapter_status_updated'
  )),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------- EXAM (Target Milestones & Countdown) ----------
create table if not exists public.exam (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  exam_type text not null check (exam_type in (
    'jee_main', 'jee_advanced', 'nsep', 'iiser', 'coaching_test', 'school_test',
    'college_contest', 'hackathon', 'midsem', 'other'
  )),
  exam_date date not null,
  created_at timestamptz not null default now()
);

-- ---------- EXAM_CHAPTER (Exam Scope Join Table) ----------
create table if not exists public.exam_chapter (
  exam_id uuid not null references public.exam(id) on delete cascade,
  chapter_id uuid not null references public.chapter(id) on delete cascade,
  primary key (exam_id, chapter_id)
);

-- ============================================================
-- 2. PERFORMANCE INDEXES
-- ============================================================

create index if not exists idx_subject_track on public.subject(track);
create index if not exists idx_subject_user on public.subject(user_id);
create index if not exists idx_chapter_subject on public.chapter(subject_id);
create index if not exists idx_chapter_user on public.chapter(user_id);
create index if not exists idx_progress_user_chapter on public.user_chapter_progress(user_id, chapter_id);
create index if not exists idx_task_user_date on public.task(user_id, scheduled_date);
create index if not exists idx_task_chapter on public.task(chapter_id);
create index if not exists idx_task_incomplete_reason on public.task(incomplete_reason) where incomplete_reason is not null;
create index if not exists idx_study_session_user on public.study_session(user_id, start_time);
create index if not exists idx_mistake_user on public.mistake(user_id);
create index if not exists idx_mistake_chapter on public.mistake(chapter_id);
create index if not exists idx_revision_due on public.revision(user_id, due_date);
create index if not exists idx_reflection_user_day on public.reflection(user_id, day);
create index if not exists idx_exam_user_date on public.exam(user_id, exam_date);
create index if not exists idx_event_log_user_type on public.event_log(user_id, event_type, created_at);
create index if not exists idx_event_log_chapter_id on public.event_log((metadata ->> 'chapter_id'));

-- ============================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.profile enable row level security;
alter table public.subject enable row level security;
alter table public.chapter enable row level security;
alter table public.user_chapter_progress enable row level security;
alter table public.task enable row level security;
alter table public.study_session enable row level security;
alter table public.mistake enable row level security;
alter table public.revision enable row level security;
alter table public.reflection enable row level security;
alter table public.event_log enable row level security;
alter table public.exam enable row level security;
alter table public.exam_chapter enable row level security;

-- Profiles: Own profile only
drop policy if exists "own profile" on public.profile;
create policy "own profile" on public.profile for all
  using (auth.uid() = id) with check (auth.uid() = id);

-- Subjects: Public curriculum or own custom subjects
drop policy if exists "read shared and own subjects" on public.subject;
create policy "read shared and own subjects" on public.subject for select
  using (user_id is null or auth.uid() = user_id);

drop policy if exists "create own subjects" on public.subject;
create policy "create own subjects" on public.subject for insert
  with check (auth.uid() = user_id);

drop policy if exists "delete own subjects" on public.subject;
create policy "delete own subjects" on public.subject for delete
  using (auth.uid() = user_id);

-- Chapters: Public syllabus or own custom chapters
drop policy if exists "read shared and own chapters" on public.chapter;
create policy "read shared and own chapters" on public.chapter for select
  using (user_id is null or auth.uid() = user_id);

drop policy if exists "create own chapters" on public.chapter;
create policy "create own chapters" on public.chapter for insert
  with check (auth.uid() = user_id);

drop policy if exists "delete own chapters" on public.chapter;
create policy "delete own chapters" on public.chapter for delete
  using (auth.uid() = user_id);

-- User-scoped private tables
drop policy if exists "own rows only" on public.user_chapter_progress;
create policy "own rows only" on public.user_chapter_progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on public.task;
create policy "own rows only" on public.task for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on public.study_session;
create policy "own rows only" on public.study_session for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on public.mistake;
create policy "own rows only" on public.mistake for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on public.revision;
create policy "own rows only" on public.revision for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on public.reflection;
create policy "own rows only" on public.reflection for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on public.event_log;
create policy "own rows only" on public.event_log for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on public.exam;
create policy "own rows only" on public.exam for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Exam Chapter: Ownership via parent exam row
drop policy if exists "own exam chapters only" on public.exam_chapter;
create policy "own exam chapters only" on public.exam_chapter for all
  using (exists (select 1 from public.exam e where e.id = exam_chapter.exam_id and e.user_id = auth.uid()))
  with check (exists (select 1 from public.exam e where e.id = exam_chapter.exam_id and e.user_id = auth.uid()));

-- ============================================================
-- 4. AUTH TRIGGER (Auto profile on signup)
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profile (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 5. ACCELERATED VIEWS (Computed once in Postgres)
-- ============================================================

drop view if exists public.my_chapter_status cascade;
create view public.my_chapter_status with (security_invoker = on) as
select
  c.id as chapter_id,
  c.name as chapter_name,
  c.subject_id,
  s.name as subject_name,
  s.track,
  coalesce(ucp.status, 'not_started') as status,
  coalesce(ucp.confidence_score, 50) as confidence_score,
  ucp.notes,
  ucp.last_revised_at,
  (
    select count(*) from public.mistake m
    where m.chapter_id = c.id and m.user_id = auth.uid() and m.resolved = false
  ) as unresolved_mistakes
from public.chapter c
join public.subject s on s.id = c.subject_id
left join public.user_chapter_progress ucp on ucp.chapter_id = c.id and ucp.user_id = auth.uid();

drop view if exists public.my_subject_progress cascade;
create view public.my_subject_progress with (security_invoker = on) as
select
  subject_id,
  subject_name,
  track,
  count(*) as total_chapters,
  count(*) filter (where status = 'mastered') as mastered_count,
  count(*) filter (where status = 'revision_due') as revision_due_count,
  round(avg(confidence_score)) as avg_confidence
from public.my_chapter_status
group by subject_id, subject_name, track;

drop view if exists public.my_exam_readiness cascade;
create view public.my_exam_readiness with (security_invoker = on) as
select
  e.id as exam_id,
  e.name,
  e.exam_type,
  e.exam_date,
  count(ec.chapter_id) as total_chapters,
  count(ec.chapter_id) filter (where ucp.status = 'mastered') as mastered_chapters,
  coalesce(round(avg(ucp.confidence_score)), 0) as avg_confidence
from public.exam e
left join public.exam_chapter ec on ec.exam_id = e.id
left join public.user_chapter_progress ucp on ucp.chapter_id = ec.chapter_id and ucp.user_id = e.user_id
group by e.id, e.name, e.exam_type, e.exam_date;

-- ============================================================
-- 6. SYLLABUS SEED DATA (JEE / NSEP + College CS / AI-ML)
-- ============================================================

-- Track 1: JEE & Olympiad STEM Subjects
insert into public.subject (name, track) values
  ('Physics', 'jee_nsep'),
  ('Chemistry', 'jee_nsep'),
  ('Mathematics', 'jee_nsep')
on conflict (name) do update set track = excluded.track;

-- Track 2: College CS & AI/ML Subjects
insert into public.subject (name, track) values
  ('Data Structures & Algorithms', 'college_cs_aiml'),
  ('AI & Machine Learning', 'college_cs_aiml'),
  ('Web Development & Systems', 'college_cs_aiml'),
  ('Core Computer Science', 'college_cs_aiml')
on conflict (name) do update set track = excluded.track;

-- Chapters: Physics
insert into public.chapter (subject_id, name)
select s.id, c.name
from public.subject s
cross join (values
  ('Units, Dimensions & Error Analysis'),
  ('Vectors & Calculus in Physics'),
  ('Kinematics: 1D & 2D Motion'),
  ('Newton Laws of Motion & Friction'),
  ('Work, Energy & Power'),
  ('Center of Mass, Momentum & Collisions'),
  ('Rotational Dynamics & Angular Momentum (NSEP Focus)'),
  ('Gravitation & Kepler Laws'),
  ('Mechanical Properties of Solids & Fluids'),
  ('Thermal Physics & Heat Engines'),
  ('Simple Harmonic Motion (SHM)'),
  ('Mechanical Waves & Sound')
) as c(name)
where s.name = 'Physics'
on conflict (subject_id, name) do nothing;

-- Chapters: Chemistry
insert into public.chapter (subject_id, name)
select s.id, c.name
from public.subject s
cross join (values
  ('Mole Concept & Stoichiometry'),
  ('Atomic Structure & Quantum Numbers'),
  ('Chemical Bonding & Molecular Structure'),
  ('Chemical Thermodynamics'),
  ('Chemical & Ionic Equilibrium'),
  ('General Organic Chemistry (GOC)'),
  ('Hydrocarbons (Alkanes, Alkenes, Alkynes)')
) as c(name)
where s.name = 'Chemistry'
on conflict (subject_id, name) do nothing;

-- Chapters: Mathematics
insert into public.chapter (subject_id, name)
select s.id, c.name
from public.subject s
cross join (values
  ('Sets, Relations & Functions'),
  ('Quadratic Equations & Inequalities'),
  ('Sequences & Series (AP, GP, AGP)'),
  ('Permutations & Combinations'),
  ('Binomial Theorem'),
  ('Straight Lines & Circles'),
  ('Conic Sections (Parabola, Ellipse, Hyperbola)'),
  ('Trigonometric Ratios & Identities')
) as c(name)
where s.name = 'Mathematics'
on conflict (subject_id, name) do nothing;

-- Chapters: Data Structures & Algorithms
insert into public.chapter (subject_id, name)
select s.id, c.name
from public.subject s
cross join (values
  ('Arrays, Two Pointers & Sliding Window'),
  ('Binary Search & Search on Answer'),
  ('Trees, BSTs & Binary Lift'),
  ('Heaps & Priority Queues (Top-K)'),
  ('Graphs: BFS, DFS & Topological Sort'),
  ('Graphs: Dijkstra, Shortest Paths & DSU'),
  ('Dynamic Programming: 1D & Knapsack'),
  ('Dynamic Programming: 2D Grids & Strings')
) as c(name)
where s.name = 'Data Structures & Algorithms'
on conflict (subject_id, name) do nothing;

-- Chapters: AI & Machine Learning
insert into public.chapter (subject_id, name)
select s.id, c.name
from public.subject s
cross join (values
  ('Linear Algebra & SVD for ML'),
  ('Probability, Bayes Rule & Maximum Likelihood'),
  ('Python, NumPy & Vectorized Pipelines'),
  ('Classical ML: Logistic, Trees & XGBoost'),
  ('Neural Networks: Architectures & Backprop'),
  ('PyTorch: Tensors, Autograd & Training Loops'),
  ('Transformers: Self-Attention & Encoders')
) as c(name)
where s.name = 'AI & Machine Learning'
on conflict (subject_id, name) do nothing;

-- Chapters: Web Development & Systems
insert into public.chapter (subject_id, name)
select s.id, c.name
from public.subject s
cross join (values
  ('HTTP, DNS, TCP/IP & Web Networking'),
  ('Next.js 14 App Router & Server Components'),
  ('PostgreSQL Schema Design & Index Optimization'),
  ('System Design: Redis Caching & Rate Limiting')
) as c(name)
where s.name = 'Web Development & Systems'
on conflict (subject_id, name) do nothing;

-- Chapters: Core Computer Science
insert into public.chapter (subject_id, name)
select s.id, c.name
from public.subject s
cross join (values
  ('Operating Systems: Concurrency & Semaphores'),
  ('Database Internals: B-Trees & WAL Logs'),
  ('Computer Networks: Flow Control & Congestion')
) as c(name)
where s.name = 'Core Computer Science'
on conflict (subject_id, name) do nothing;
