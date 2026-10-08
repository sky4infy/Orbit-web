import { supabase } from '@/lib/supabase/client';
import { addDays, format } from 'date-fns';
import type { Task, TaskStatus, IncompleteReason, TimeSlot, EffortLevel, TrackType } from '@/types/database.types';
import { logEvent } from '@/api/events';
import { generateUuid, isUuid } from '@/lib/uuid';
import { resolveChapterId, isStarterTask, getCurriculumChapters } from '@/lib/curriculumData';
import { ensureChapterInCloud } from '@/lib/syncService';
import {
  getCurrentTimeSlot,
  calculateSlotDrift,
  calculateDateDrift,
  calculateAdvancePlanningDays,
} from '@/lib/telemetry';
import {
  db,
  getLocalTasksForDate,
  getLocalMissedTasks,
  saveLocalTask,
  updateLocalTaskStatus,
  updateLocalTask,
  deleteLocalTask,
  type LocalTask,
} from '@/lib/db';
import { notifyDataChanged } from '@/lib/syncEvents';

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
  reschedule_count?: number;
  created_slot?: TimeSlot | null;
  completed_slot?: TimeSlot | null;
  slot_drift?: string | null;
  started_at?: string | null;
  planner_source?: 'manual' | 'auto_calibrated';
  created_at?: string;
  completed_at?: string | null;
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
      let data: any = null;
      let error: any = null;

      const fullRes = await supabase
        .from('task')
        .select(
          `id, title, scheduled_date, time_slot, effort_level, priority, position, status,
           incomplete_reason, estimated_minutes, actual_minutes, reschedule_count, created_slot, completed_slot, slot_drift,
           started_at, planner_source, created_at, completed_at,
           chapter:chapter_id ( id, name, subject:subject_id ( id, name ) )`
        )
        .eq('user_id', userId)
        .eq('scheduled_date', date)
        .order('time_slot', { ascending: true })
        .order('position', { ascending: true });

      if (fullRes.error) {
        // Fallback to core columns if Supabase does not have telemetry columns
        const coreRes = await supabase
          .from('task')
          .select(
            `id, title, scheduled_date, time_slot, effort_level, priority, position, status,
             incomplete_reason, estimated_minutes, actual_minutes, created_at, completed_at,
             chapter:chapter_id ( id, name, subject:subject_id ( id, name ) )`
          )
          .eq('user_id', userId)
          .eq('scheduled_date', date)
          .order('time_slot', { ascending: true })
          .order('position', { ascending: true });
        data = coreRes.data;
        error = coreRes.error;
      } else {
        data = fullRes.data;
        error = fullRes.error;
      }

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
            reschedule_count: d.reschedule_count ?? 0,
            created_slot: d.created_slot ?? null,
            completed_slot: d.completed_slot ?? null,
            slot_drift: d.slot_drift ?? null,
            started_at: (d as any).started_at ?? null,
            planner_source: (d as any).planner_source ?? 'manual',
            created_at: (d as any).created_at || new Date().toISOString(),
            completed_at: d.completed_at || (d.status === 'completed' ? (d as any).created_at : null),
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
                const { error: upsertErr } = await supabase.from('task').upsert({
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
                  created_at: (m as any).created_at || new Date().toISOString(),
                  completed_at: m.completed_at || null,
                } as never, { onConflict: 'id' });
                if (upsertErr) console.warn('Background sync missing local task error:', upsertErr);
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
  const now = new Date();
  const createdSlot = getCurrentTimeSlot(now);
  const advanceDays = calculateAdvancePlanningDays(task.scheduled_date, format(now, 'yyyy-MM-dd'));

  const localTask: LocalTask = {
    ...task,
    id: newId,
    chapter_id: validChapterId,
    incomplete_reason: null,
    estimated_minutes: task.estimated_minutes ?? 45,
    actual_minutes: task.actual_minutes ?? null,
    reschedule_count: 0,
    created_slot: createdSlot,
    completed_slot: null,
    slot_drift: null,
    started_at: null,
    planner_source: task.planner_source || 'manual',
    created_at: now.toISOString(),
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
          ...localTask,
          chapter_id: ensuredChapId,
        } as never)
        .select()
        .single();

      if (error) {
        // Fallback to core columns if cloud database does not have telemetry columns
        const { error: fallbackError } = await supabase
          .from('task')
          .insert({
            id: localTask.id,
            user_id: localTask.user_id,
            chapter_id: ensuredChapId,
            title: localTask.title,
            scheduled_date: localTask.scheduled_date,
            time_slot: localTask.time_slot,
            effort_level: localTask.effort_level,
            priority: localTask.priority,
            position: localTask.position,
            status: localTask.status,
            incomplete_reason: localTask.incomplete_reason,
            estimated_minutes: localTask.estimated_minutes,
            actual_minutes: localTask.actual_minutes,
            created_at: localTask.created_at,
            completed_at: localTask.completed_at,
          } as never)
          .select()
          .single();

        if (fallbackError) console.error('Cloud task push fallback error:', fallbackError);
      }
    } catch (err) {
      console.error('Cloud task push exception:', err);
    }
  }

  // Universal Behavioral Telemetry: task created
  logEvent(task.user_id || 'local-user', 'task_created', {
    task_id: newId,
    chapter_id: validChapterId,
    title: task.title,
    scheduled_date: task.scheduled_date,
    scheduled_slot: task.time_slot,
    created_slot: createdSlot,
    advance_planning_days: advanceDays,
    effort_level: task.effort_level,
    estimated_minutes: task.estimated_minutes ?? 45,
    priority: task.priority ?? 2,
    planner_source: task.planner_source || 'manual',
  }).catch(() => {});

  notifyDataChanged('task-created');
  return localTask as unknown as Task;
}

