'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  getTasksForDate,
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
import { AddTaskModal } from '@/components/AddTaskModal';
import { EditTaskModal } from '@/components/EditTaskModal';
import { UndoToast, type ToastState } from '@/components/UndoToast';
import { DailyReflectionModal } from '@/components/DailyReflectionModal';
import { FocusTimerModal } from '@/components/FocusTimerModal';
import { SkipTaskModal } from '@/components/SkipTaskModal';
import { CalibratePlanModal } from '@/components/CalibratePlanModal';
import { AiMentorCard } from '@/components/AiMentorCard';
import { getCurriculumChapters, getStarterTasks } from '@/lib/curriculumData';
import { saveLocalTask } from '@/lib/db';
import { Moon, Clock, Sparkles, Flame, Trophy, Plus } from 'lucide-react';

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
  const [track, setTrack] = useState<TrackType>('jee_nsep');
  const [tasks, setTasks] = useState<TaskWithChapter[]>(() =>
    getStarterTasks('jee_nsep', format(new Date(), 'yyyy-MM-dd'))
  );
  const [chapters, setChapters] = useState<ChapterOverview[]>(() =>
    getCurriculumChapters('jee_nsep').map((c) => ({
      id: c.id,
      name: c.name,
      subjectId: c.subjectId,
      subjectName: c.subjectName,
      confidence: c.confidence,
      status: c.status,
      unresolvedMistakes: c.unresolvedMistakes,
    }))
  );
  const [streak, setStreak] = useState(4);
  const [level, setLevel] = useState<LevelInfo>({ level: 2, xp: 12, xpIntoLevel: 2, xpForNextLevel: 10 });
  const [loading, setLoading] = useState(false);

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

  // Load track preference once from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('orbit_active_track') as TrackType | null;
    if (saved) setTrack(saved);
  }, []);

  function withTimeout<T>(promise: Promise<T>, ms = 1200): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Network timeout')), ms)),
    ]);
  }

  const load = useCallback(async (uid: string, activeTrack = track) => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        withTimeout(getTasksForDate(uid, date)),
        withTimeout(getChaptersOverview()),
        withTimeout(getStreak(uid)),
        withTimeout(getLevelInfo(uid)),
        withTimeout(getDisplayName(uid)),
      ]);

      const [taskRows, chapterRows, streakCount, levelInfo, displayName] = results;

      if (taskRows.status === 'fulfilled' && taskRows.value.length > 0) {
        setTasks(taskRows.value);
      } else {
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
      console.error('Failed to load planner, using fallback curriculum:', err);
      setTasks(getStarterTasks(activeTrack, date));
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
    } finally {
      setLoading(false);
    }
  }, [date, track]);

  useEffect(() => {
    if (!userId) {
      if (!authLoading) {
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
      }
      return;
    }
    load(userId, track);
  }, [userId, authLoading, load, track, date]);

  const refresh = useCallback(() => {
    if (userId) load(userId, track);
  }, [userId, load, track]);

  async function refreshGamification() {
    if (!userId) return;
    const [streakCount, levelInfo] = await Promise.all([getStreak(userId), getLevelInfo(userId)]);
    setStreak(streakCount);
    setLevel(levelInfo);
  }

  async function markDone(task: TaskWithChapter) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: 'completed' } : t)));
    if (!userId) return;
    try {
      await closeTask(userId, task.id, 'completed');
      await refreshGamification();
      setToast({
        id: `done-${task.id}-${Date.now()}`,
        message: 'Task completed! Keep your streak glowing.',
        onUndo: async () => {
          await revertTaskToPending(task.id, date);
          refresh();
        },
      });
    } catch {
      refresh();
    }
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
        onUndo: async () => {
          await revertTaskToPending(task.id, date);
          refresh();
        },
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
        onUndo: async () => {
          await revertTaskToPending(task.id, date);
          refresh();
        },
      });
    } catch {
      refresh();
    }
  }

  function handleStartMission(task: TaskWithChapter | null) {
    setFocusTask(task);
    setFocusTimerOpen(true);
  }

  const tasksBySlot = SLOT_ORDER.map((slot) => ({
    slot,
    items: tasks.filter((t) => t.time_slot === slot),
  })).filter((g) => g.items.length > 0);

  const slotStats = SLOT_ORDER.map((slot) => {
    const items = tasks.filter((t) => t.time_slot === slot);
    return { slot, total: items.length, completed: items.filter((t) => t.status === 'completed').length };
  });

  const nextTask = tasksBySlot.flatMap((g) => g.items).find((t) => t.status === 'pending') ?? null;
  const now = new Date();

  async function handleApplyCalibratedPlan(suggested: any[]) {
    const newTasks: TaskWithChapter[] = suggested.map((s, idx) => ({
      id: `calibrated-${Date.now()}-${idx}`,
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
        id: s.chapterId,
        name: s.chapterName,
        subject: { id: s.subjectId, name: s.subjectName },
      },
    }));
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

          {/* Evening Reflection Button */}
          <button
            onClick={() => setReflectionOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-paper/70 transition hover:border-amber/30 hover:bg-amber/10 hover:text-amber"
            title="Evening Reflection"
          >
            <Moon size={16} />
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
            <OrbitDayRing slots={slotStats} />

            {/* Integrated Streak & XP Pill */}
            <div className="mt-3 flex items-center gap-3 rounded-full border border-white/5 bg-ink-100/70 px-4 py-1.5 backdrop-blur-md">
              <div className="flex items-center gap-1 text-xs font-medium text-amber">
                <Flame size={14} className="fill-amber text-amber" />
                <span>{streak} day streak</span>
              </div>
              <span className="text-white/10">•</span>
              <div className="flex items-center gap-1 text-xs font-medium text-paper/70">
                <Trophy size={13} className="text-amber-400" />
                <span>Level {level.level} ({level.xp} XP)</span>
              </div>
            </div>
          </div>

          {/* Immediate Next Mission Card */}
          <div className="mb-6">
            <NextMissionCard
              task={nextTask}
              onStart={() => handleStartMission(nextTask)}
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
                onMove={moveToTomorrow}
                onRequestSkip={handleRequestSkip}
                onEdit={setEditingTask}
                onStartFocus={handleStartMission}
                defaultOpenSlot={currentSlot(now.getHours())}
              />
            )}
          </div>

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
      {userId && (
        <AddTaskModal
          userId={userId}
          date={date}
          chapters={chapters}
          open={addTaskOpen}
          onClose={() => setAddTaskOpen(false)}
          onCreated={refresh}
        />
      )}

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

      {/* Undo Toast */}
      <UndoToast toast={toast} onDismiss={() => setToast(null)} />
    </main>
  );
}
