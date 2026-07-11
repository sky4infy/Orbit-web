import { supabase } from '@/lib/supabase/client';
import { logEvent } from '@/api/events';

export async function startStudySession(userId: string, taskId: string | null) {
  const { data, error } = await supabase
    .from('study_session')
    .insert({ user_id: userId, task_id: taskId, start_time: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function endStudySession(userId: string, sessionId: string, pausedSeconds = 0) {
  const { data, error } = await supabase
    .from('study_session')
    .update({ end_time: new Date().toISOString(), paused_seconds: pausedSeconds })
    .eq('id', sessionId)
    .select()
    .single();
  if (error) throw error;

  const durationMinutes = data.end_time
    ? Math.round((new Date(data.end_time).getTime() - new Date(data.start_time).getTime()) / 60000)
    : null;

  await logEvent(userId, 'study_session_ended', { session_id: sessionId, duration_minutes: durationMinutes });
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
  if (data.length === 0) return null;

  const totalMinutes = data.reduce((sum, s) => {
    return sum + (new Date(s.end_time!).getTime() - new Date(s.start_time).getTime()) / 60000;
  }, 0);

  return Math.round(totalMinutes / data.length);
}
