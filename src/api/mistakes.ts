import { supabase } from '@/lib/supabase/client';
import type { Mistake, Difficulty, MistakeType } from '@/types/database.types';
import { logEvent } from '@/api/events';
import { ensureRevisionExists } from '@/api/revisions';
import {
  getLocalMistakes,
  addLocalMistake,
  toggleLocalMistakeResolved,
  deleteLocalMistake,
  type LocalMistake,
} from '@/lib/db';

export interface MistakeRow {
  id: string;
  chapter_id: string;
  chapter_name: string;
  subject_name: string;
  mistake_type: MistakeType;
  difficulty: Difficulty;
  description: string | null;
  resolved: boolean;
  created_at: string;
}

export async function logMistake(mistake: {
  user_id: string;
  chapter_id: string;
  mistake_type: MistakeType;
  difficulty: Difficulty;
  description?: string;
}) {
  const newId = `mistake-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const localM: LocalMistake = {
    id: newId,
    user_id: mistake.user_id,
    chapter_id: mistake.chapter_id,
    mistake_type: mistake.mistake_type,
    difficulty: mistake.difficulty,
    description: mistake.description ?? '',
    resolved: false,
    created_at: new Date().toISOString(),
  };

  // 1. Instant local IndexedDB save
  await addLocalMistake(localM);

  // 2. Automatically enroll chapter in Spaced Repetition queue
  ensureRevisionExists(mistake.user_id, mistake.chapter_id).catch(() => {});

  // 3. Background cloud sync
  if (mistake.user_id) {
    Promise.resolve(
      supabase
        .from('mistake')
        .insert({ ...mistake, id: newId, resolved: false } as never)
        .select()
        .single()
    ).catch(() => {});

    Promise.resolve(
      logEvent(mistake.user_id, 'mistake_logged', {
        chapter_id: mistake.chapter_id,
        difficulty: mistake.difficulty,
        mistake_type: mistake.mistake_type,
      })
    ).catch(() => {});
  }

  return localM;
}

export async function getMistakesList(userId: string): Promise<MistakeRow[]> {
  // 1. Immediate read from IndexedDB (0ms latency)
  const localList = await getLocalMistakes(userId);

  // 2. Background cloud sync
  if (userId) {
    try {
      const { data, error } = await Promise.race([
        supabase
          .from('mistake')
          .select(
            `id, chapter_id, mistake_type, difficulty, description, resolved, created_at,
             chapter:chapter_id ( name, subject:subject_id ( name ) )`
          )
          .eq('user_id', userId)
          .order('resolved', { ascending: true })
          .order('created_at', { ascending: false }),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 800)),
      ]);

      if (!error && data && data.length > 0) {
        for (const m of data as any[]) {
          await addLocalMistake({
            id: m.id,
            user_id: userId,
            chapter_id: m.chapter_id,
            mistake_type: m.mistake_type,
            difficulty: m.difficulty,
            description: m.description ?? '',
            resolved: m.resolved,
            created_at: m.created_at,
          });
        }
        return (data as any[]).map((m: any) => ({
          id: m.id,
          chapter_id: m.chapter_id,
          chapter_name: m.chapter?.name ?? 'Unknown',
          subject_name: m.chapter?.subject?.name ?? 'Unknown',
          mistake_type: m.mistake_type,
          difficulty: m.difficulty,
          description: m.description,
          resolved: m.resolved,
          created_at: m.created_at,
        }));
      }
    } catch {
      // Cloud sleeping: seamless local fallback
    }
  }

  return localList;
}

export async function resolveMistake(mistakeId: string) {
  // Instant IndexedDB resolve
  await toggleLocalMistakeResolved(mistakeId, true);

  // Background sync
  Promise.resolve(
    supabase
      .from('mistake')
      .update({ resolved: true } as never)
      .eq('id', mistakeId)
  ).catch(() => {});
}

export async function deleteMistake(mistakeId: string) {
  await deleteLocalMistake(mistakeId);
  Promise.resolve(
    supabase.from('mistake').delete().eq('id', mistakeId)
  ).catch(() => {});
}

export async function getMistakeCountsByChapter(userId: string) {
  const mistakes = await getLocalMistakes(userId);
  const counts: Record<string, { chapterName: string; total: number; hard: number }> = {};
  for (const m of mistakes) {
    if (!m.resolved) {
      counts[m.chapter_id] ??= { chapterName: m.chapter_name, total: 0, hard: 0 };
      counts[m.chapter_id].total += 1;
      if (m.difficulty === 'hard') counts[m.chapter_id].hard += 1;
    }
  }
  return counts;
}
