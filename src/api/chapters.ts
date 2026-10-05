import { supabase } from '@/lib/supabase/client';
import type { ChapterStatus, ChapterStatusRow } from '@/types/database.types';
import {
  getHiddenSubjects,
  getHiddenChapters,
  getCustomChapters,
  getCustomSubjects,
  ALL_STANDARD_SUBJECTS,
} from '@/lib/curriculumData';
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

  const customSubs = getCustomSubjects();
  const subMap = new Map<string, string>();
  for (const s of [...ALL_STANDARD_SUBJECTS, ...customSubs]) {
    subMap.set(s.id, s.name);
  }

  const overviewRows: ChapterOverview[] = ((data ?? []) as unknown as ChapterStatusRow[])
    .filter(
      (row) =>
        !hiddenSubjects.includes(row.subject_id) &&
        !hiddenSubNames.has(row.subject_name.toLowerCase()) &&
        !hiddenChapters.includes(row.chapter_id)
    )
    .map((row) => {
      let resolvedSubName = row.subject_name;
      if (!resolvedSubName || resolvedSubName === 'Custom Subject' || resolvedSubName === 'Custom Chapter') {
        const found = subMap.get(row.subject_id);
        if (found) resolvedSubName = found;
      }
      return {
        id: row.chapter_id,
        name: row.chapter_name,
        subjectId: row.subject_id,
        subjectName: resolvedSubName,
        confidence: row.confidence_score,
        status: row.status,
        unresolvedMistakes: row.unresolved_mistakes,
      };
    });

  // Merge any custom chapters from local storage so user content is never dropped
  const customChaps = getCustomChapters().filter(
    (c) =>
      (!track || track === 'all' || c.track === track || c.track === 'all') &&
      !hiddenChapters.includes(c.id) &&
      !hiddenSubjects.includes(c.subjectId) &&
      !hiddenSubNames.has(c.subjectName.toLowerCase())
  );

  for (const cc of customChaps) {
    let resolvedSubName = cc.subjectName;
    if (!resolvedSubName || resolvedSubName === 'Custom Subject' || resolvedSubName === 'Custom Chapter') {
      const found = subMap.get(cc.subjectId);
      if (found) resolvedSubName = found;
    }

    const existing = overviewRows.find((r) => r.id === cc.id);
    if (!existing) {
      overviewRows.push({
        id: cc.id,
        name: cc.name,
        subjectId: cc.subjectId,
        subjectName: resolvedSubName,
        confidence: cc.confidence,
        status: cc.status,
        unresolvedMistakes: cc.unresolvedMistakes,
      });
    } else if (existing.subjectName === 'Custom Subject' || existing.subjectName === 'Custom Chapter') {
      existing.subjectName = resolvedSubName;
    }
  }

  return overviewRows;
}
