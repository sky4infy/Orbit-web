import { supabase } from '@/lib/supabase/client';
import { logEvent } from '@/api/events';
import type { StudySession } from '@/types/database.types';
import { getCurrentTimeSlot } from '@/lib/telemetry';

export async function startStudySession(userId: string, taskId: string | null) {
  const now = new Date();
  const { data, error } = await supabase
    .from('study_session')
    .insert({ user_id: userId, task_id: taskId, start_time: now.toISOString() } as never)
    .select()
    .single();
  if (error) throw error;

  const session = data as unknown as StudySession;
  await logEvent(userId, 'study_session_started', {
    session_id: session.id,
    task_id: taskId,
    start_slot: getCurrentTimeSlot(now),
    start_hour: now.getHours(),
  });

  return session;
}

export async function endStudySession(userId: string, sessionId: string, pausedSeconds = 0) {
  const now = new Date();
  const { data: rawData, error } = await supabase
    .from('study_session')
    .update({ end_time: now.toISOString(), paused_seconds: pausedSeconds } as never)
    .eq('id', sessionId)
    .select()
    .single();
  if (error) throw error;
  const data = rawData as unknown as StudySession;

  const durationMinutes = data.end_time
    ? Math.round((new Date(data.end_time).getTime() - new Date(data.start_time).getTime()) / 60000)
    : null;

  const isAbandoned = durationMinutes !== null && durationMinutes < 3;

  await logEvent(userId, 'study_session_ended', {
    session_id: sessionId,
    duration_minutes: durationMinutes,
    paused_seconds: pausedSeconds,
    end_slot: getCurrentTimeSlot(now),
    end_hour: now.getHours(),
    is_abandoned: isAbandoned,
  });

  return data;
}

/**
 * Average uninterrupted session length over the last N days — this is
 * the exact query behind "she loses focus after ~85 minutes" style
 * insights. Pure aggregation, no ML needed.
 */
export async function getAverageSessionLength(userId: string, sinceDate: string) {
  const { data, error } = await supabase
    .from('study_session')
    .select('start_time, end_time')
    .eq('user_id', userId)
    .gte('start_time', sinceDate)
    .not('end_time', 'is', null);

  if (error) throw error;
  const rows = (data ?? []) as unknown as { start_time: string; end_time: string | null }[];
  if (rows.length === 0) return null;

  const totalMinutes = rows.reduce((sum, s) => {
    return sum + (new Date(s.end_time!).getTime() - new Date(s.start_time).getTime()) / 60000;
  }, 0);

  return Math.round(totalMinutes / rows.length);
}
