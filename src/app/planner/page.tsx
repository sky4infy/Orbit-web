'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  getTasksForDate,
  getMissedTasks,
  rescheduleTask,
  closeTask,
  moveTaskToTomorrow,
  revertTaskToPending,
  type TaskWithChapter,
} from '@/api/tasks';
import { getChaptersOverview, type ChapterOverview } from '@/api/chapters';
import { getStreak, getLevelInfo, type LevelInfo } from '@/api/gamification';
import { getDisplayName } from '@/api/profile';
import { useRequireAuth } from '@/lib/useRequireAuth';
import type { IncompleteReason, TimeSlot, TrackType } from '@/types/database.types';
import { OrbitDayRing } from '@/components/OrbitDayRing';
import { NextMissionCard } from '@/components/NextMissionCard';
import { SlotAccordion } from '@/components/SlotAccordion';
import { MissedTasksVault } from '@/components/MissedTasksVault';
import { AddTaskModal } from '@/components/AddTaskModal';
import { EditTaskModal } from '@/components/EditTaskModal';
import { UndoToast, type ToastState } from '@/components/UndoToast';
import { DailyReflectionModal } from '@/components/DailyReflectionModal';
import { FocusTimerModal } from '@/components/FocusTimerModal';
import { SkipTaskModal } from '@/components/SkipTaskModal';
import { CalibratePlanModal } from '@/components/CalibratePlanModal';
import { AiMentorCard } from '@/components/AiMentorCard';
import { getDueRevisions, type DueRevisionRow } from '@/api/revisions';
import { RevisionSession } from '@/components/RevisionSession';
import { syncAllUserData } from '@/lib/syncService';
import { notifyDataChanged, subscribeDataChanged } from '@/lib/syncEvents';
import { getCurriculumChapters, getStarterTasks, resolveChapterId } from '@/lib/curriculumData';
import { generateUuid } from '@/lib/uuid';
import { supabase } from '@/lib/supabase/client';
import { saveLocalTask } from '@/lib/db';
import { Moon, Clock, Sparkles, Flame, Trophy, Plus, RotateCcw, ArrowRight } from 'lucide-react';

const SLOT_ORDER: TimeSlot[] = ['morning', 'afternoon', 'evening', 'night'];

