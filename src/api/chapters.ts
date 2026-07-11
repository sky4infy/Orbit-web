import { supabase } from '@/lib/supabase/client';
import type { ChapterStatus } from '@/types/database.types';

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
export async function getChaptersOverview(): Promise<ChapterOverview[]> {
  const { data, error } = await supabase.from('my_chapter_status').select('*');
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.chapter_id,
    name: row.chapter_name,
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    confidence: row.confidence_score,
    status: row.status,
    unresolvedMistakes: row.unresolved_mistakes,
  }));
}
