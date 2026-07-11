import { supabase } from '@/lib/supabase/client';
import type { ChapterStatusRow, SubjectProgressRow, ChapterStatus } from '@/types/database.types';
import { logEvent } from '@/api/events';

/** One query. All aggregation (chapter counts, mastered counts, avg confidence) already done in Postgres. */
export async function getSubjectProgress(): Promise<SubjectProgressRow[]> {
  const { data, error } = await supabase
    .from('my_subject_progress')
    .select('*')
    .order('subject_name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** One query. Already joined with subject name and unresolved mistake count. */
export async function getChaptersForSubject(subjectId: string): Promise<ChapterStatusRow[]> {
  const { data, error } = await supabase
    .from('my_chapter_status')
    .select('*')
    .eq('subject_id', subjectId)
    .order('chapter_name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getChapterStatusRow(chapterId: string): Promise<ChapterStatusRow | null> {
  const { data, error } = await supabase.from('my_chapter_status').select('*').eq('chapter_id', chapterId).single();
  if (error) return null;
  return data;
}

/**
 * Everything the chapter detail screen needs, fetched in parallel rather
 * than sequentially — four independent queries, one round-trip's worth
 * of latency instead of four.
 */
export async function getChapterDetail(userId: string, chapterId: string) {
  const today = new Date().toISOString().slice(0, 10);

  const [statusRow, mistakesRes, revisionRes, todayEventsRes, recentTasksRes] = await Promise.all([
    getChapterStatusRow(chapterId),
    supabase
      .from('mistake')
      .select('id, mistake_type, difficulty, description, resolved, created_at')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('revision')
      .select('id, due_date, interval_days, review_count, success_count, failure_count, last_reviewed_at')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .maybeSingle(),
    // "what happened to this chapter today" — reads the generic event_log,
    // filtered by the jsonb chapter_id, backed by the expression index
    // from migration 002 so this stays fast as history grows.
    supabase
      .from('event_log')
      .select('event_type, metadata, created_at')
      .eq('user_id', userId)
      .eq('metadata->>chapter_id', chapterId)
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: true }),
    supabase
      .from('task')
      .select('id, title, status, scheduled_date')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .order('scheduled_date', { ascending: false })
      .limit(10),
  ]);

  if (mistakesRes.error) throw mistakesRes.error;
  if (revisionRes.error) throw revisionRes.error;
  if (todayEventsRes.error) throw todayEventsRes.error;
  if (recentTasksRes.error) throw recentTasksRes.error;

  return {
    status: statusRow,
    mistakes: mistakesRes.data ?? [],
    revision: revisionRes.data,
    todayEvents: todayEventsRes.data ?? [],
    recentTasks: recentTasksRes.data ?? [],
  };
}

/**
 * Upsert on (user_id, chapter_id) — relies on the unique constraint from
 * schema.sql, so this is one statement whether or not a progress row
 * already exists, instead of a select-then-insert-or-update dance.
 */
export async function upsertChapterProgress(
  userId: string,
  chapterId: string,
  updates: { status?: ChapterStatus; confidence_score?: number; notes?: string }
) {
  const { data, error } = await supabase
    .from('user_chapter_progress')
    .upsert(
      { user_id: userId, chapter_id: chapterId, ...updates },
      { onConflict: 'user_id,chapter_id' }
    )
    .select()
    .single();

  if (error) throw error;
  await logEvent(userId, 'chapter_status_updated', { chapter_id: chapterId, ...updates });
  return data;
}
