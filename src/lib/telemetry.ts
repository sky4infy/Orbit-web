import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import type { TimeSlot } from '@/types/database.types';

export const SLOT_ORDER: TimeSlot[] = ['morning', 'afternoon', 'evening', 'night'];

/**
 * Returns the active time slot for any given date/time based on the 24h clock.
 * Morning:   05:00 - 11:59
 * Afternoon: 12:00 - 16:59
 * Evening:   17:00 - 20:59
 * Night:     21:00 - 04:59
 */
export function getCurrentTimeSlot(date: Date = new Date()): TimeSlot {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Maps slot to an ordinal 0..3 to compute directional intra-day shift.
 */
export function getSlotIndex(slot: TimeSlot): number {
  switch (slot) {
    case 'morning': return 0;
    case 'afternoon': return 1;
    case 'evening': return 2;
    case 'night': return 3;
    default: return 0;
  }
}

/**
 * Computes intra-day slot shift (e.g., student planned 'morning' but marked done in 'evening' or 'night').
 */
export function calculateSlotDrift(
  scheduledSlot: TimeSlot,
  actualSlot: TimeSlot
): {
  slot_drift: string;
  is_slot_drifted: boolean;
  slots_shifted: number;
} {
  const isShifted = scheduledSlot !== actualSlot;
  const shiftAmount = getSlotIndex(actualSlot) - getSlotIndex(scheduledSlot);

  return {
    slot_drift: isShifted ? `${scheduledSlot}_to_${actualSlot}` : 'same_slot',
    is_slot_drifted: isShifted,
    slots_shifted: shiftAmount,
  };
}

/**
 * Computes calendar date delay (e.g., scheduled for yesterday or 3 days ago).
 */
export function calculateDateDrift(
  scheduledDate: string,
  actualDate: string = format(new Date(), 'yyyy-MM-dd')
): {
  date_drift_days: number;
  is_delayed_date: boolean;
} {
  try {
    const diff = differenceInCalendarDays(parseISO(actualDate), parseISO(scheduledDate));
    return {
      date_drift_days: diff,
      is_delayed_date: diff > 0,
    };
  } catch {
    return { date_drift_days: 0, is_delayed_date: false };
  }
}

/**
 * Determines whether a task was planned ahead or logged on the spot.
 * Positive = planned N days ahead.
 * 0 = planned same-day.
 * Negative = logged retroactively.
 */
export function calculateAdvancePlanningDays(
  scheduledDate: string,
  createdDate: string = format(new Date(), 'yyyy-MM-dd')
): number {
  try {
    return differenceInCalendarDays(parseISO(scheduledDate), parseISO(createdDate));
  } catch {
    return 0;
  }
}

/**
 * Returns structured temporal context to enrich every behavioral telemetry event.
 */
export function getTemporalContext(date: Date = new Date()) {
  const hour = date.getHours();
  const dayName = format(date, 'EEEE');
  const dayOfWeekIndex = date.getDay(); // 0 is Sunday, 6 is Saturday
  const isWeekend = dayOfWeekIndex === 0 || dayOfWeekIndex === 6;

  return {
    temporal_timestamp: date.toISOString(),
    temporal_date: format(date, 'yyyy-MM-dd'),
    temporal_slot: getCurrentTimeSlot(date),
    temporal_hour: hour,
    temporal_minute: date.getMinutes(),
    temporal_day_of_week: dayName,
    temporal_is_weekend: isWeekend,
    temporal_tz_offset_min: -date.getTimezoneOffset(),
  };
}

/**
 * Automatically merges behavioral temporal context into any event's metadata.
 */
export function enrichEventMetadata(
  metadata: Record<string, unknown> = {},
  date: Date = new Date()
): Record<string, unknown> {
  const context = getTemporalContext(date);
  return {
    ...context,
    ...metadata,
  };
}
