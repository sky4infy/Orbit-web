import type { TimeSlot } from '@/types/database.types';
import { db, type LocalTask, type LocalEventLog } from '@/lib/db';

export interface ChronotypeProfile {
  plannedSlotCounts: Record<TimeSlot, number>;
  actualCompletedSlotCounts: Record<TimeSlot, number>;
  peakExecutionSlot: TimeSlot;
  morningToLaterDriftRate: number; // 0.0 to 1.0 (percentage of morning tasks completed in afternoon/evening/night)
  isMorningAspirantNightOwl: boolean;
  actualPeakHour: number | null;
  totalCompletedTasks: number;
}

export interface EstimationCalibrationProfile {
  averageEstimationRatio: number; // e.g., 1.35 = student takes 35% longer than estimated
  totalLoggedMinutes: number;
  underestimatingFrequency: number; // fraction of tasks where actual > estimated
}

export interface FrictionProfile {
  highFrictionChapterIds: string[];
  totalReschedules: number;
  mostPostponedSlot: TimeSlot | null;
}

export interface StudentBehavioralHabitReport {
  chronotype: ChronotypeProfile;
  estimation: EstimationCalibrationProfile;
  friction: FrictionProfile;
  aiStrategicInsights: {
    optimalAnalyticalSlot: TimeSlot;
    recommendedSlotNote: string;
    velocityCalibrationFactor: number;
  };
}

/**
 * Silently analyzes local Dexie tasks and behavioral event logs
 * to produce deep habit intelligence for the AI Mentor.
 * Zero UI exposure — purely used to calibrate advice and planning algorithms.
 */
