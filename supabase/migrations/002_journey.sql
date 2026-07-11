-- ============================================================
-- ORBIT — migration 002: Journey / Learning Map (Phase 2)
-- Run this in Supabase SQL editor, after schema.sql
-- ============================================================

-- 1. Richer chapter status model. Previously `mastery_level` had only
--    4 coarse states; the Journey concept needs the fuller lifecycle,
--    plus a place for free-text notes per chapter.
alter table user_chapter_progress rename column mastery_level to status;
alter table user_chapter_progress drop constraint user_chapter_progress_mastery_level_check;
alter table user_chapter_progress add constraint user_chapter_progress_status_check
  check (status in ('not_started', 'learning', 'practicing', 'revision_due', 'mastered', 'locked'));
alter table user_chapter_progress alter column status set default 'not_started';
alter table user_chapter_progress add column notes text;

-- 2. Let event_log record chapter-status edits too.
alter table event_log drop constraint event_log_event_type_check;
alter table event_log add constraint event_log_event_type_check check (event_type in (
  'task_created', 'task_completed', 'task_skipped', 'task_moved',
  'mistake_logged', 'revision_completed', 'reflection_submitted', 'study_session_ended',
  'chapter_status_updated'
));

-- 3. Expression index for "what happened to this chapter today" queries —
--    event_log.metadata is jsonb, so without this index that lookup is a
--    full scan of every event the user has ever logged.
create index idx_event_log_chapter_id on event_log ((metadata ->> 'chapter_id'));

-- ============================================================
-- 4. Views — the actual optimization.
--
-- Without these, the Journey screen would need: fetch all chapters,
-- fetch all progress rows, fetch all mistake counts, then join and
-- aggregate all of it in JavaScript — 3 round trips plus client CPU,
-- and the client has to re-implement the join logic correctly.
--
-- `security_invoker = on` is not optional here: without it, a view
-- runs with the view OWNER's permissions (which bypasses RLS), and
-- every user would see every other user's confidence/mistake data.
-- With it, the view runs as the querying user, so the RLS policies
-- on user_chapter_progress and mistake still apply per-row.
-- ============================================================

create view my_chapter_status with (security_invoker = on) as
select
  c.id as chapter_id,
  c.name as chapter_name,
  c.subject_id,
  s.name as subject_name,
  coalesce(ucp.status, 'not_started') as status,
  coalesce(ucp.confidence_score, 50) as confidence_score,
  ucp.notes,
  ucp.last_revised_at,
  (
    select count(*) from mistake m
    where m.chapter_id = c.id and m.user_id = auth.uid() and m.resolved = false
  ) as unresolved_mistakes
from chapter c
join subject s on s.id = c.subject_id
left join user_chapter_progress ucp on ucp.chapter_id = c.id and ucp.user_id = auth.uid();

create view my_subject_progress with (security_invoker = on) as
select
  subject_id,
  subject_name,
  count(*) as total_chapters,
  count(*) filter (where status = 'mastered') as mastered_count,
  count(*) filter (where status = 'revision_due') as revision_due_count,
  round(avg(confidence_score)) as avg_confidence
from my_chapter_status
group by subject_id, subject_name;
