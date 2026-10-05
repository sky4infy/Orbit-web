import { supabase } from '@/lib/supabase/client';
import { addDays, format } from 'date-fns';
import type { Task, TaskStatus, IncompleteReason, TimeSlot, EffortLevel, TrackType } from '@/types/database.types';
import { logEvent } from '@/api/events';
import { generateUuid, isUuid } from '@/lib/uuid';
import { resolveChapterId, isStarterTask, getCurriculumChapters } from '@/lib/curriculumData';
import { ensureChapterInCloud } from '@/lib/syncService';
import {
  db,
  getLocalTasksForDate,
  saveLocalTask,
  updateLocalTaskStatus,
  updateLocalTask,
  deleteLocalTask,
  type LocalTask,
} from '@/lib/db';

export interface TaskWithChapter {
  id: string;
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
  chapter: { id: string; name: string; subject: { id: string; name: string } } | null;
}

export interface DayOverview {
  date: string;
  total: number;
  completed: number;
  total_tasks?: number;
  completed_tasks?: number;
  skipped_tasks?: number;
  total_minutes?: number;
}

export async function getTasksForDate(userId: string, date: string): Promise<TaskWithChapter[]> {
  const activeTrack = (typeof window !== 'undefined' ? localStorage.getItem('orbit_active_track') : 'college_cs_aiml') as TrackType || 'college_cs_aiml';

  const chapters = getCurriculumChapters('all');
  const chapterMap = new Map(chapters.map((c) => [c.id, c]));

  // Helper to ensure chapter info (name and subject name) is always rich and accurate
  const enrichChapter = (t: any): TaskWithChapter => {
    let chap = t.chapter;
    if (!chap || !chap.name || !chap.subject?.name || chap.subject?.name === 'Custom Subject' || chap.subject?.name === 'Custom Chapter') {
      const resolvedChapId = resolveChapterId(t.chapter_id || chap?.id);
      const found = chapterMap.get(resolvedChapId) || chapterMap.get(t.chapter_id);
      if (found) {
        chap = {
          id: found.id,
          name: found.name,
          subject: {
            id: found.subjectId,
            name: found.subjectName,
          },
        };
      }
    }
    return {
      ...t,
      chapter: chap ?? null,
    };
  };

  // 1. If user is authenticated, query Supabase cloud first
  if (userId && userId !== 'local-user') {
    try {
      const { data, error } = await supabase
        .from('task')
        .select(
          `id, title, scheduled_date, time_slot, effort_level, priority, position, status,
           incomplete_reason, estimated_minutes, actual_minutes,
           chapter:chapter_id ( id, name, subject:subject_id ( id, name ) )`
        )
        .eq('user_id', userId)
        .eq('scheduled_date', date)
        .order('time_slot', { ascending: true })
        .order('position', { ascending: true });

      if (!error && data) {
        const rawList = (data as any[]) ?? [];
        const realCloudTasks = rawList
          .filter((d) => !isStarterTask(d.title))
          .map(enrichChapter);

        // Cache real cloud tasks to Dexie
        for (const d of realCloudTasks) {
          await saveLocalTask({
            id: d.id,
            user_id: userId,
            chapter_id: (d.chapter as any)?.id ?? (d as any).chapter_id ?? '',
            title: d.title,
            scheduled_date: d.scheduled_date,
            time_slot: d.time_slot,
            effort_level: d.effort_level,
            priority: d.priority,
            position: d.position,
            status: d.status,
            incomplete_reason: d.incomplete_reason,
            estimated_minutes: d.estimated_minutes,
            actual_minutes: d.actual_minutes,
            created_at: new Date().toISOString(),
            completed_at: d.status === 'completed' ? new Date().toISOString() : null,
          });
        }

        // CRITICAL: Merge any local tasks for this date that are not in cloud yet
        // (prevents locally added tasks from vanishing if cloud push was pending or FK delayed)
        const localList = await getLocalTasksForDate(userId, date, activeTrack);
        const realLocalTasks = localList
          .filter((t) => !isStarterTask(t.title))
          .map(enrichChapter);

        const cloudIds = new Set(realCloudTasks.map((t) => t.id));
        const missingLocals = realLocalTasks.filter((lt) => !cloudIds.has(lt.id));

        if (missingLocals.length > 0) {
          // Asynchronously ensure chapter and push missing locals to cloud
          for (const m of missingLocals) {
            (async () => {
              try {
                const chapId = resolveChapterId((m as any).chapter_id || m.chapter?.id);
                await ensureChapterInCloud(userId, chapId);
                await supabase.from('task').upsert({
                  id: m.id,
                  user_id: userId,
                  chapter_id: chapId,
                  title: m.title,
                  scheduled_date: m.scheduled_date,
                  time_slot: m.time_slot,
                  effort_level: m.effort_level,
                  priority: m.priority,
                  position: m.position,
                  status: m.status,
                  incomplete_reason: m.incomplete_reason,
                  estimated_minutes: m.estimated_minutes,
                  actual_minutes: m.actual_minutes,
                } as never, { onConflict: 'id' });
              } catch (err) {
                console.warn('Background sync missing local task failed:', err);
              }
            })();
          }

          const combined = [...realCloudTasks, ...missingLocals];
          return combined.sort((a, b) => {
            const slotDiff = a.time_slot.localeCompare(b.time_slot);
            if (slotDiff !== 0) return slotDiff;
            return (a.position ?? 0) - (b.position ?? 0);
          });
        }

        if (realCloudTasks.length > 0) {
          return realCloudTasks;
        }

        return [];
      }
    } catch (err) {
      console.warn('Supabase fetch tasks failed, falling back to local database:', err);
    }
  }

  // 2. Offline fallback to local IndexedDB
  const localList = await getLocalTasksForDate(userId, date, activeTrack);
  return localList.map(enrichChapter);
}

