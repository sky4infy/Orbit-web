import { supabase } from '@/lib/supabase/client';
import type { ExamReadinessRow, ExamType } from '@/types/database.types';
import { getLocalExams, saveLocalExam, deleteLocalExam, type LocalExam } from '@/lib/db';
import { getCurriculumChapters, resolveChapterId } from '@/lib/curriculumData';
import { generateUuid } from '@/lib/uuid';

export async function getExams(userId: string = ''): Promise<ExamReadinessRow[]> {
  // 1. Read from IndexedDB first
  const localExams = await getLocalExams(userId);
  const chapters = getCurriculumChapters('all');
  const chapterMap = new Map(chapters.map((c) => [c.id, c]));

  const localRows: ExamReadinessRow[] = localExams.map((e) => {
    const matched = e.chapter_ids.map((id) => chapterMap.get(id)).filter(Boolean);
    const total = matched.length;
    const mastered = matched.filter((c) => c?.status === 'mastered').length;
    const avgConf = total > 0 ? Math.round(matched.reduce((acc, c) => acc + (c?.confidence ?? 50), 0) / total) : 50;

    return {
      exam_id: e.id,
      name: e.name,
      exam_type: e.exam_type,
      exam_date: e.exam_date,
      total_chapters: total,
      mastered_chapters: mastered,
      avg_confidence: avgConf,
    };
  });

  // 2. Background sync with Supabase if online
  if (userId) {
    try {
      const { data, error } = await Promise.race([
        supabase.from('my_exam_readiness').select('*').order('exam_date', { ascending: true }),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 800)),
      ]);

      if (!error && data && data.length > 0) {
        return data as unknown as ExamReadinessRow[];
      }
    } catch {
      // Cloud inactive or sleeping
    }
  }

  return localRows;
}

export async function createExam(
  userId: string,
  name: string,
  examType: ExamType,
  examDate: string,
  chapterIds: string[]
) {
  const newId = generateUuid();
  const validChapterIds = chapterIds.map(resolveChapterId);
  const localExam: LocalExam = {
    id: newId,
    user_id: userId,
    name,
    exam_type: examType,
    exam_date: examDate,
    created_at: new Date().toISOString(),
    chapter_ids: validChapterIds,
  };

  // Instant local save
  await saveLocalExam(localExam);

  // Background cloud push
  if (userId) {
    (async () => {
      try {
        const { error } = await supabase
          .from('exam')
          .insert({ id: newId, user_id: userId, name, exam_type: examType, exam_date: examDate } as never)
          .select()
          .single();
        if (error) {
          console.error('Cloud exam insert error:', error);
          return;
        }
        if (validChapterIds.length > 0) {
          await supabase
            .from('exam_chapter')
            .insert(validChapterIds.map((chapter_id) => ({ exam_id: newId, chapter_id })) as never);
        }
      } catch (err) {
        console.error('Cloud exam insert exception:', err);
      }
    })();
  }

  return { id: newId };
}

export async function deleteExam(examId: string) {
  await deleteLocalExam(examId);
  Promise.resolve(
    supabase.from('exam').delete().eq('id', examId)
  ).catch(() => {});
}
