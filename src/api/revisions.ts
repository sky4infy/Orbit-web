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

export async function getDueRevisions(userId: string, onOrBefore: string) {
  const { data, error } = await supabase
    .from('revision')
    .select(`id, due_date, interval_days, review_count, success_count, failure_count, chapter:chapter_id ( id, name )`)
    .eq('user_id', userId)
    .lte('due_date', onOrBefore)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data;
}

/** Mark a revision reviewed, log success/failure, and reschedule the next one. */
export async function completeRevision(userId: string, revisionId: string, wasSuccessful: boolean, unresolvedMistakeCount: number) {
  const { data: current, error: fetchErr } = await supabase
    .from('revision')
    .select('interval_days, review_count, success_count, failure_count')
    .eq('id', revisionId)
    .single();
  if (fetchErr) throw fetchErr;

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
    })
    .eq('id', revisionId)
    .select()
    .single();

  if (error) throw error;
  await logEvent(userId, 'revision_completed', { revision_id: revisionId, was_successful: wasSuccessful });
  return data;
}