export async function createTask(task: Omit<Task, 'id' | 'created_at' | 'completed_at'>) {
  const newId = generateUuid();
  const validChapterId = resolveChapterId(task.chapter_id);

  const localTask: LocalTask = {
    ...task,
    id: newId,
    chapter_id: validChapterId,
    incomplete_reason: null,
    estimated_minutes: task.estimated_minutes ?? 45,
    actual_minutes: task.actual_minutes ?? null,
    created_at: new Date().toISOString(),
    completed_at: null,
  };

  // Instant local save
  await saveLocalTask(localTask);

  // Cloud push
  if (task.user_id && task.user_id !== 'local-user') {
    try {
      // 1. Ensure chapter and parent subject exist in Supabase so foreign key constraints never fail
      const ensuredChapId = await ensureChapterInCloud(task.user_id, validChapterId);

      const { error } = await supabase
        .from('task')
        .insert({
          ...task,
          id: newId,
          chapter_id: ensuredChapId,
        } as never)
        .select()
        .single();

      if (error) console.error('Cloud task push error:', error);
    } catch (err) {
      console.error('Cloud task push exception:', err);
    }

    logEvent(task.user_id, 'task_created', { task_id: newId, chapter_id: validChapterId }).catch(() => {});
  }

  return localTask as unknown as Task;
}

export async function updateTask(
  taskId: string,
  updates: Partial<Pick<Task, 'title' | 'chapter_id' | 'time_slot' | 'effort_level' | 'estimated_minutes'>>
) {
  if (updates.chapter_id) {
    updates.chapter_id = resolveChapterId(updates.chapter_id);
  }
  await updateLocalTask(taskId, updates);
  (async () => {
    try {
      const { error } = await supabase.from('task').update(updates as never).eq('id', taskId);
      if (error) console.error('Cloud task update error:', error);
    } catch (err) {
      console.error('Cloud task update exception:', err);
    }
  })();
}

