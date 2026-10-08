import { supabase } from '@/lib/supabase/client';
import type { ExamReadinessRow, ExamType } from '@/types/database.types';
import { getLocalExams, saveLocalExam, deleteLocalExam, getLocalExam, type LocalExam } from '@/lib/db';
import { getCurriculumChapters, resolveChapterId } from '@/lib/curriculumData';
import { generateUuid, isUuid } from '@/lib/uuid';
import { notifyDataChanged } from '@/lib/syncEvents';
import { logEvent } from '@/api/events';

const HIDDEN_SAMPLE_EXAMS_KEY = 'orbit_hidden_sample_exams';

export function getHiddenSampleExams(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HIDDEN_SAMPLE_EXAMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function hideSampleExam(examId: string) {
  if (typeof window === 'undefined') return;
  const list = getHiddenSampleExams();
  if (!list.includes(examId)) {
    list.push(examId);
    localStorage.setItem(HIDDEN_SAMPLE_EXAMS_KEY, JSON.stringify(list));
  }
}

export async function getExams(userId: string = ''): Promise<ExamReadinessRow[]> {
  const hiddenSampleIds = getHiddenSampleExams();

  // 1. If user is online and authenticated, fetch from Supabase
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('my_exam_readiness')
        .select('*')
        .order('exam_date', { ascending: true });

      if (!error && data !== null) {
        // Filter out any hidden sample exams
        const filtered = (data as unknown as ExamReadinessRow[]).filter(
          (e) => !hiddenSampleIds.includes(e.exam_id)
        );
        return filtered;
      }
    } catch (err) {
      console.warn('Supabase fetch exams failed, falling back to local database:', err);
    }
  }

  // 2. Fallback to local Dexie
  const localExams = await getLocalExams(userId);
  const chapters = getCurriculumChapters('all');
  const chapterMap = new Map(chapters.map((c) => [c.id, c]));

  const localRows: ExamReadinessRow[] = localExams
    .filter((e) => !hiddenSampleIds.includes(e.id))
    .map((e) => {
      const matched = (e.chapter_ids || []).map((id) => chapterMap.get(id)).filter(Boolean);
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

  return localRows;
}

export async function getExamLinkedChapters(examId: string): Promise<string[]> {
  // 1. Try local Dexie
  const local = await getLocalExam(examId);
  if (local && local.chapter_ids && local.chapter_ids.length > 0) {
    return local.chapter_ids;
  }

  // 2. Try Supabase
  if (isUuid(examId)) {
    try {
      const { data, error } = await supabase
        .from('exam_chapter')
        .select('chapter_id')
        .eq('exam_id', examId);

      if (!error && data) {
        return (data as any[]).map((r) => r.chapter_id);
      }
    } catch {
      // offline fallback
    }
  }

  return [];
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

  // Cloud push (await so other tabs fetch consistent list)
  if (userId) {
    try {
      const { error } = await supabase
        .from('exam')
        .insert({ id: newId, user_id: userId, name, exam_type: examType, exam_date: examDate } as never)
        .select()
        .single();
      if (!error && validChapterIds.length > 0) {
        await supabase
          .from('exam_chapter')
          .insert(validChapterIds.map((chapter_id) => ({ exam_id: newId, chapter_id })) as never);
      }
    } catch (err) {
      console.error('Cloud exam insert exception:', err);
    }
  }

  // Universal Behavioral Telemetry: exam created
  logEvent(userId || 'local-user', 'exam_created', {
    exam_id: newId,
    name,
    exam_type: examType,
    exam_date: examDate,
    target_chapter_count: validChapterIds.length,
  }).catch(() => {});

  notifyDataChanged('exam-created');
  return { id: newId };
}

export async function updateExam(
  userId: string,
  examId: string,
  updates: {
    name: string;
    examType: ExamType;
    examDate: string;
    chapterIds: string[];
  }
) {
  const validChapterIds = updates.chapterIds.map(resolveChapterId);

  // 1. Update local Dexie
  const existing = await getLocalExam(examId);
  const updatedLocal: LocalExam = {
    id: examId,
    user_id: userId || existing?.user_id || '',
    name: updates.name.trim(),
    exam_type: updates.examType,
    exam_date: updates.examDate,
    created_at: existing?.created_at || new Date().toISOString(),
    chapter_ids: validChapterIds,
  };
  await saveLocalExam(updatedLocal);

  // 2. Push update to Supabase (await so other tabs get updated details)
  if (userId && isUuid(examId)) {
    try {
      const { error } = await supabase
        .from('exam')
        .update({
          name: updates.name.trim(),
          exam_type: updates.examType,
          exam_date: updates.examDate,
        } as never)
        .eq('id', examId)
        .eq('user_id', userId);

      if (!error) {
        // Re-link chapters
        await supabase.from('exam_chapter').delete().eq('exam_id', examId);
        if (validChapterIds.length > 0) {
          await supabase
            .from('exam_chapter')
            .insert(validChapterIds.map((chapter_id) => ({ exam_id: examId, chapter_id })) as never);
        }
      }
    } catch (err) {
      console.error('Cloud exam update exception:', err);
    }
  }
  notifyDataChanged('exam-updated');
}

export async function deleteExam(examId: string) {
  hideSampleExam(examId);
  await deleteLocalExam(examId);

  if (isUuid(examId)) {
    try {
      await Promise.all([
        supabase.from('exam_chapter').delete().eq('exam_id', examId),
        supabase.from('exam').delete().eq('id', examId),
      ]);
    } catch (err) {
      console.warn('Cloud exam delete error:', err);
    }
  }
  notifyDataChanged('exam-deleted');
}
