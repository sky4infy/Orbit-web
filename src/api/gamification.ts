import { supabase } from '@/lib/supabase/client';
import { format, subDays } from 'date-fns';
import { db } from '@/lib/db';

/**
 * Consecutive-day streak:
 * - If user completed a mission TODAY, streak is active and extended.
 * - If user completed a mission YESTERDAY, streak is ACTIVE (they have until midnight tonight to extend it!).
 * - If neither today nor yesterday had any completed missions, streak is 0.
 * Combines local Dexie database and Supabase cloud for seamless offline & cross-device accuracy.
 */
export async function getStreak(userId?: string, lookbackDays = 60): Promise<number> {
  const since = format(subDays(new Date(), lookbackDays), 'yyyy-MM-dd');
  const daysWithCompletion = new Set<string>();

  // 1. Query local Dexie DB (instant, offline-first)
  try {
    if (typeof window !== 'undefined' && db?.tasks) {
      const localCompleted = await db.tasks.where('status').equals('completed').toArray();
      for (const t of localCompleted) {
        if (t.scheduled_date && t.scheduled_date >= since) {
          daysWithCompletion.add(t.scheduled_date);
        }
      }
    }
  } catch (err) {
    console.warn('Failed reading local tasks for streak:', err);
  }

  // 2. Query Supabase cloud (cross-device sync)
  if (userId && userId !== 'local-user') {
    try {
      const { data, error } = await supabase
        .from('task')
        .select('scheduled_date, status')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('scheduled_date', since);

      if (!error && data) {
        const rows = data as unknown as { scheduled_date: string; status: string }[];
        for (const r of rows) {
          if (r.scheduled_date) daysWithCompletion.add(r.scheduled_date);
        }
      }
    } catch (err) {
      console.warn('Failed querying cloud tasks for streak:', err);
    }
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  let cursor: Date;

  if (daysWithCompletion.has(todayStr)) {
    // Completed at least one mission today -> streak extends through today
    cursor = new Date();
  } else if (daysWithCompletion.has(yesterdayStr)) {
    // Completed mission yesterday, today in progress -> streak maintained from yesterday
    cursor = subDays(new Date(), 1);
  } else {
    // Neither today nor yesterday had any completed missions -> streak is 0
    return 0;
  }

  let streak = 0;
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

// 10 XP per completed mission.
// Level 1: 0 - 50 XP (5 missions to reach Level 2)
// Level 2: 50 - 120 XP (7 missions to reach Level 3)
// Level 3: 120 - 210 XP (9 missions to reach Level 4)
function levelFromCompletedTasks(taskCount: number): LevelInfo {
  const totalXp = taskCount * 10;
  let level = 1;
  let remainingXp = totalXp;
  let neededForNext = 50;

  while (remainingXp >= neededForNext) {
    remainingXp -= neededForNext;
    level += 1;
    neededForNext = Math.round((neededForNext * 1.35) / 10) * 10;
  }

  return {
    level,
    xp: totalXp,
    xpIntoLevel: remainingXp,
    xpForNextLevel: neededForNext,
  };
}

export async function getLevelInfo(userId?: string): Promise<LevelInfo> {
  const completedTaskIds = new Set<string>();

  // 1. Local Dexie tasks
  try {
    if (typeof window !== 'undefined' && db?.tasks) {
      const localTasks = await db.tasks.where('status').equals('completed').toArray();
      for (const t of localTasks) {
        if (t.id) completedTaskIds.add(t.id);
      }
    }
  } catch (err) {
    console.warn('Failed reading local completed tasks for XP:', err);
  }

  // 2. Cloud Supabase tasks
  if (userId && userId !== 'local-user') {
    try {
      const { data, error } = await supabase
        .from('task')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (!error && data) {
        for (const t of data as { id: string }[]) {
          if (t.id) completedTaskIds.add(t.id);
        }
      }
    } catch (err) {
      console.warn('Failed querying cloud completed tasks for XP:', err);
    }
  }

  return levelFromCompletedTasks(completedTaskIds.size);
}
