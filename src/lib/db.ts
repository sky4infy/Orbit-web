'use client';

import Dexie, { Table } from 'dexie';
import type {
  TaskStatus,
  IncompleteReason,
  TimeSlot,
  EffortLevel,
  MistakeType,
  Difficulty,
  ChapterStatus,
  ExamType,
  TrackType,
} from '@/types/database.types';
import { getCurriculumChapters, getStarterTasks } from '@/lib/curriculumData';

export interface LocalTask {
  id: string;
  user_id: string;
  chapter_id: string;
  title: string;
  scheduled_date: string;
  time_slot: TimeSlot;
  effort_level: EffortLevel;
  priority: number;
  position: number;
  status: TaskStatus;
  incomplete_reason: IncompleteReason | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface LocalMistake {
  id: string;
  user_id: string;
  chapter_id: string;
  mistake_type: MistakeType;
  difficulty: Difficulty;
  description: string;
  resolved: boolean;
  created_at: string;
}

export interface LocalRevision {
  id: string;
  user_id: string;
  chapter_id: string;
  due_date: string;
  interval_days: number;
  review_count: number;
  success_count: number;
  failure_count: number;
  last_reviewed_at: string | null;
  created_at: string;
}

export interface LocalExam {
  id: string;
  user_id: string;
  name: string;
  exam_type: ExamType;
  exam_date: string;
  created_at: string;
  chapter_ids: string[];
}

export interface LocalChapterProgress {
  id?: number;
  user_id: string;
  chapter_id: string;
  status: ChapterStatus;
  confidence_score: number;
  notes: string | null;
  last_revised_at: string | null;
}

export interface LocalReflection {
  id: string;
  user_id: string;
  day: string;
  wins: string | null;
  blockers: string | null;
  tomorrow_focus: string | null;
  sleep_hours: number | null;
  energy_rating: number | null;
  created_at: string;
}

export interface LocalEventLog {
  id: string;
  user_id: string;
  event_type: string;
  metadata: Record<string, any>;
  created_at: string;
}

export class OrbitLocalDatabase extends Dexie {
  tasks!: Table<LocalTask, string>;
  mistakes!: Table<LocalMistake, string>;
  revisions!: Table<LocalRevision, string>;
  exams!: Table<LocalExam, string>;
  progress!: Table<LocalChapterProgress, number>;
  reflections!: Table<LocalReflection, string>;
  events!: Table<LocalEventLog, string>;

