-- ============================================================
-- ORBIT — migration 003: Tests/Exams (Phase 4)
-- Run after 002_journey.sql
-- ============================================================

create table exam (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  exam_type text not null check (exam_type in ('jee_main', 'jee_advanced', 'iiser', 'coaching_test', 'school_test', 'other')),
  exam_date date not null,
  created_at timestamptz not null default now()
);

-- Many-to-many: which chapters are in scope for this exam's syllabus.
create table exam_chapter (
  exam_id uuid not null references exam(id) on delete cascade,
  chapter_id uuid not null references chapter(id) on delete cascade,
  primary key (exam_id, chapter_id)
);

create index idx_exam_user_date on exam(user_id, exam_date);

alter table exam enable row level security;
alter table exam_chapter enable row level security;

create policy "own rows only" on exam for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- exam_chapter has no user_id of its own, so its policy checks ownership
-- via the parent exam row instead.
create policy "own exam's chapters only" on exam_chapter for all
  using (exists (select 1 from exam e where e.id = exam_chapter.exam_id and e.user_id = auth.uid()))
  with check (exists (select 1 from exam e where e.id = exam_chapter.exam_id and e.user_id = auth.uid()));

-- ============================================================
-- Readiness view — same reasoning as migration 002's views: coverage
-- (how many of an exam's chapters are mastered, and average confidence
-- across them) is computed once in Postgres, not reassembled from three
-- tables in the browser every time the Week/Tests screen loads.
-- security_invoker = on so RLS on exam/user_chapter_progress still
-- applies per requesting user.
-- ============================================================
create view my_exam_readiness with (security_invoker = on) as
select
  e.id as exam_id,
  e.name,
  e.exam_type,
  e.exam_date,
  count(ec.chapter_id) as total_chapters,
  count(ec.chapter_id) filter (where ucp.status = 'mastered') as mastered_chapters,
  coalesce(round(avg(ucp.confidence_score)), 0) as avg_confidence
from exam e
left join exam_chapter ec on ec.exam_id = e.id
left join user_chapter_progress ucp on ucp.chapter_id = ec.chapter_id and ucp.user_id = e.user_id
group by e.id, e.name, e.exam_type, e.exam_date;
