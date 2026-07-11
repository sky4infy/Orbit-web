import { supabase } from '@/lib/supabase/client';
import type { Mistake } from '@/types/database.types';
import { logEvent } from '@/api/events';

export async function logMistake(mistake: Omit<Mistake, 'id' | 'created_at' | 'resolved'>) {
  const { data, error } = await supabase
    .from('mistake')
    .insert({ ...mistake, resolved: false })
    .select()
    .single();
  if (error) throw error;
  await logEvent(mistake.user_id, 'mistake_logged', {
    chapter_id: mistake.chapter_id,
    difficulty: mistake.difficulty,
    mistake_type: mistake.mistake_type,
  });
  return data;
}

/** Mistake counts per chapter for this user — feeds revision priority and phase 2 insights. */
export async function getMistakeCountsByChapter(userId: string) {
  const { data, error } = await supabase
    .from('mistake')
    .select(`chapter_id, difficulty, chapter:chapter_id ( name )`)
    .eq('user_id', userId)
    .eq('resolved', false);

  if (error) throw error;

  const counts: Record<string, { chapterName: string; total: number; hard: number }> = {};
  for (const row of data) {
    const name = (row.chapter as any)?.name ?? 'Unknown';
    counts[row.chapter_id] ??= { chapterName: name, total: 0, hard: 0 };
    counts[row.chapter_id].total += 1;
    if (row.difficulty === 'hard') counts[row.chapter_id].hard += 1;
  }
  return counts;
}
