import { supabase } from '@/lib/supabase/client';
import { format, subDays } from 'date-fns';

/**
 * Consecutive-day streak: counts backward from today, day by day, as long
 * as at least one task was completed that day. Stops at the first gap.
 * Pure aggregation over `task` — no separate streak table needed, it's
 * always derivable from the data you already have.
 */
export async function getStreak(userId: string, lookbackDays = 60): Promise<number> {
  const since = format(subDays(new Date(), lookbackDays), 'yyyy-MM-dd');
  const { data, error } = await supabase
    .from('task')
    .select('scheduled_date, status')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('scheduled_date', since);

  if (error) throw error;

  const daysWithCompletion = new Set((data ?? []).map((t) => t.scheduled_date));

  let streak = 0;
  let cursor = new Date();
  while (daysWithCompletion.has(format(cursor, 'yyyy-MM-dd'))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export interface LevelInfo {
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
}

// Simple curve: each level needs progressively more completed tasks.
// Deliberately not tunable/ML-driven yet — a level-up should feel earned
// but this is a placeholder curve, easy to rebalance once real usage
// shows whether it feels too fast or too slow.
function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  let remaining = xp;
  let needed = 5; // XP needed to go from level 1 -> 2
  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed = Math.round(needed * 1.35);
  }
  return { level, xp, xpIntoLevel: remaining, xpForNextLevel: needed };
}

export async function getLevelInfo(userId: string): Promise<LevelInfo> {
  const { count, error } = await supabase
    .from('task')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed');

  if (error) throw error;
  return levelFromXp(count ?? 0);
}