export async function analyzeStudentHabits(userId: string = ''): Promise<StudentBehavioralHabitReport> {
  const tasks = typeof window !== 'undefined' ? await db.tasks.toArray() : [];
  const events = typeof window !== 'undefined' ? await db.events.toArray() : [];

  const userTasks = tasks.filter((t) => t.user_id === userId || !t.user_id || t.user_id === 'local-user');
  const userEvents = events.filter((e) => e.user_id === userId || !e.user_id || e.user_id === 'local-user');

  // 1. Chronotype & Slot Drift Analysis
  const plannedSlotCounts: Record<TimeSlot, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const actualCompletedSlotCounts: Record<TimeSlot, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const completionHourCounts: Record<number, number> = {};

  let morningTasksCount = 0;
  let morningTasksDriftedToLater = 0;
  let completedCount = 0;

  for (const t of userTasks) {
    if (t.time_slot) {
      plannedSlotCounts[t.time_slot] = (plannedSlotCounts[t.time_slot] || 0) + 1;
    }

    if (t.status === 'completed') {
      completedCount++;
      const actualSlot: TimeSlot = (t.completed_slot as TimeSlot) || t.time_slot || 'morning';
      actualCompletedSlotCounts[actualSlot] = (actualCompletedSlotCounts[actualSlot] || 0) + 1;

      if (t.completed_at) {
        try {
          const hour = new Date(t.completed_at).getHours();
          completionHourCounts[hour] = (completionHourCounts[hour] || 0) + 1;
        } catch {}
      }

      // Check the exact case the user noted:
      // Student scheduled a morning task, but actually marked it completed in afternoon, evening, or night!
      if (t.time_slot === 'morning') {
        morningTasksCount++;
        if (t.completed_slot && t.completed_slot !== 'morning') {
          morningTasksDriftedToLater++;
        }
      }
    }
  }

  // Also extract completion hours from event_log stream if task.completed_at is sparse
  for (const ev of userEvents) {
    if (ev.event_type === 'task_completed' && ev.metadata) {
      const slot = ev.metadata.completed_slot as TimeSlot;
      const hour = ev.metadata.temporal_hour as number;
      if (hour !== undefined) {
        completionHourCounts[hour] = (completionHourCounts[hour] || 0) + 1;
      }
      if (ev.metadata.scheduled_slot === 'morning' && ev.metadata.is_slot_drifted) {
        // Confirmation from event stream
      }
    }
  }

  // Determine Peak Execution Slot
  const slots: TimeSlot[] = ['morning', 'afternoon', 'evening', 'night'];
  let peakExecutionSlot: TimeSlot = 'evening';
  let maxCompletedInSlot = -1;
  for (const s of slots) {
    if (actualCompletedSlotCounts[s] > maxCompletedInSlot) {
      maxCompletedInSlot = actualCompletedSlotCounts[s];
      peakExecutionSlot = s;
    }
  }

  // Determine Peak Hour
  let actualPeakHour: number | null = null;
  let maxHourFreq = -1;
  for (const [hStr, count] of Object.entries(completionHourCounts)) {
    const h = Number(hStr);
    if (count > maxHourFreq) {
      maxHourFreq = count;
      actualPeakHour = h;
    }
  }

  const morningDriftRate = morningTasksCount > 0
    ? Number((morningTasksDriftedToLater / morningTasksCount).toFixed(2))
    : 0;

  // Student regularly creates morning tasks but completes them in evening/night
  const isMorningAspirantNightOwl =
    (plannedSlotCounts.morning > plannedSlotCounts.night &&
      (actualCompletedSlotCounts.evening + actualCompletedSlotCounts.night) > actualCompletedSlotCounts.morning) ||
    morningDriftRate >= 0.5;

  // 2. Estimation Calibration (The Planning Fallacy)
  let ratioSum = 0;
  let ratioCount = 0;
  let totalLoggedMinutes = 0;
  let underestimatedCount = 0;

  for (const t of userTasks) {
    if (t.status === 'completed' && t.actual_minutes && t.estimated_minutes) {
      const ratio = t.actual_minutes / t.estimated_minutes;
      ratioSum += ratio;
      ratioCount++;
      totalLoggedMinutes += t.actual_minutes;
      if (t.actual_minutes > t.estimated_minutes) {
        underestimatedCount++;
      }
    }
  }

  const averageEstimationRatio = ratioCount > 0
    ? Number((ratioSum / ratioCount).toFixed(2))
    : 1.0;
  const underestimatingFrequency = ratioCount > 0
    ? Number((underestimatedCount / ratioCount).toFixed(2))
    : 0;

  // 3. Friction & Postponement Radar
  const chapterReschedules: Record<string, number> = {};
  let totalReschedules = 0;

  for (const t of userTasks) {
    const rc = t.reschedule_count ?? 0;
    if (rc > 0) {
      totalReschedules += rc;
      if (t.chapter_id) {
        chapterReschedules[t.chapter_id] = (chapterReschedules[t.chapter_id] || 0) + rc;
      }
    }
  }

  const highFrictionChapterIds = Object.entries(chapterReschedules)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  // 4. Strategic AI Insights
  const optimalAnalyticalSlot: TimeSlot = isMorningAspirantNightOwl
    ? (actualCompletedSlotCounts.evening >= actualCompletedSlotCounts.night ? 'evening' : 'night')
    : peakExecutionSlot;

  let recommendedSlotNote = '';
  if (isMorningAspirantNightOwl) {
    recommendedSlotNote = `Behavioral rhythm detects natural peak execution in ${optimalAnalyticalSlot}. Allocating intensive derivations to ${optimalAnalyticalSlot} avoids morning friction.`;
  } else {
    recommendedSlotNote = `Execution pacing matches planned rhythm. Peak throughput is in the ${optimalAnalyticalSlot} slot.`;
  }

  return {
    chronotype: {
      plannedSlotCounts,
      actualCompletedSlotCounts,
      peakExecutionSlot,
      morningToLaterDriftRate: morningDriftRate,
      isMorningAspirantNightOwl,
      actualPeakHour,
      totalCompletedTasks: completedCount,
    },
    estimation: {
      averageEstimationRatio,
      totalLoggedMinutes,
      underestimatingFrequency,
    },
    friction: {
      highFrictionChapterIds,
      totalReschedules,
      mostPostponedSlot: null,
    },
    aiStrategicInsights: {
      optimalAnalyticalSlot,
      recommendedSlotNote,
      velocityCalibrationFactor: Math.max(0.8, Math.min(1.5, averageEstimationRatio)),
    },
  };
}