export async function startTask(userId: string, taskId: string) {
  const now = new Date();
  const updates = { started_at: now.toISOString() };
  if (typeof window !== 'undefined') {
    await updateLocalTask(taskId, updates);
  }
  if (userId && userId !== 'local-user') {
    try {
      await supabase.from('task').update(updates as never).eq('id', taskId);
    } catch {}
  }
  logEvent(userId || 'local-user', 'task_started', {
    task_id: taskId,
    started_at: now.toISOString(),
  }).catch(() => {});
  notifyDataChanged('task-started');
}

export async function updateTask(
  taskId: string,
  updates: Partial<Pick<Task, 'title' | 'chapter_id' | 'time_slot' | 'effort_level' | 'estimated_minutes'>>
) {
  if (updates.chapter_id) {
    updates.chapter_id = resolveChapterId(updates.chapter_id);
  }
  await updateLocalTask(taskId, updates);
  try {
    const { error } = await supabase.from('task').update(updates as never).eq('id', taskId);
    if (error) console.error('Cloud task update error:', error);
  } catch (err) {
    console.error('Cloud task update exception:', err);
  }
  logEvent('local-user', 'task_moved', {
    task_id: taskId,
    action: 'task_modified',
    updates,
  }).catch(() => {});
  notifyDataChanged('task-updated');
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

  let existingTask: LocalTask | undefined;
  if (typeof window !== 'undefined') {
    existingTask = await db.tasks.get(taskId);
  }

  const now = new Date();
  const completedSlot = getCurrentTimeSlot(now);
  const scheduledSlot = existingTask?.time_slot || 'morning';
  const scheduledDate = existingTask?.scheduled_date || format(now, 'yyyy-MM-dd');
  const slotDriftInfo = calculateSlotDrift(scheduledSlot, completedSlot);
  const dateDriftInfo = calculateDateDrift(scheduledDate, format(now, 'yyyy-MM-dd'));
  const durationHours = existingTask?.created_at
    ? Number(((now.getTime() - new Date(existingTask.created_at).getTime()) / 3600000).toFixed(2))
    : null;
  const estimatedMin = existingTask?.estimated_minutes ?? 45;
  const actualMin = opts.actualMinutes ?? null;
  const estimationRatio = actualMin ? Number((actualMin / estimatedMin).toFixed(2)) : null;

  const updates: Partial<LocalTask> = {
    status,
    incomplete_reason: status === 'completed' ? null : opts.incompleteReason ?? null,
    actual_minutes: actualMin,
    completed_at: status === 'completed' ? now.toISOString() : null,
    completed_slot: status === 'completed' ? completedSlot : null,
    slot_drift: status === 'completed' ? slotDriftInfo.slot_drift : null,
  };

  // Instant local update in IndexedDB
  await updateLocalTask(taskId, updates);

  // Await cloud sync so other tabs see the completed / closed status immediately
  if (userId && userId !== 'local-user') {
    try {
      const { error } = await supabase
        .from('task')
        .update(updates as never)
        .eq('id', taskId);

      if (error) {
        // Fallback without telemetry columns
        await supabase
          .from('task')
          .update({
            status,
            incomplete_reason: status === 'completed' ? null : opts.incompleteReason ?? null,
            actual_minutes: actualMin,
            completed_at: status === 'completed' ? now.toISOString() : null,
          } as never)
          .eq('id', taskId);
      }
    } catch (err) {
      console.warn('Cloud task close error:', err);
    }
  }

  const eventMap: Record<string, 'task_completed' | 'task_skipped' | 'task_moved'> = {
    completed: 'task_completed',
    skipped: 'task_skipped',
    moved: 'task_moved',
  };
  if (eventMap[status]) {
    logEvent(userId || 'local-user', eventMap[status], {
      task_id: taskId,
      chapter_id: existingTask?.chapter_id,
      title: existingTask?.title,
      scheduled_date: scheduledDate,
      scheduled_slot: scheduledSlot,
      completed_slot: completedSlot,
      slot_drift: slotDriftInfo.slot_drift,
      is_slot_drifted: slotDriftInfo.is_slot_drifted,
      slots_shifted: slotDriftInfo.slots_shifted,
      date_drift_days: dateDriftInfo.date_drift_days,
      is_delayed_date: dateDriftInfo.is_delayed_date,
      latency_hours_since_creation: durationHours,
      estimated_minutes: estimatedMin,
      actual_minutes: actualMin,
      estimation_ratio: estimationRatio,
      reschedule_count: existingTask?.reschedule_count ?? 0,
      effort_level: existingTask?.effort_level,
      incomplete_reason: opts.incompleteReason ?? null,
    }).catch(() => {});
  }

  notifyDataChanged('task-closed');
  return { id: taskId, status, ...updates } as unknown as Task;
}