  constructor() {
    super('OrbitStudyOS');
    this.version(1).stores({
      tasks: 'id, user_id, scheduled_date, time_slot, status, chapter_id',
      mistakes: 'id, user_id, chapter_id, resolved, created_at',
      revisions: 'id, user_id, chapter_id, due_date',
      exams: 'id, user_id, exam_date, exam_type',
      progress: '++id, [user_id+chapter_id], chapter_id, status',
      reflections: 'id, [user_id+day], user_id, day',
      events: 'id, user_id, event_type, created_at',
    });
  }
}

export const db = new OrbitLocalDatabase();

// ============================================================
// LOCAL TASK METHODS (0ms Latency, Offline Ready)
// ============================================================

export async function getLocalTasksForDate(userId: string, date: string, track: TrackType = 'jee_nsep') {
  if (typeof window === 'undefined') return [];
  try {
    const list = await db.tasks
      .where('scheduled_date')
      .equals(date)
      .and((t) => t.user_id === userId || !t.user_id)
      .sortBy('position');

    const chapters = getCurriculumChapters('all');
    const chapterMap = new Map(chapters.map((c) => [c.id, c]));

    // If first time accessing this date and empty, initialize with rich starter missions
    if (list.length === 0) {
      const starters = getStarterTasks(track, date);
      const inserted: LocalTask[] = [];
      for (const st of starters) {
        const localT: LocalTask = {
          id: st.id,
          user_id: userId,
          chapter_id: st.chapter?.id ?? 'jee-phy-1',
          title: st.title,
          scheduled_date: date,
          time_slot: st.time_slot,
          effort_level: st.effort_level,
          priority: st.priority,
          position: st.position,
          status: st.status,
          incomplete_reason: st.incomplete_reason,
          estimated_minutes: st.estimated_minutes,
          actual_minutes: st.actual_minutes,
          created_at: new Date().toISOString(),
          completed_at: null,
        };
        await db.tasks.put(localT);
        inserted.push(localT);
      }

      return inserted.map((t) => {
        const chap = chapterMap.get(t.chapter_id);
        return {
          ...t,
          chapter: chap ? { id: chap.id, name: chap.name, subject: { id: chap.subjectId, name: chap.subjectName } } : null,
        };
      });
    }

    return list.map((t) => {
      const chap = chapterMap.get(t.chapter_id);
      return {
        ...t,
        chapter: chap ? { id: chap.id, name: chap.name, subject: { id: chap.subjectId, name: chap.subjectName } } : null,
      };
    });
  } catch (err) {
    console.warn('Dexie read failed, falling back:', err);
    return [];
  }
}

export async function saveLocalTask(task: LocalTask) {
  if (typeof window === 'undefined') return;
  await db.tasks.put(task);
}

export async function updateLocalTaskStatus(taskId: string, status: TaskStatus, incompleteReason?: IncompleteReason | null) {
  if (typeof window === 'undefined') return;
  await db.tasks.update(taskId, {
    status,
    incomplete_reason: incompleteReason ?? null,
    completed_at: status === 'completed' ? new Date().toISOString() : null,
  });
}

export async function updateLocalTask(taskId: string, updates: Partial<LocalTask>) {
  if (typeof window === 'undefined') return;
  await db.tasks.update(taskId, updates);
}

export async function deleteLocalTask(taskId: string) {
  if (typeof window === 'undefined') return;
  await db.tasks.delete(taskId);
}

// ============================================================
// LOCAL MISTAKE METHODS
// ============================================================

export async function getLocalMistakes(userId: string) {
  if (typeof window === 'undefined') return [];
  try {
    const list = await db.mistakes
      .where('user_id')
      .equals(userId)
      .or('user_id')
      .equals('')
      .reverse()
      .sortBy('created_at');

    const chapters = getCurriculumChapters('all');
    const chapterMap = new Map(chapters.map((c) => [c.id, c]));

    return list.map((m) => {
      const chap = chapterMap.get(m.chapter_id);
      return {
        id: m.id,
        chapter_id: m.chapter_id,
        chapter_name: chap?.name ?? 'General Problem Set',
        subject_name: chap?.subjectName ?? 'STEM',
        mistake_type: m.mistake_type,
        difficulty: m.difficulty,
        description: m.description,
        resolved: m.resolved,
        created_at: m.created_at,
      };
    });
  } catch {
    return [];
  }
}

export async function addLocalMistake(mistake: LocalMistake) {
  if (typeof window === 'undefined') return;
  await db.mistakes.put(mistake);
}

export async function toggleLocalMistakeResolved(mistakeId: string, resolved: boolean) {
  if (typeof window === 'undefined') return;
  await db.mistakes.update(mistakeId, { resolved });
}

export async function deleteLocalMistake(mistakeId: string) {
  if (typeof window === 'undefined') return;
  await db.mistakes.delete(mistakeId);
}

// ============================================================
// LOCAL EXAM METHODS
// ============================================================

export async function getLocalExams(userId: string): Promise<LocalExam[]> {
  if (typeof window === 'undefined') return [];
  try {
    return await db.exams
      .where('user_id')
      .equals(userId)
      .or('user_id')
      .equals('')
      .sortBy('exam_date');
  } catch {
    return [];
  }
}

export async function saveLocalExam(exam: LocalExam) {
  if (typeof window === 'undefined') return;
  await db.exams.put(exam);
}

export async function deleteLocalExam(examId: string) {
  if (typeof window === 'undefined') return;
  await db.exams.delete(examId);
}

// ============================================================
// BACKUP & RESTORE (1-Click JSON Snapshot)
// ============================================================

export interface OrbitBackupSnapshot {
  version: number;
  exportedAt: string;
  data: {
    tasks: LocalTask[];
    mistakes: LocalMistake[];
    revisions: LocalRevision[];
    exams: LocalExam[];
    progress: LocalChapterProgress[];
    reflections: LocalReflection[];
    events: LocalEventLog[];
    customSubjects: any[];
    customChapters: any[];
    chapterOverrides: Record<string, any>;
    activeTrack: string | null;
  };
}

export async function exportOrbitBackupJSON(): Promise<string> {
  const tasks = await db.tasks.toArray();
  const mistakes = await db.mistakes.toArray();
  const revisions = await db.revisions.toArray();
  const exams = await db.exams.toArray();
  const progress = await db.progress.toArray();
  const reflections = await db.reflections.toArray();
  const events = await db.events.toArray();

  let customSubjects = [];
  let customChapters = [];
  let chapterOverrides = {};
  let activeTrack = null;

  if (typeof window !== 'undefined') {
    try {
      customSubjects = JSON.parse(localStorage.getItem('orbit_custom_subjects') || '[]');
      customChapters = JSON.parse(localStorage.getItem('orbit_custom_chapters') || '[]');
      chapterOverrides = JSON.parse(localStorage.getItem('orbit_chapter_overrides') || '{}');
      activeTrack = localStorage.getItem('orbit_active_track');
    } catch {}
  }

  const snapshot: OrbitBackupSnapshot = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      tasks,
      mistakes,
      revisions,
      exams,
      progress,
      reflections,
      events,
      customSubjects,
      customChapters,
      chapterOverrides,
      activeTrack,
    },
  };

  return JSON.stringify(snapshot, null, 2);
}