function currentSlot(hour: number): TimeSlot {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function PlannerPage() {
  const router = useRouter();
  const { userId, authLoading } = useRequireAuth();
  const [date] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [name, setName] = useState('there');
  const initialTrack: TrackType = typeof window !== 'undefined'
    ? ((localStorage.getItem('orbit_active_track') as TrackType) || 'college_cs_aiml')
    : 'college_cs_aiml';

  const [track, setTrack] = useState<TrackType>(() => initialTrack);
  const [tasks, setTasks] = useState<TaskWithChapter[]>([]);
  const [chapters, setChapters] = useState<ChapterOverview[]>(() =>
    getCurriculumChapters(initialTrack).map((c) => ({
      id: c.id,
      name: c.name,
      subjectId: c.subjectId,
      subjectName: c.subjectName,
      confidence: c.confidence,
      status: c.status,
      unresolvedMistakes: c.unresolvedMistakes,
    }))
  );
  const [streak, setStreak] = useState(1);
  const [level, setLevel] = useState<LevelInfo>({ level: 1, xp: 40, xpIntoLevel: 40, xpForNextLevel: 50 });
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals state
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithChapter | null>(null);
  const [taskToSkip, setTaskToSkip] = useState<TaskWithChapter | null>(null);
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [calibrateModalOpen, setCalibrateModalOpen] = useState(false);
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [focusTimerOpen, setFocusTimerOpen] = useState(false);
  const [focusTask, setFocusTask] = useState<TaskWithChapter | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [dueRevisions, setDueRevisions] = useState<DueRevisionRow[]>([]);
  const [revisionSessionOpen, setRevisionSessionOpen] = useState(false);
  const [pinnedTaskId, setPinnedTaskId] = useState<string | null>(null);
  const [missedTasks, setMissedTasks] = useState<TaskWithChapter[]>([]);

  // Load track preference once from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('orbit_active_track') as TrackType | null;
    if (saved) setTrack(saved);
  }, []);

  function withTimeout<T>(promise: Promise<T>, ms = 6000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Network timeout')), ms)),
    ]);
  }

  const hasInitializedRef = useRef(false);

  const load = useCallback(async (uid: string, activeTrack = track, showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const results = await Promise.allSettled([
        withTimeout(getTasksForDate(uid, date), 6000),
        withTimeout(getChaptersOverview(activeTrack, uid), 6000),
        withTimeout(getStreak(uid), 6000),
        withTimeout(getLevelInfo(uid), 6000),
        withTimeout(getDisplayName(uid), 6000),
        withTimeout(getDueRevisions(uid, date, activeTrack), 6000),
        withTimeout(getMissedTasks(uid, date), 6000),
      ]);

      const [taskRows, chapterRows, streakCount, levelInfo, displayName, dueRevRows, missedRows] = results;

      if (missedRows && missedRows.status === 'fulfilled') {
        setMissedTasks(missedRows.value);
      }

      if (dueRevRows && dueRevRows.status === 'fulfilled') {
        setDueRevisions(dueRevRows.value);
      }

      if (taskRows.status === 'fulfilled') {
        setTasks(taskRows.value);
      } else if (!uid) {
        setTasks(getStarterTasks(activeTrack, date));
      }

      if (chapterRows.status === 'fulfilled' && chapterRows.value.length > 0) {
        setChapters(chapterRows.value);
      } else {
        const fallback = getCurriculumChapters(activeTrack).map((c) => ({
          id: c.id,
          name: c.name,
          subjectId: c.subjectId,
          subjectName: c.subjectName,
          confidence: c.confidence,
          status: c.status,
          unresolvedMistakes: c.unresolvedMistakes,
        }));
        setChapters(fallback);
      }

      if (streakCount.status === 'fulfilled') setStreak(streakCount.value);
      if (levelInfo.status === 'fulfilled') setLevel(levelInfo.value);
      if (displayName.status === 'fulfilled') setName(displayName.value);
    } catch (err) {
      console.error('Failed to load planner:', err);
      if (!uid) {
        setTasks(getStarterTasks(activeTrack, date));
      }
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [date, track]);

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      setTasks(getStarterTasks(track, date));
      const fallback = getCurriculumChapters(track).map((c) => ({
        id: c.id,
        name: c.name,
        subjectId: c.subjectId,
        subjectName: c.subjectName,
        confidence: c.confidence,
        status: c.status,
        unresolvedMistakes: c.unresolvedMistakes,
      }));
      setChapters(fallback);
      setLoading(false);
      return;
    }

    // Only run cloud sync and initial load ONCE when logged in
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      // 1. Initial quick load (no screen-clearing loader)
      load(userId, track, false);
      // 2. Background sync once during initial load
      syncAllUserData(userId).then(() => {
        load(userId, track, false);
      });
    }
  }, [userId, authLoading, load, track, date]);

  // Real-time reactive updates: Re-sync whenever the user switches back to this tab
  // or whenever another device/tab pushes changes
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    let lastSyncTime = 0;

    const handleFocusOrVisibility = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastSyncTime > 8000) {
          lastSyncTime = now;
          syncAllUserData(userId).then(() => {
            if (isMounted) load(userId, track, false);
          });
        } else {
          if (isMounted) load(userId, track, false);
        }
      }
    };

    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);

    const unsubscribe = subscribeDataChanged((source) => {
      if (source !== 'local-optimistic' && isMounted) {
        load(userId, track, false);
      }
    });

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
      unsubscribe();
    };
  }, [userId, track, load]);

  const refresh = useCallback(() => {
    if (userId) load(userId, track);
  }, [userId, load, track]);

  const handleManualSync = async () => {
    if (!userId || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncAllUserData(userId);
      await load(userId, track);
      setToast({
        id: `sync-${Date.now()}`,
        message: 'Cloud synchronized across all your devices!',
      });
    } catch (e) {
      console.error('Manual sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  async function refreshGamification() {
    if (!userId) return;
    const [streakCount, levelInfo] = await Promise.all([getStreak(userId), getLevelInfo(userId)]);
    setStreak(streakCount);
    setLevel(levelInfo);
  }

  async function markDone(task: TaskWithChapter) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: 'completed' } : t)));
    notifyDataChanged('task-completed');
    if (!userId) return;
    try {
      await closeTask(userId, task.id, 'completed');
      await refreshGamification();
      setToast({
        id: `done-${task.id}-${Date.now()}`,
        message: 'Task completed! Keep your streak glowing.',
        onUndo: () => handleUndoDone(task),
      });
    } catch {
      refresh();
    }
  }

  async function handleUndoDone(task: TaskWithChapter) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: 'pending' } : t)));
    notifyDataChanged('task-undone');
    try {
      await revertTaskToPending(task.id, date);
      await refreshGamification();
      setToast({
        id: `undo-${task.id}-${Date.now()}`,
        message: `Restored "${task.title}" back to active!`,
      });
    } catch {
      // Ignored
    }
    refresh();
  }

  function handleRequestSkip(task: TaskWithChapter) {
    setTaskToSkip(task);
    setSkipModalOpen(true);
  }

  async function handleConfirmSkip(task: TaskWithChapter, reason: IncompleteReason) {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: 'skipped', incomplete_reason: reason } : t))
    );
    if (!userId) return;
    try {
      await closeTask(userId, task.id, 'skipped', { incompleteReason: reason });
      setToast({
        id: `skip-${task.id}-${Date.now()}`,
        message: 'Mission recorded — zero debt.',
        onUndo: () => handleUndoDone(task),
      });
    } catch {
      refresh();
    }
  }

  async function moveToTomorrow(task: TaskWithChapter) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    if (!userId) return;
    try {
      await moveTaskToTomorrow(userId, task.id);
      setToast({
        id: `move-${task.id}-${Date.now()}`,
        message: 'Rescheduled to tomorrow seamlessly',
        onUndo: () => handleUndoDone(task),
      });
    } catch {
      refresh();
    }
  }

  async function handleRescheduleMissedToToday(task: TaskWithChapter) {
    const targetSlot = activeSlot;
    setMissedTasks((prev) => prev.filter((t) => t.id !== task.id));
    setTasks((prev) => [
      ...prev,
      { ...task, scheduled_date: date, time_slot: targetSlot, status: 'pending' },
    ]);

    await rescheduleTask(userId || '', task.id, date, targetSlot);
    setToast({
      id: `resched-${task.id}-${Date.now()}`,
      message: `Rescheduled "${task.title}" to today (${targetSlot} slot)!`,
    });
  }

  async function handleRescheduleMissedCustom(task: TaskWithChapter, newDate: string, newSlot?: TimeSlot) {
    const slot = newSlot || task.time_slot;
    setMissedTasks((prev) => prev.filter((t) => t.id !== task.id));
    if (newDate === date) {
      setTasks((prev) => [
        ...prev,
        { ...task, scheduled_date: newDate, time_slot: slot, status: 'pending' },
      ]);
    }

    await rescheduleTask(userId || '', task.id, newDate, slot);
    setToast({
      id: `resched-custom-${task.id}-${Date.now()}`,
      message: `Rescheduled "${task.title}" to ${newDate}!`,
    });
  }

  async function handleRescheduleAllToToday() {
    const toMove = [...missedTasks];
    setMissedTasks([]);
    setTasks((prev) => [
      ...prev,
      ...toMove.map((t) => ({ ...t, scheduled_date: date, status: 'pending' as const })),
    ]);

    for (const t of toMove) {
      await rescheduleTask(userId || '', t.id, date, t.time_slot);
    }
    setToast({
      id: `resched-all-${Date.now()}`,
      message: `Moved all ${toMove.length} missed missions into today!`,
    });
  }

  function handleStartMission(task: TaskWithChapter | null) {
    setFocusTask(task);
    setFocusTimerOpen(true);
  }

  const now = new Date();
  const activeSlot = currentSlot(now.getHours());
  const todayStr = format(now, 'yyyy-MM-dd');
  const isToday = date === todayStr;

  const SLOT_INDEX: Record<TimeSlot, number> = {
    morning: 0,
    afternoon: 1,
    evening: 2,
    night: 3,
  };
  const activeSlotIdx = SLOT_INDEX[activeSlot];

  const tasksBySlot = SLOT_ORDER.map((slot) => ({
    slot,
    items: tasks.filter((t) => t.time_slot === slot),
  })).filter((g) => g.items.length > 0);

  const slotStats = SLOT_ORDER.map((slot) => {
    const items = tasks.filter((t) => t.time_slot === slot);
    return { slot, total: items.length, completed: items.filter((t) => t.status === 'completed').length };
  });

  // Intelligent Time-Aware Mission Prioritization
  // 1. Pending tasks in the current active slot
  const activeSlotPendingTasks = isToday
    ? tasks.filter((t) => t.time_slot === activeSlot && t.status === 'pending')
    : [];

  // 2. Overdue pending tasks from earlier slots today (or all pending if viewing past date)
  const overduePendingTasks = isToday
    ? tasks.filter((t) => SLOT_INDEX[t.time_slot] < activeSlotIdx && t.status === 'pending')
    : date < todayStr
    ? tasks.filter((t) => t.status === 'pending')
    : [];

  // 3. Upcoming pending tasks for later slots today (or all pending if viewing future date)
  const upcomingPendingTasks = isToday
    ? tasks.filter((t) => SLOT_INDEX[t.time_slot] > activeSlotIdx && t.status === 'pending')
    : date > todayStr
    ? tasks.filter((t) => t.status === 'pending')
    : [];

  let nextTask: TaskWithChapter | null = null;
  let isNextTaskOverdue = false;
  let isShowingPinned = false;

  // If user explicitly pinned/switched to a specific mission (e.g. catch up on missed afternoon mission)
  if (pinnedTaskId) {
    const pinned = tasks.find((t) => t.id === pinnedTaskId && t.status === 'pending');
    if (pinned) {
      nextTask = pinned;
      isShowingPinned = true;
      isNextTaskOverdue = isToday && SLOT_INDEX[pinned.time_slot] < activeSlotIdx;
    }
  }

  if (!nextTask) {
    if (isToday) {
      if (activeSlotPendingTasks.length > 0) {
        // High Priority: Pending task in current active time slot (e.g. Night slot at night)
        nextTask = activeSlotPendingTasks[0];
        isNextTaskOverdue = false;
      } else if (overduePendingTasks.length > 0) {
        // Secondary: Active slot is clear, catch up on missed tasks from earlier
        nextTask = overduePendingTasks[0];
        isNextTaskOverdue = true;
      } else if (upcomingPendingTasks.length > 0) {
        // Tertiary: Advance to upcoming slots
        nextTask = upcomingPendingTasks[0];
        isNextTaskOverdue = false;
      }
    } else {
      nextTask = tasksBySlot.flatMap((g) => g.items).find((t) => t.status === 'pending') ?? null;
      isNextTaskOverdue = date < todayStr;
    }
  }

  // The first overdue task to highlight if active slot task is currently shown
  const firstOverdueTask =
    !isNextTaskOverdue && !isShowingPinned && overduePendingTasks.length > 0
      ? overduePendingTasks[0]
      : null;

  async function handleApplyCalibratedPlan(suggested: any[]) {
    const newTasks: TaskWithChapter[] = suggested.map((s, idx) => {
      const realId = generateUuid();
      const realChapId = resolveChapterId(s.chapterId);
      return {
        id: realId,
        title: s.title,
        scheduled_date: date,
        time_slot: s.slot,
        effort_level: s.effort,
        priority: s.priority,
        position: idx,
        status: 'pending',
        incomplete_reason: null,
        estimated_minutes: s.estimatedMinutes,
        actual_minutes: null,
        chapter: {
          id: realChapId,
          name: s.chapterName,
          subject: { id: s.subjectId, name: s.subjectName },
        },
      };
    });
    setTasks(newTasks);

    // Persist immediately into local Dexie
    for (const t of newTasks) {
      await saveLocalTask({
        id: t.id,
        user_id: userId || '',
        chapter_id: t.chapter?.id ?? '',
        title: t.title,
        scheduled_date: date,
        time_slot: t.time_slot,
        effort_level: t.effort_level,
        priority: t.priority,
        position: t.position,
        status: t.status,
        incomplete_reason: t.incomplete_reason,
        estimated_minutes: t.estimated_minutes,
        actual_minutes: t.actual_minutes,
        created_at: new Date().toISOString(),
        completed_at: null,
      });

      // Push to Supabase if logged in
      if (userId) {
        supabase
          .from('task')
          .upsert({
            id: t.id,
            user_id: userId,
            chapter_id: t.chapter?.id ?? '',
            title: t.title,
            scheduled_date: date,
            time_slot: t.time_slot,
            effort_level: t.effort_level,
            priority: t.priority,
            position: t.position,
            status: 'pending',
            estimated_minutes: t.estimated_minutes,
          } as never)
          .then(({ error }) => {
            if (error) console.error('Error saving calibrated task to cloud:', error);
          });
      }
    }

    setToast({
      id: `calibrated-toast-${Date.now()}`,
      message: '✨ Calibrated day plan applied to your orbit!',
    });
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 pb-32 pt-8">
      {/* Calm, Modern Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-paper">
            {greeting(now.getHours())}, {name}
          </h1>
          <p className="mt-0.5 text-xs text-paper/40">
            {format(now, 'EEEE, d MMMM')} • <span className="text-amber/90 font-medium">Plan Less. Optimize Learning.</span>
          </p>
        </div>

        {/* Quick Micro-Actions */}
        <div className="flex items-center gap-2">
          {/* Calibrate Day Action (Opens Calibrate Modal on demand) */}
          <button
            onClick={() => setCalibrateModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-amber/30 bg-amber/10 px-3 py-2 text-xs font-semibold text-amber transition hover:bg-amber/20 hover:scale-105 active:scale-95 shadow-sm shadow-amber/10"
            title="Auto-Calibrate Today's Plan"
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">Calibrate</span>
          </button>

          {/* Deep Work Timer Button */}
          <button
            onClick={() => handleStartMission(nextTask)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-paper/70 transition hover:border-amber/30 hover:bg-amber/10 hover:text-amber"
            title="Deep Work Focus Timer"
          >
            <Clock size={16} />
          </button>

          {/* Cloud Sync Button */}
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-paper/70 transition hover:border-amber/30 hover:bg-amber/10 hover:text-amber ${
              isSyncing ? 'text-amber' : ''
            }`}
            title={isSyncing ? 'Synchronizing with cloud...' : 'Sync with cloud across devices'}
          >
            <RotateCcw size={15} className={isSyncing ? 'animate-spin text-amber' : ''} />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-paper/40">
          Calibrating orbit…
        </div>
      ) : (
        <>
          {/* Desk Hero: Day Orbit Completion Ring + Streak Pill */}
          <div className="mb-6 flex flex-col items-center justify-center">
            <OrbitDayRing tasks={tasks} slots={slotStats} />

            {/* Integrated Streak & XP Pill */}
            <div className="mt-3 flex items-center gap-3 rounded-full border border-white/5 bg-ink-100/70 px-4 py-1.5 backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-xs font-medium text-amber">
                <Flame size={14} className="fill-amber text-amber" />
                <span>{streak} day streak</span>
              </div>
              <span className="text-white/10">•</span>
              <div className="flex items-center gap-1.5 text-xs font-medium text-paper/70">
                <Trophy size={13} className="text-amber-400" />
                <span>Level {level.level} ({level.xpIntoLevel}/{level.xpForNextLevel} XP)</span>
              </div>
            </div>
          </div>

          {/* Immediate Next Mission Card */}
          <div className="mb-6">
            <NextMissionCard
              task={nextTask}
              activeSlot={isToday ? activeSlot : undefined}
              isOverdue={isNextTaskOverdue}
              overdueTask={firstOverdueTask}
              overdueCount={overduePendingTasks.length}
              isShowingPinned={isShowingPinned}
              onStart={() => handleStartMission(nextTask)}
              onDeferTask={moveToTomorrow}
              onSwitchTask={(t) => setPinnedTaskId(t.id)}
              onResetToActiveSlot={() => setPinnedTaskId(null)}
            />
          </div>

          {/* AI Mentor Strategic Guidance Card */}
          <AiMentorCard
            userId={userId ?? ''}
            track={track}
            date={date}
            tasks={tasks}
            chapters={chapters}
            onApplyPlan={handleApplyCalibratedPlan}
            onOpenFocusTimer={handleStartMission}
          />

          {/* Spaced Revision Due Banner (Zero Forgetting Curve Decay) */}
          {dueRevisions.length > 0 && (
            <div className="mb-6 rounded-2xl border border-rust/20 bg-gradient-to-r from-rust/10 via-ink-50 to-ink p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rust/20 text-rust shadow-sm">
                    <RotateCcw size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-paper">Spaced Revision Due ({dueRevisions.length})</h4>
                      <span className="rounded-full bg-rust/20 px-2 py-0.5 text-[9px] font-mono text-rust">Decay Risk</span>
                    </div>
                    <p className="text-[11px] text-paper/50">
                      {dueRevisions[0].chapter_name} {dueRevisions.length > 1 ? `+ ${dueRevisions.length - 1} more` : ''}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setRevisionSessionOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-rust px-3 py-1.5 text-xs font-semibold text-paper shadow-sm hover:brightness-110 active:scale-95 transition"
                >
                  <span>Active Recall</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Daily Mission Blocks (Morning, Afternoon, Evening, Night) */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-paper/40">
                Today's Missions
              </h2>
              <span className="font-mono text-xs text-paper/40">
                {tasks.filter((t) => t.status === 'completed').length}/{tasks.length} Done
              </span>
            </div>

            {tasksBySlot.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-paper/40">
                <p className="mb-3">Nothing planned for today. Ready to build today's mission?</p>
                <button
                  onClick={() => setAddTaskOpen(true)}
                  className="rounded-xl bg-amber px-4 py-2 text-xs font-semibold text-ink hover:brightness-110"
                >
                  + Add Mission
                </button>
              </div>
            ) : (
              <SlotAccordion
                tasksBySlot={tasksBySlot}
                onDone={markDone}
                onUndoDone={handleUndoDone}
                onMove={moveToTomorrow}
                onRequestSkip={handleRequestSkip}
                onEdit={setEditingTask}
                onStartFocus={handleStartMission}
                activeSlot={isToday ? activeSlot : undefined}
                defaultOpenSlot={activeSlot}
              />
            )}
          </div>

          {/* Missed Missions Vault (Previous Days Catch-up & Reschedule) */}
          {missedTasks.length > 0 && (
            <div className="mb-6">
              <MissedTasksVault
                missedTasks={missedTasks}
                todayDate={date}
                onRescheduleToToday={handleRescheduleMissedToToday}
                onRescheduleCustom={handleRescheduleMissedCustom}
                onRescheduleAllToToday={handleRescheduleAllToToday}
                onRequestSkip={handleRequestSkip}
              />
            </div>
          )}

          {/* Evening Reflection Prompt Banner */}
          <div className="mt-8 rounded-2xl border border-white/5 bg-gradient-to-r from-amber/10 via-ink-50 to-indigo-950/20 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-paper">Evening Reflection</h4>
                <p className="text-[11px] text-paper/50">Capture wins, log blockers & protect your sleep</p>
              </div>
              <button
                onClick={() => setReflectionOpen(true)}
                className="rounded-xl bg-amber px-3.5 py-1.5 text-xs font-semibold text-ink hover:brightness-110 shadow-sm"
              >
                Reflect
              </button>
            </div>
          </div>

          {/* Floating Action Button: Add Task */}
          <div className="fixed bottom-20 right-5 z-30 flex items-center gap-2">
            <button
              onClick={() => handleStartMission(nextTask)}
              className="flex h-11 items-center gap-2 rounded-full bg-ink-50/90 px-4 text-xs font-medium text-amber border border-amber/30 shadow-xl backdrop-blur-md hover:bg-amber/10 transition"
              aria-label="Deep Work Focus"
            >
              <Clock size={15} />
              <span>Deep Work</span>
            </button>

            <button
              onClick={() => setAddTaskOpen(true)}
              className="flex h-13 w-13 p-3.5 items-center justify-center rounded-full bg-amber text-ink shadow-2xl shadow-amber/30 transition hover:scale-105 active:scale-95"
              aria-label="Add task"
            >
              <Plus size={22} className="stroke-[2.5]" />
            </button>
          </div>
        </>
      )}

      {/* Add Task Modal */}
      <AddTaskModal
        userId={userId ?? 'local-user'}
        date={date}
        chapters={chapters}
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        onCreated={refresh}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        task={editingTask}
        chapters={chapters}
        onClose={() => setEditingTask(null)}
        onSaved={refresh}
      />

      {/* Mandatory Skip Reason Modal (<10s quick-pick) */}
      <SkipTaskModal
        task={taskToSkip}
        open={skipModalOpen}
        onClose={() => setSkipModalOpen(false)}
        onConfirmSkip={handleConfirmSkip}
      />

      {/* Calibrate Plan Modal (On demand, leaves desk clean) */}
      <CalibratePlanModal
        userId={userId ?? ''}
        track={track}
        date={date}
        tasks={tasks}
        chapters={chapters}
        open={calibrateModalOpen}
        onClose={() => setCalibrateModalOpen(false)}
        onApplyPlan={handleApplyCalibratedPlan}
      />

      {/* Focus Timer Modal (Deep Work Chamber) */}
      <FocusTimerModal
        userId={userId ?? 'local-user'}
        task={focusTask}
        open={focusTimerOpen}
        onClose={() => setFocusTimerOpen(false)}
        onSessionEnded={refresh}
      />

      {/* Daily Reflection Modal */}
      <DailyReflectionModal
        userId={userId ?? 'local-user'}
        date={date}
        open={reflectionOpen}
        onClose={() => setReflectionOpen(false)}
        onSaved={refresh}
      />

      {/* Interactive Active Recall Modal */}
      {revisionSessionOpen && (
        <RevisionSession
          userId={userId ?? 'local-user'}
          queue={dueRevisions}
          onClose={() => setRevisionSessionOpen(false)}
          onFinished={() => {
            setRevisionSessionOpen(false);
            refresh();
          }}
        />
      )}

      {/* Undo Toast */}
      <UndoToast toast={toast} onDismiss={() => setToast(null)} />
    </main>
  );
}
