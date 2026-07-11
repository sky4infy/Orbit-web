import { supabase } from '@/lib/supabase/client';
import type { Task, TaskStatus, IncompleteReason, TimeSlot, EffortLevel } from '@/types/database.types';
import { logEvent } from '@/api/events';

// Explicit shape for the joined query below. TypeScript can't reliably
// infer nested embed selects (chapter:chapter_id(...)) from our hand-written
// Database type, so we describe the result ourselves instead of letting it
// fall back to `never`.
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

export async function getTasksForDate(userId: string, date: string): Promise<TaskWithChapter[]> {
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

  if (error) throw error;
  return (data ?? []) as unknown as TaskWithChapter[];
}

export async function createTask(task: Omit<Task, 'id' | 'created_at' | 'completed_at'>) {
  const { data, error } = await supabase.from('task').insert(task).select().single();
  if (error) throw error;
  await logEvent(task.user_id, 'task_created', { task_id: data.id, chapter_id: task.chapter_id });
  return data;
}

/**
 * Close out a task as completed/skipped/moved. incompleteReason is
 * required for anything other than 'completed' — this is the field
 * every future pattern-detection feature depends on.
 */
export async function closeTask(
  userId: string,
  taskId: string,
  status: TaskStatus,
  opts: { incompleteReason?: IncompleteReason; actualMinutes?: number } = {}
) {
  if (status !== 'completed' && status !== 'pending' && !opts.incompleteReason) {
    throw new Error('incompleteReason is required when closing a task as skipped or moved');
  }

  const { data, error } = await supabase
    .from('task')
    .update({
      status,
      incomplete_reason: status === 'completed' ? null : opts.incompleteReason,
      actual_minutes: opts.actualMinutes ?? null,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;

  const eventMap: Record<string, 'task_completed' | 'task_skipped' | 'task_moved'> = {
    completed: 'task_completed',
    skipped: 'task_skipped',
    moved: 'task_moved',
  };
  if (eventMap[status]) {
    await logEvent(userId, eventMap[status], { task_id: taskId, reason: opts.incompleteReason });
  }

  return data;
}

/** Carry every unfinished task from one day into the next (the "moved" flow). */
export async function moveUnfinishedTasksToNextDay(userId: string, fromDate: string, toDate: string) {
  const { data, error } = await supabase
    .from('task')
    .update({ scheduled_date: toDate, status: 'pending' })
    .eq('user_id', userId)
    .eq('scheduled_date', fromDate)
    .eq('status', 'pending')
    .select();

  if (error) throw error;
  return data;
}

export async function getWeekCompletionBySubject(userId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('task')
    .select(`status, chapter:chapter_id ( subject:subject_id ( name ) )`)
    .eq('user_id', userId)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate);

  if (error) throw error;

  const bySubject: Record<string, { planned: number; completed: number }> = {};
  for (const row of data) {
    const subjectName = (row.chapter as any)?.subject?.name ?? 'Unknown';
    bySubject[subjectName] ??= { planned: 0, completed: 0 };
    bySubject[subjectName].planned += 1;
    if (row.status === 'completed') bySubject[subjectName].completed += 1;
  }
  return bySubject;
}