export async function importOrbitBackupJSON(jsonStr: string): Promise<boolean> {
  try {
    const parsed: OrbitBackupSnapshot = JSON.parse(jsonStr);
    if (!parsed || !parsed.data) return false;

    await db.transaction('rw', [db.tasks, db.mistakes, db.revisions, db.exams, db.progress, db.reflections, db.events], async () => {
      await db.tasks.clear();
      await db.mistakes.clear();
      await db.revisions.clear();
      await db.exams.clear();
      await db.progress.clear();
      await db.reflections.clear();
      await db.events.clear();

      if (parsed.data.tasks?.length) await db.tasks.bulkPut(parsed.data.tasks);
      if (parsed.data.mistakes?.length) await db.mistakes.bulkPut(parsed.data.mistakes);
      if (parsed.data.revisions?.length) await db.revisions.bulkPut(parsed.data.revisions);
      if (parsed.data.exams?.length) await db.exams.bulkPut(parsed.data.exams);
      if (parsed.data.progress?.length) await db.progress.bulkPut(parsed.data.progress);
      if (parsed.data.reflections?.length) await db.reflections.bulkPut(parsed.data.reflections);
      if (parsed.data.events?.length) await db.events.bulkPut(parsed.data.events);
    });

    if (typeof window !== 'undefined') {
      if (parsed.data.customSubjects) {
        localStorage.setItem('orbit_custom_subjects', JSON.stringify(parsed.data.customSubjects));
      }
      if (parsed.data.customChapters) {
        localStorage.setItem('orbit_custom_chapters', JSON.stringify(parsed.data.customChapters));
      }
      if (parsed.data.chapterOverrides) {
        localStorage.setItem('orbit_chapter_overrides', JSON.stringify(parsed.data.chapterOverrides));
      }
      if (parsed.data.activeTrack) {
        localStorage.setItem('orbit_active_track', parsed.data.activeTrack);
      }
    }

    return true;
  } catch (err) {
    console.error('Import backup failed:', err);
    return false;
  }
}

export async function getOrbitStats() {
  if (typeof window === 'undefined') return { tasks: 0, mistakes: 0, exams: 0 };
  try {
    const [tasks, mistakes, exams] = await Promise.all([
      db.tasks.count(),
      db.mistakes.count(),
      db.exams.count(),
    ]);
    return { tasks, mistakes, exams };
  } catch {
    return { tasks: 0, mistakes: 0, exams: 0 };
  }
}