export async function moveTaskToTomorrow(userId: string, taskId: string) {
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  await rescheduleTask(userId, taskId, tomorrow);
}

export async function rescheduleTask(
  userId: string,
  taskId: string,
  newDate: string,
  newSlot?: TimeSlot
) {
  let existingTask: LocalTask | undefined;
  if (typeof window !== 'undefined') {
    existingTask = await db.tasks.get(taskId);
  }

  const now = new Date();
  const rescheduleSlot = getCurrentTimeSlot(now);
  const nextRescheduleCount = (existingTask?.reschedule_count ?? 0) + 1;

  const updates: Partial<LocalTask> = {
    scheduled_date: newDate,
    status: 'pending',
    incomplete_reason: null,
    reschedule_count: nextRescheduleCount,
  };
  if (newSlot) {
    updates.time_slot = newSlot;
  }

  if (typeof window !== 'undefined') {
    await updateLocalTask(taskId, updates);
  }

  if (userId && userId !== 'local-user') {
    try {
      const { error } = await supabase
        .from('task')
        .update(updates as never)
        .eq('id', taskId);

      if (error) {
        await supabase
          .from('task')
          .update({
            scheduled_date: newDate,
            status: 'pending',
            incomplete_reason: null,
            ...(newSlot ? { time_slot: newSlot } : {}),
          } as never)
          .eq('id', taskId);
      }
    } catch (err) {
      console.warn('Cloud rescheduleTask error:', err);
    }
  }

  // Universal Behavioral Telemetry: task postponed / moved
  logEvent(userId || 'local-user', 'task_rescheduled', {
    task_id: taskId,
    chapter_id: existingTask?.chapter_id,
    title: existingTask?.title,
    from_date: existingTask?.scheduled_date,
    to_date: newDate,
    from_slot: existingTask?.time_slot,
    to_slot: newSlot ?? existingTask?.time_slot,
    reschedule_count: nextRescheduleCount,
    action_slot: rescheduleSlot,
    action_hour: now.getHours(),
  }).catch(() => {});

  notifyDataChanged('task-rescheduled');
}

