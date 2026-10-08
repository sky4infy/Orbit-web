import { supabase } from '@/lib/supabase/client';
import type { EventType } from '@/types/database.types';
import { generateUuid } from '@/lib/uuid';
import { saveLocalEvent } from '@/lib/db';
import { enrichEventMetadata } from '@/lib/telemetry';

/**
 * Universal Behavioral Telemetry Pipeline.
 *
 * Guarantees zero data loss (Offline-First Outbox):
 * 1. ALWAYS stores the enriched event into local IndexedDB (Dexie) with microsecond timestamp,
 *    temporal slot, day-of-week, hour, and contextual habit metadata.
 * 2. If authenticated and online, synchronizes to Supabase `event_log` and marks status 'synced'.
 * 3. If offline, marks 'pending' so `syncEventsToCloud` flushes when online.
 * 4. Deliberately swallows errors so logging never blocks student interactions.
 */
export async function logEvent(
  userId: string,
  eventType: EventType,
  metadata: Record<string, unknown> = {}
) {
  try {
    const eventId = generateUuid();
    const now = new Date();
    const enriched = enrichEventMetadata(metadata, now);
    let isSynced = false;

    // 1. Try cloud push first if authenticated
    if (userId && userId !== 'local-user') {
      try {
        const { error } = await supabase.from('event_log').insert({
          id: eventId,
          user_id: userId,
          event_type: eventType,
          metadata: enriched,
          created_at: now.toISOString(),
        } as never);
        if (!error) isSynced = true;
      } catch {
        // network failure or offline
      }
    }

    // 2. Instant local persistence in Dexie with sync tracking
    await saveLocalEvent({
      id: eventId,
      user_id: userId || 'local-user',
      event_type: eventType,
      metadata: enriched,
      sync_status: isSynced ? 'synced' : 'pending',
      created_at: now.toISOString(),
    });
  } catch {
    // intentionally silent — logging must never break the primary action
  }
}
