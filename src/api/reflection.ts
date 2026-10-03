import { supabase } from '@/lib/supabase/client';
import { logEvent } from '@/api/events';
import type { Reflection } from '@/types/database.types';

export async function getReflectionForDay(userId: string, day: string): Promise<Reflection | null> {
  const { data, error } = await supabase
    .from('reflection')
    .select('*')
    .eq('user_id', userId)
    .eq('day', day)
    .maybeSingle();

  if (error) {
    console.error('Failed to get reflection:', error);
    return null;
  }
  return data as Reflection | null;
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
  const payload = {
    user_id: userId,
    day: reflection.day,
    wins: reflection.wins,
    blockers: reflection.blockers,
    tomorrow_focus: reflection.tomorrow_focus,
    sleep_hours: reflection.sleep_hours,
    energy_rating: reflection.energy_rating,
  };

  const { data, error } = await supabase
    .from('reflection')
    .upsert(payload as never, { onConflict: 'user_id,day' })
    .select()
    .single();

  if (error) throw error;

  await logEvent(userId, 'reflection_submitted', {
    day: reflection.day,
    energy_rating: reflection.energy_rating,
    sleep_hours: reflection.sleep_hours,
  });

  return data as Reflection;
}
