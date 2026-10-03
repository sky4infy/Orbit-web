import { supabase } from '@/lib/supabase/client';
import { addDays, format } from 'date-fns';
import type { Task, TaskStatus, IncompleteReason, TimeSlot, EffortLevel } from '@/types/database.types';
import { logEvent } from '@/api/events';
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
  // 1. Local-First: Read immediately from IndexedDB (0ms latency, never sleeps)
  const activeTrack = (typeof window !== 'undefined' ? localStorage.getItem('orbit_active_track') : 'jee_nsep') as any;
  const localList = await getLocalTasksForDate(userId, date, activeTrack || 'jee_nsep');

  // 2. Background cloud sync (if Supabase is connected & active)
  if (userId) {
    try {
      const { data, error } = await Promise.race([
        supabase
          .from('task')
          .select(
            `id, title, scheduled_date, time_slot, effort_level, priority, position, status,
             incomplete_reason, estimated_minutes, actual_minutes,
             chapter:chapter_id ( id, name, subject:subject_id ( id, name ) )`
          )
          .eq('user_id', userId)
          .eq('scheduled_date', date)
          .order('time_slot', { ascending: true })
          .order('position', { ascending: true }),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 800)),
      ]);

      if (!error && data && data.length > 0) {
        for (const d of data) {
          await saveLocalTask({
            id: d.id,
            user_id: userId,
            chapter_id: d.chapter?.id ?? '',
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
        return data as unknown as TaskWithChapter[];
      }
    } catch {
      // Cloud inactive or offline: seamlessly return local database data
    }
  }

  return localList;
}

export async function createTask(task: Omit<Task, 'id' | 'created_at' | 'completed_at'>) {
  const newId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const localTask: LocalTask = {
    ...task,
    id: newId,
    incomplete_reason: null,
    estimated_minutes: task.estimated_minutes ?? 45,
    actual_minutes: task.actual_minutes ?? null,
    created_at: new Date().toISOString(),
    completed_at: null,
  };

  // Instant local save
  await saveLocalTask(localTask);

  // Background cloud push
  if (task.user_id) {
    Promise.resolve(
      supabase.from('task').insert({ ...task, id: newId } as never).select().single()
    ).catch(() => {});
    Promise.resolve(
      logEvent(task.user_id, 'task_created', { task_id: newId, chapter_id: task.chapter_id })
    ).catch(() => {});
  }

  return localTask as unknown as Task;
}

export async function updateTask(
  taskId: string,
  updates: Partial<Pick<Task, 'title' | 'chapter_id' | 'time_slot' | 'effort_level' | 'estimated_minutes'>>
) {
  await updateLocalTask(taskId, updates);
  Promise.resolve(
    supabase.from('task').update(updates as never).eq('id', taskId)
  ).catch(() => {});
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
