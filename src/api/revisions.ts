import { supabase } from '@/lib/supabase/client';
import { addDays, format } from 'date-fns';
import { logEvent } from '@/api/events';
import { calculateAdaptiveInterval, type ReviewGrade } from '@/lib/spacedRepetition';
import { getLocalRevisions, saveLocalRevision, type LocalRevision } from '@/lib/db';
import { getCurriculumChapters } from '@/lib/curriculumData';

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

/**
 * Starter seed revisions when student enters Orbit fresh
 */
function getStarterRevisions(userId: string): LocalRevision[] {
  const today = format(new Date(), 'yyyy-MM-dd');
  return [
    {
      id: 'rev-seed-1',
      user_id: userId,
      chapter_id: 'jee-phy-6', // Rotational Dynamics
      due_date: today,
      interval_days: 1,
      review_count: 2,
      success_count: 1,
      failure_count: 1,
      last_reviewed_at: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'rev-seed-2',
      user_id: userId,
      chapter_id: 'cs-dsa-7', // Dynamic Programming
      due_date: today,
      interval_days: 3,
      review_count: 1,
      success_count: 1,
      failure_count: 0,
      last_reviewed_at: null,
      created_at: new Date().toISOString(),
    },
  ];
}

export async function getDueRevisions(userId: string, onOrBefore: string): Promise<DueRevisionRow[]> {
  // 1. Instant local read from IndexedDB (0ms latency)
  let localList = await getLocalRevisions(userId);

  // If local revision list is totally empty, seed starter items
  if (localList.length === 0) {
    const starters = getStarterRevisions(userId);
    for (const st of starters) {
      await saveLocalRevision(st);
    }
    localList = starters;
  }

  const chapters = getCurriculumChapters('all');
  const chapterMap = new Map(chapters.map((c) => [c.id, c]));

  const localDue: DueRevisionRow[] = localList
    .filter((r) => r.due_date <= onOrBefore)
    .map((r) => {
      const chap = chapterMap.get(r.chapter_id);
      return {
        id: r.id,
        due_date: r.due_date,
        interval_days: r.interval_days,
        review_count: r.review_count,
        success_count: r.success_count,
        failure_count: r.failure_count,
        chapter_id: r.chapter_id,
        chapter_name: chap?.name ?? 'Key Concept Drill',
        subject_name: chap?.subjectName ?? 'STEM',
      };
    });

  // 2. Background cloud sync if online
  if (userId) {
    try {
      const { data, error } = await Promise.race([
        supabase
          .from('revision')
          .select(
            `id, due_date, interval_days, review_count, success_count, failure_count,
             chapter:chapter_id ( id, name, subject:subject_id ( name ) )`
          )
          .eq('user_id', userId)
          .lte('due_date', onOrBefore)
          .order('due_date', { ascending: true }),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 800)),
      ]);

      if (!error && data && data.length > 0) {
        for (const r of data as any[]) {
          await saveLocalRevision({
            id: r.id,
            user_id: userId,
            chapter_id: r.chapter?.id ?? r.chapter_id,
            due_date: r.due_date,
            interval_days: r.interval_days,
            review_count: r.review_count,
            success_count: r.success_count,
            failure_count: r.failure_count,
            last_reviewed_at: r.last_reviewed_at ?? null,
            created_at: new Date().toISOString(),
          });
        }
        return (data as any[]).map((r) => ({
          id: r.id,
          due_date: r.due_date,
          interval_days: r.interval_days,
          review_count: r.review_count,
          success_count: r.success_count,
          failure_count: r.failure_count,
          chapter_id: r.chapter?.id ?? r.chapter_id,
          chapter_name: r.chapter?.name ?? 'Key Concept Drill',
          subject_name: r.chapter?.subject?.name ?? 'STEM',
        }));
      }
    } catch {
      // Cloud sleeping or offline: seamlessly return local data
    }
  }

  return localDue;
}

/** Start tracking revision for a chapter that doesn't have a revision row yet. */
export async function ensureRevisionExists(userId: string, chapterId: string) {
  // 1. Check local Dexie first
  const localList = await getLocalRevisions(userId);
  const existingLocal = localList.find((r) => r.chapter_id === chapterId);
  if (existingLocal) return existingLocal.id;

  const newId = `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const today = format(new Date(), 'yyyy-MM-dd');

  const newRevision: LocalRevision = {
    id: newId,
    user_id: userId,
    chapter_id: chapterId,
    due_date: today,
    interval_days: 1,
    review_count: 0,
    success_count: 0,
    failure_count: 0,
    last_reviewed_at: null,
    created_at: new Date().toISOString(),
  };

  // Instant local save
  await saveLocalRevision(newRevision);

  // Background cloud sync
  if (userId) {
    Promise.resolve(
      supabase
        .from('revision')
        .insert({
          id: newId,
          user_id: userId,
          chapter_id: chapterId,
          due_date: today,
          interval_days: 1,
        } as never)
        .select('id')
        .single()
    ).catch(() => {});
  }

  return newId;
}

/** Mark a revision reviewed, calculate adaptive interval via FSRS, and reschedule the next session. */
export async function completeRevision(
  userId: string,
  revisionId: string,
  wasSuccessful: boolean,
  unresolvedMistakeCount: number,
  grade: ReviewGrade = wasSuccessful ? 'good' : 'failed'
) {
  // 1. Fetch current revision from local Dexie
  const localList = await getLocalRevisions(userId);
  const current = localList.find((r) => r.id === revisionId) || {
    id: revisionId,
    user_id: userId,
    chapter_id: '',
    due_date: format(new Date(), 'yyyy-MM-dd'),
    interval_days: 1,
    review_count: 0,
    success_count: 0,
    failure_count: 0,
    last_reviewed_at: null,
    created_at: new Date().toISOString(),
  };

  // 2. Compute next interval dynamically using adaptive spaced repetition
  const nextInterval = calculateAdaptiveInterval({
    currentInterval: current.interval_days,
    reviewCount: current.review_count,
    wasSuccessful,
    grade,
    unresolvedMistakeCount,
  });

  const nextDueDate = format(addDays(new Date(), nextInterval), 'yyyy-MM-dd');

  const updatedRevision: LocalRevision = {
    ...current,
    interval_days: nextInterval,
    due_date: nextDueDate,
    review_count: current.review_count + 1,
    success_count: current.success_count + (wasSuccessful ? 1 : 0),
    failure_count: current.failure_count + (wasSuccessful ? 0 : 1),
    last_reviewed_at: new Date().toISOString(),
  };

  // 3. Instant local update in IndexedDB
  await saveLocalRevision(updatedRevision);

  // 4. Background cloud sync
  if (userId) {
    Promise.resolve(
      supabase
        .from('revision')
        .update({
          last_reviewed_at: updatedRevision.last_reviewed_at,
          interval_days: nextInterval,
          due_date: nextDueDate,
          review_count: updatedRevision.review_count,
          success_count: updatedRevision.success_count,
          failure_count: updatedRevision.failure_count,
        } as never)
        .eq('id', revisionId)
    ).catch(() => {});

    Promise.resolve(
      logEvent(userId, 'revision_completed', {
        revision_id: revisionId,
        was_successful: wasSuccessful,
        grade,
        next_interval: nextInterval,
      })
    ).catch(() => {});
  }

  return updatedRevision;
}
