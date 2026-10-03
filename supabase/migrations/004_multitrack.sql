-- ============================================================
-- ORBIT — migration 004: Multi-Track Curriculum & User Topics
-- Supports JEE/NSEP (Class 11) & College CS / AI-ML (3rd Year)
-- ============================================================

-- 1. Add track column to subject table
alter table subject add column if not exists track text not null default 'jee_nsep';

-- 2. Allow user-defined custom subjects/chapters alongside shared ones
alter table subject add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table chapter add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- 3. Update RLS policies so users can see shared subjects + their own custom ones
drop policy if exists "read shared subjects" on subject;
create policy "read shared and own subjects" on subject
  for select using (user_id is null or auth.uid() = user_id);

drop policy if exists "create own subjects" on subject;
create policy "create own subjects" on subject
  for insert with check (auth.uid() = user_id);

drop policy if exists "read shared chapters" on chapter;
create policy "read shared and own chapters" on chapter
  for select using (user_id is null or auth.uid() = user_id);

drop policy if exists "create own chapters" on chapter;
create policy "create own chapters" on chapter
  for insert with check (auth.uid() = user_id);

-- 4. Index on track
create index if not exists idx_subject_track on subject(track);
create index if not exists idx_subject_user on subject(user_id);
create index if not exists idx_chapter_user on chapter(user_id);
