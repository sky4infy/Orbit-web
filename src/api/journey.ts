import { supabase } from '@/lib/supabase/client';
import type { ChapterStatusRow, SubjectProgressRow, ChapterStatus, TrackType } from '@/types/database.types';
import { logEvent } from '@/api/events';
import {
  resolveChapterId,
  resolveSubjectId,
  saveChapterOverride,
  addCustomSubject,
  addCustomChapter,
  deleteSubject as deleteLocalSubject,
  deleteChapter as deleteLocalChapter,
  computeConfidence,
} from '@/lib/curriculumData';

/** One query. All aggregation (chapter counts, mastered counts, avg confidence) already done in Postgres. */
export async function getSubjectProgress(track?: string): Promise<SubjectProgressRow[]> {
  let query = supabase.from('my_subject_progress').select('*');
  if (track && track !== 'all') {
    query = query.eq('track', track);
  }
  const { data, error } = await query.order('subject_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as SubjectProgressRow[];
}

/** One query. Already joined with subject name and unresolved mistake count. */
export async function getChaptersForSubject(subjectId: string): Promise<ChapterStatusRow[]> {
  const validSubjectId = resolveSubjectId(subjectId);
  const { data, error } = await supabase
    .from('my_chapter_status')
    .select('*')
    .eq('subject_id', validSubjectId)
    .order('chapter_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ChapterStatusRow[];
}

export async function getChapterStatusRow(chapterId: string): Promise<ChapterStatusRow | null> {
  const validChapterId = resolveChapterId(chapterId);
  const { data, error } = await supabase.from('my_chapter_status').select('*').eq('chapter_id', validChapterId).single();
  if (error) return null;
  return data as unknown as ChapterStatusRow;
}

export async function getChapterDetail(userId: string, chapterId: string) {
  const validChapterId = resolveChapterId(chapterId);
  const today = new Date().toISOString().slice(0, 10);

  const [statusRow, mistakesRes, revisionRes, todayEventsRes, recentTasksRes] = await Promise.all([
    getChapterStatusRow(validChapterId),
    supabase
      .from('mistake')
      .select('id, mistake_type, difficulty, description, resolved, created_at')
      .eq('user_id', userId)
      .eq('chapter_id', validChapterId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('revision')
      .select('id, due_date, interval_days, review_count, success_count, failure_count, last_reviewed_at')
      .eq('user_id', userId)
      .eq('chapter_id', validChapterId)
      .maybeSingle(),
    supabase
      .from('event_log')
      .select('event_type, metadata, created_at')
      .eq('user_id', userId)
      .eq('metadata->>chapter_id', validChapterId)
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: true }),
    supabase
      .from('task')
      .select('id, title, status, scheduled_date')
      .eq('user_id', userId)
      .eq('chapter_id', validChapterId)
      .order('scheduled_date', { ascending: false })
      .limit(10),
  ]);

  if (mistakesRes.error) throw mistakesRes.error;
  if (revisionRes.error) throw revisionRes.error;
  if (todayEventsRes.error) throw todayEventsRes.error;
  if (recentTasksRes.error) throw recentTasksRes.error;

  return {
    status: statusRow,
    mistakes: (mistakesRes.data ?? []) as unknown as {
      id: string; mistake_type: string; difficulty: string; description: string | null;
      resolved: boolean; created_at: string;
    }[],
    revision: revisionRes.data as unknown as {
      id: string; due_date: string; interval_days: number;
      review_count: number; success_count: number; failure_count: number; last_reviewed_at: string | null;
    } | null,
    todayEvents: (todayEventsRes.data ?? []) as unknown as {
      event_type: string; metadata: Record<string, unknown>; created_at: string;
    }[],
    recentTasks: (recentTasksRes.data ?? []) as unknown as {
      id: string; title: string; status: string; scheduled_date: string;
    }[],
  };
}

/**
 * Upsert on (user_id, chapter_id) in Supabase and sync local state.
 */
export async function upsertChapterProgress(
  userId: string,
  chapterId: string,
  updates: { status?: ChapterStatus; confidence_score?: number; notes?: string }
) {
  const validChapterId = resolveChapterId(chapterId);
  saveChapterOverride(validChapterId, {
    status: updates.status,
    confidence: updates.confidence_score,
  });

  const { data, error } = await supabase
    .from('user_chapter_progress')
    .upsert(
      { user_id: userId, chapter_id: validChapterId, ...updates } as never,
      { onConflict: 'user_id,chapter_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Supabase progress upsert error:', error);
  } else {
    logEvent(userId, 'chapter_status_updated', { chapter_id: validChapterId, ...updates }).catch(() => {});
  }

  return data;
}

/**
 * Create a custom subject in Supabase and update local storage.
 */
export async function createCustomSubject(userId: string, name: string, track: TrackType) {
  const trimmed = name.trim();
  // 1. Save locally for instant UI response
  const local = addCustomSubject(trimmed, track);

  // 2. Cloud insert
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('subject')
        .insert({
          name: trimmed,
          track: track === 'all' ? 'jee_nsep' : track,
          user_id: userId,
        } as never)
        .select()
        .single();

      if (!error && data) {
        return data as { id: string; name: string; track: TrackType };
      }
      if (error) {
        console.warn('Supabase custom subject insert error:', error);
      }
    } catch (err) {
      console.warn('Supabase subject insert failed, keeping local:', err);
    }
  }

  return local;
}

/**
 * Create a custom chapter in Supabase and update local storage.
 */
export async function createCustomChapter(
  userId: string,
  subjectId: string,
  name: string,
  track: TrackType = 'jee_nsep',
  status: ChapterStatus = 'not_started'
) {
  const trimmed = name.trim();
  const validSubjectId = resolveSubjectId(subjectId);
  const confidence = computeConfidence(status, 0);

  // 1. Save locally
  const local = addCustomChapter({
    name: trimmed,
    subjectId: validSubjectId,
    subjectName: 'Custom Subject',
    track,
    status,
    confidence,
  });

  // 2. Cloud insert
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('chapter')
        .insert({
          name: trimmed,
          subject_id: validSubjectId,
          user_id: userId,
        } as never)
        .select()
        .single();

      if (!error && data) {
        const newChapId = (data as any).id;
        // Also insert initial progress
        await upsertChapterProgress(userId, newChapId, { status, confidence_score: confidence });
        return {
          id: newChapId,
          name: trimmed,
          subjectId: validSubjectId,
          status,
          confidence,
        };
      }
      if (error) {
        console.warn('Supabase custom chapter insert error:', error);
      }
    } catch (err) {
      console.warn('Supabase chapter insert failed, keeping local:', err);
    }
  }

  return local;
}

/**
 * Delete a custom subject from Supabase and local storage.
 */
export async function deleteCustomSubject(userId: string, subjectId: string) {
  deleteLocalSubject(subjectId);
  if (userId) {
    try {
      await supabase.from('subject').delete().eq('id', subjectId).eq('user_id', userId);
    } catch (err) {
      console.warn('Supabase delete subject failed:', err);
    }
  }
}

/**
 * Delete a custom chapter from Supabase and local storage.
 */
export async function deleteCustomChapter(userId: string, chapterId: string) {
  deleteLocalChapter(chapterId);
  if (userId) {
    try {
      await supabase.from('chapter').delete().eq('id', chapterId).eq('user_id', userId);
    } catch (err) {
      console.warn('Supabase delete chapter failed:', err);
    }
  }
}