export async function closeTask(
  userId: string,
  taskId: string,
  status: TaskStatus,
  opts: { incompleteReason?: IncompleteReason; actualMinutes?: number } = {}
) {
  if (status !== 'completed' && status !== 'pending' && !opts.incompleteReason) {
    throw new Error('incompleteReason is required when closing a task as skipped or moved');
  }

  // Instant local update in IndexedDB
  await updateLocalTaskStatus(taskId, status, opts.incompleteReason);

  // Background cloud sync
  if (userId) {
    Promise.resolve(
      supabase
        .from('task')
        .update({
          status,
          incomplete_reason: status === 'completed' ? null : opts.incompleteReason,
          actual_minutes: opts.actualMinutes ?? null,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        } as never)
        .eq('id', taskId)
    ).catch(() => {});

    const eventMap: Record<string, 'task_completed' | 'task_skipped' | 'task_moved'> = {
      completed: 'task_completed',
      skipped: 'task_skipped',
      moved: 'task_moved',
    };
    if (eventMap[status]) {
      Promise.resolve(
        logEvent(userId, eventMap[status], {
          task_id: taskId,
          reason: opts.incompleteReason,
        })
      ).catch(() => {});
    }
  }

  return { id: taskId, status } as unknown as Task;
}

export async function moveTaskToTomorrow(userId: string, taskId: string) {
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  if (typeof window !== 'undefined') {
    await updateLocalTask(taskId, { scheduled_date: tomorrow, status: 'pending', incomplete_reason: null });
  }

  if (userId) {
    Promise.resolve(
      supabase
        .from('task')
        .update({ scheduled_date: tomorrow, status: 'pending', incomplete_reason: null } as never)
        .eq('id', taskId)
    ).catch(() => {});
  }
}

export async function revertTaskToPending(taskId: string, originalDate: string) {
  await updateLocalTask(taskId, {
    status: 'pending',
    incomplete_reason: null,
    completed_at: null,
    scheduled_date: originalDate,
  });

  Promise.resolve(
    supabase
      .from('task')
      .update({
        status: 'pending',
        incomplete_reason: null,
        completed_at: null,
        scheduled_date: originalDate,
      } as never)
      .eq('id', taskId)
  ).catch(() => {});
}

export async function deleteTask(taskId: string) {
  await deleteLocalTask(taskId);
  Promise.resolve(
    supabase.from('task').delete().eq('id', taskId)
  ).catch(() => {});
}

export async function reorderTasks(tasks: { id: string; time_slot: TimeSlot; position: number }[]) {
  // Update local IndexedDB
  for (const t of tasks) {
    await updateLocalTask(t.id, {
      time_slot: t.time_slot,
      position: t.position,
    });
  }

  // Background push
  Promise.all(
    tasks.map((t) =>
      Promise.resolve(
        supabase
          .from('task')
          .update({ time_slot: t.time_slot, position: t.position } as never)
          .eq('id', t.id)
      )
    )
  ).catch(() => {});
}

export async function getWeekOverview(
  userId: string,
  startDate: string,
  endDate: string
): Promise<DayOverview[]> {
  try {
    const allTasks = await db.tasks.toArray();
    const filtered = allTasks.filter((t) => t.scheduled_date >= startDate && t.scheduled_date <= endDate);
    const byDate: Record<string, DayOverview> = {};

    filtered.forEach((t) => {
      if (!byDate[t.scheduled_date]) {
        byDate[t.scheduled_date] = {
          date: t.scheduled_date,
          total: 0,
          completed: 0,
          total_tasks: 0,
          completed_tasks: 0,
          skipped_tasks: 0,
          total_minutes: 0,
        };
      }
      const entry = byDate[t.scheduled_date];
      entry.total += 1;
      entry.total_tasks = entry.total;
      if (t.status === 'completed') {
        entry.completed += 1;
        entry.completed_tasks = entry.completed;
        entry.total_minutes = (entry.total_minutes || 0) + (t.actual_minutes || t.estimated_minutes || 0);
      } else if (t.status === 'skipped') {
        entry.skipped_tasks = (entry.skipped_tasks || 0) + 1;
      }
    });

    return Object.values(byDate);
  } catch {
    return [];
  }
}
