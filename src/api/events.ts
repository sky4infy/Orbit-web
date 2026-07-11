import { supabase } from '@/lib/supabase/client';
import type { EventType } from '@/types/database.types';

/**
 * Fire-and-forget event logging. Call this alongside every meaningful
 * write (task closed, mistake logged, revision done, etc). This is the
 * table phase 2/3 will query first — a full behavioral timeline, not
 * just current-state rows.
 *
 * Deliberately swallows errors: a failed analytics write should never
 * block or break the actual user action it's logging.
 */
export async function logEvent(
  userId: string,
  eventType: EventType,
  metadata: Record<string, unknown> = {}
) {
  try {
    await supabase.from('event_log').insert({ user_id: userId, event_type: eventType, metadata });
  } catch {
    // intentionally silent — logging must never break the primary action
  }
}
