import { supabase } from '@/lib/supabase/client';
import type { ChapterStatus, ChapterStatusRow } from '@/types/database.types';
import { getHiddenSubjects, getHiddenChapters, getCustomChapters } from '@/lib/curriculumData';
import { syncHiddenCurriculum } from '@/lib/syncService';

export interface ChapterOverview {
  id: string;
  name: string;
  subjectId: string;
  subjectName: string;
  confidence: number;
  status: ChapterStatus;
  unresolvedMistakes: number;
}

/**
 * Was 3 separate queries (chapter, user_chapter_progress, mistake) joined
 * and aggregated client-side. Now the `my_chapter_status` view (see
 * migration 002) does that join and count in Postgres — one query, one
 * round trip, and the join logic lives in exactly one place (the view)
 * instead of being reimplemented in every function that needs it.
 */
export async function getChaptersOverview(track?: string, userId?: string | null): Promise<ChapterOverview[]> {
  if (userId) {
    await syncHiddenCurriculum(userId).catch(() => {});
  }
  let query = supabase.from('my_chapter_status').select('*');
  if (track && track !== 'all') {
    query = query.eq('track', track);
  }
  const { data, error } = await query;
  if (error) throw error;

  const hiddenSubjects = getHiddenSubjects();
  const hiddenSubNames = new Set(hiddenSubjects.map((h) => h.toLowerCase()));
  const hiddenChapters = getHiddenChapters();

  const overviewRows = ((data ?? []) as unknown as ChapterStatusRow[])
    .filter(
      (row) =>
        !hiddenSubjects.includes(row.subject_id) &&
        !hiddenSubNames.has(row.subject_name.toLowerCase()) &&
        !hiddenChapters.includes(row.chapter_id)
    )
    .map((row) => ({
      id: row.chapter_id,
      name: row.chapter_name,
      subjectId: row.subject_id,
      subjectName: row.subject_name,
      confidence: row.confidence_score,
      status: row.status,
      unresolvedMistakes: row.unresolved_mistakes,
    }));

  // Merge any custom chapters from local storage so user content is never dropped
  const customChaps = getCustomChapters().filter(
    (c) =>
      !hiddenChapters.includes(c.id) &&
      !hiddenSubjects.includes(c.subjectId) &&
      !hiddenSubNames.has(c.subjectName.toLowerCase())
  );
  for (const cc of customChaps) {
    if (!overviewRows.some((r) => r.id === cc.id)) {
      overviewRows.push({
        id: cc.id,
        name: cc.name,
        subjectId: cc.subjectId,
        subjectName: cc.subjectName,
        confidence: cc.confidence,
        status: cc.status,
        unresolvedMistakes: cc.unresolvedMistakes,
      });
    }
  }

  return overviewRows;
}
