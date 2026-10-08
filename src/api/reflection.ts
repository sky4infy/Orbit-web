import { supabase } from '@/lib/supabase/client';
import { logEvent } from '@/api/events';
import type { Reflection } from '@/types/database.types';
import { getLocalReflectionForDay, saveLocalReflection, type LocalReflection } from '@/lib/db';

export async function getReflectionForDay(userId: string, day: string): Promise<Reflection | null> {
  // 1. Instant local read from Dexie
  const local = await getLocalReflectionForDay(userId, day);
  if (local) {
    return {
      id: local.id,
      user_id: local.user_id,
      day: local.day,
      wins: local.wins,
      blockers: local.blockers,
      tomorrow_focus: local.tomorrow_focus,
      sleep_hours: local.sleep_hours,
      energy_rating: local.energy_rating,
      created_at: local.created_at,
    };
  }

  // 2. Fallback to Supabase if connected
  if (userId) {
    try {
      const { data, error } = await Promise.race([
        supabase
          .from('reflection')
          .select('*')
          .eq('user_id', userId)
          .eq('day', day)
          .maybeSingle(),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('timeout')), 800)),
      ]);

      if (!error && data) {
        await saveLocalReflection({
          id: data.id,
          user_id: data.user_id,
          day: data.day,
          wins: data.wins,
          blockers: data.blockers,
          tomorrow_focus: data.tomorrow_focus,
          sleep_hours: data.sleep_hours,
          energy_rating: data.energy_rating,
          created_at: data.created_at,
        });
        return data as Reflection;
      }
    } catch {
      // Cloud inactive or timeout
    }
  }

  return null;
}

export async function saveReflection(
  userId: string,
  reflection: {
    day: string;
    wins: string | null;
    blockers: string | null;
    tomorrow_focus: string | null;
    sleep_hours: number | null;
    energy_rating: number | null;
  }
): Promise<Reflection> {
  const refId = `ref-${reflection.day}-${userId || 'anon'}`;
  const now = new Date().toISOString();

  const localRef: LocalReflection = {
    id: refId,
    user_id: userId,
    day: reflection.day,
    wins: reflection.wins,
    blockers: reflection.blockers,
    tomorrow_focus: reflection.tomorrow_focus,
    sleep_hours: reflection.sleep_hours,
    energy_rating: reflection.energy_rating,
    created_at: now,
  };

  // 1. Instant local save in Dexie
  await saveLocalReflection(localRef);

  // 2. Background cloud sync
  if (userId) {
    Promise.resolve(
      supabase
        .from('reflection')
        .upsert(
          {
            user_id: userId,
            day: reflection.day,
            wins: reflection.wins,
            blockers: reflection.blockers,
            tomorrow_focus: reflection.tomorrow_focus,
            sleep_hours: reflection.sleep_hours,
            energy_rating: reflection.energy_rating,
          } as never,
          { onConflict: 'user_id,day' }
        )
    ).catch(() => {});
  }

  // Universal Behavioral Telemetry: reflection submitted
  logEvent(userId || 'local-user', 'reflection_submitted', {
    day: reflection.day,
    energy_rating: reflection.energy_rating,
    sleep_hours: reflection.sleep_hours,
    has_wins: Boolean(reflection.wins),
    has_blockers: Boolean(reflection.blockers),
    has_tomorrow_focus: Boolean(reflection.tomorrow_focus),
  }).catch(() => {});

  return {
    id: refId,
    user_id: userId,
    day: reflection.day,
    wins: reflection.wins,
    blockers: reflection.blockers,
    tomorrow_focus: reflection.tomorrow_focus,
    sleep_hours: reflection.sleep_hours,
    energy_rating: reflection.energy_rating,
    created_at: now,
  };
}
