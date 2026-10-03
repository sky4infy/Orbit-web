import { supabase } from '@/lib/supabase/client';
import { addDays, format } from 'date-fns';
import { logEvent } from '@/api/events';

// v1 fixed ladder. Phase 3 replaces getNextInterval's body with a
// personalized calculation without touching any caller.
const INTERVAL_LADDER = [1, 3, 7, 16, 35];

function getNextInterval(currentIntervalDays: number, unresolvedMistakeCount: number): number {
  const idx = INTERVAL_LADDER.indexOf(currentIntervalDays);
  const nextIdx = idx === -1 ? 0 : Math.min(idx + 1, INTERVAL_LADDER.length - 1);
  const base = INTERVAL_LADDER[nextIdx];
  return unresolvedMistakeCount >= 3 ? Math.max(1, Math.floor(base / 2)) : base;
}

export interface DueRevisionRow {
  id: string;
  due_date: string;
  interval_days: number;
  review_count: number;
  success_count: number;
  failure_count: number;
  chapter_id: string;
  chapter_name: string;
  subject_name: string;
}

export async function getDueRevisions(userId: string, onOrBefore: string): Promise<DueRevisionRow[]> {
  const { data, error } = await supabase
    .from('revision')
    .select(
      `id, due_date, interval_days, review_count, success_count, failure_count,
       chapter:chapter_id ( id, name, subject:subject_id ( name ) )`
    )
    .eq('user_id', userId)
    .lte('due_date', onOrBefore)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return (data as any[]).map((r) => ({
    id: r.id,
    due_date: r.due_date,
    interval_days: r.interval_days,
    review_count: r.review_count,
    success_count: r.success_count,
    failure_count: r.failure_count,
    chapter_id: r.chapter.id,
    chapter_name: r.chapter.name,
    subject_name: r.chapter?.subject?.name ?? 'Unknown',
  }));
}

/** Start tracking revision for a chapter that doesn't have a revision row yet. */
export async function ensureRevisionExists(userId: string, chapterId: string) {
  const { data: existingRaw } = await supabase
    .from('revision')
    .select('id')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
    .maybeSingle();
  const existing = existingRaw as unknown as { id: string } | null;
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('revision')
    .insert({ user_id: userId, chapter_id: chapterId, due_date: format(new Date(), 'yyyy-MM-dd'), interval_days: 1 } as never)
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/** Mark a revision reviewed, log success/failure, and reschedule the next one. */
export async function completeRevision(userId: string, revisionId: string, wasSuccessful: boolean, unresolvedMistakeCount: number) {
  const { data: currentRaw, error: fetchErr } = await supabase
    .from('revision')
    .select('interval_days, review_count, success_count, failure_count')
    .eq('id', revisionId)
    .single();
  if (fetchErr) throw fetchErr;
  const current = currentRaw as unknown as {
    interval_days: number;
    review_count: number;
    success_count: number;
    failure_count: number;
  };

  const nextInterval = getNextInterval(current.interval_days, unresolvedMistakeCount);
  const nextDueDate = format(addDays(new Date(), nextInterval), 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('revision')
    .update({
      last_reviewed_at: new Date().toISOString(),
      interval_days: nextInterval,
      due_date: nextDueDate,
      review_count: current.review_count + 1,
      success_count: current.success_count + (wasSuccessful ? 1 : 0),
      failure_count: current.failure_count + (wasSuccessful ? 0 : 1),
    } as never)
    .eq('id', revisionId)
    .select()
    .single();

  if (error) throw error;
  await logEvent(userId, 'revision_completed', { revision_id: revisionId, was_successful: wasSuccessful });
  return data;
}