export async function getMissedTasks(userId: string, beforeDate: string): Promise<TaskWithChapter[]> {
  const chapters = getCurriculumChapters('all');
  const chapterMap = new Map(chapters.map((c) => [c.id, c]));

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

  // 1. Supabase cloud first
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
        .lt('scheduled_date', beforeDate)
        .eq('status', 'pending')
        .order('scheduled_date', { ascending: false });

      if (!error && data) {
        const rawList = (data as any[]) ?? [];
        return rawList.filter((d) => !isStarterTask(d.title)).map(enrichChapter);
      }
    } catch (err) {
      console.warn('Cloud missed tasks query error:', err);
    }
  }

  // 2. Local Dexie fallback
  const localList = await getLocalMissedTasks(userId, beforeDate);
  return localList.map((t) => {
    const resolvedChapId = resolveChapterId(t.chapter_id);
    const chap = chapterMap.get(resolvedChapId) || chapterMap.get(t.chapter_id);
    return {
      ...t,
      chapter: chap ? { id: chap.id, name: chap.name, subject: { id: chap.subjectId, name: chap.subjectName } } : null,
    };
  });
}

export async function revertTaskToPending(taskId: string, originalDate: string) {
  await updateLocalTask(taskId, {
    status: 'pending',
    incomplete_reason: null,
    completed_at: null,
    scheduled_date: originalDate,
  });

  try {
    await supabase
      .from('task')
      .update({
        status: 'pending',
        incomplete_reason: null,
        completed_at: null,
        scheduled_date: originalDate,
      } as never)
      .eq('id', taskId);
  } catch (err) {
    console.warn('Cloud revertTaskToPending error:', err);
  }
  notifyDataChanged('task-reverted');
}

export async function deleteTask(taskId: string) {
  // 1. Immediately delete from local IndexedDB
  await deleteLocalTask(taskId);

  // 2. Await cloud deletion so Supabase removes the record before any re-fetch
  try {
    const { error } = await supabase.from('task').delete().eq('id', taskId);
    if (error) console.error('Cloud deleteTask error:', error);
  } catch (err) {
    console.warn('Cloud deleteTask exception:', err);
  }

  // 3. Notify all tabs that the task was deleted
  notifyDataChanged('task-deleted');
}

export async function reorderTasks(tasks: { id: string; time_slot: TimeSlot; position: number }[]) {
  // Update local IndexedDB
  for (const t of tasks) {
    await updateLocalTask(t.id, {
      time_slot: t.time_slot,
      position: t.position,
    });
  }

  // Await cloud sync
  try {
    await Promise.all(
      tasks.map((t) =>
        supabase
          .from('task')
          .update({ time_slot: t.time_slot, position: t.position } as never)
          .eq('id', t.id)
      )
    );
  } catch (err) {
    console.warn('Cloud reorderTasks error:', err);
  }

  logEvent('local-user', 'task_moved', {
    action: 'reorder_or_slot_transfer',
    reordered_count: tasks.length,
    slots_involved: Array.from(new Set(tasks.map((t) => t.time_slot))),
  }).catch(() => {});

  notifyDataChanged('task-reordered');
}

export async function getWeekOverview(
  userId: string,
  startDate: string,
  endDate: string
): Promise<DayOverview[]> {
  try {
    const allTasks = await db.tasks.toArray();
    let cloudTasks: any[] = [];
    if (userId && userId !== 'local-user') {
      try {
        const { data } = await supabase
          .from('task')
          .select('id, user_id, scheduled_date, status, actual_minutes, estimated_minutes')
          .eq('user_id', userId)
          .gte('scheduled_date', startDate)
          .lte('scheduled_date', endDate);
        if (data) cloudTasks = data;
      } catch {}
    }

    const taskMap = new Map<string, any>();
    for (const t of allTasks) {
      if (t.scheduled_date >= startDate && t.scheduled_date <= endDate) {
        taskMap.set(t.id, t);
      }
    }
    for (const ct of cloudTasks) {
      if (!taskMap.has(ct.id)) {
        taskMap.set(ct.id, ct);
      }
    }

    const byDate: Record<string, DayOverview> = {};

    taskMap.forEach((t) => {
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
