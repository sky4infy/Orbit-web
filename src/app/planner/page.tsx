'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase/client';
import { getTasksForDate, closeTask, type TaskWithChapter } from '@/api/tasks';
import { getChaptersOverview, type ChapterOverview } from '@/api/chapters';
import { getStreak, getLevelInfo, type LevelInfo } from '@/api/gamification';
import { getDisplayName } from '@/api/profile';
import type { IncompleteReason, TimeSlot } from '@/types/database.types';
import { OrbitDayRing } from '@/components/OrbitDayRing';
import { NextMissionCard } from '@/components/NextMissionCard';
import { SlotAccordion } from '@/components/SlotAccordion';
import { StreakAndLevel } from '@/components/StreakAndLevel';
import { AddTaskModal } from '@/components/AddTaskModal';

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
  const [date] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState('there');
  const [tasks, setTasks] = useState<TaskWithChapter[]>([]);
  const [chapters, setChapters] = useState<ChapterOverview[]>([]);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState<LevelInfo>({ level: 1, xp: 0, xpIntoLevel: 0, xpForNextLevel: 5 });
  const [loading, setLoading] = useState(true);
  const [reasonPickerFor, setReasonPickerFor] = useState<string | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;
      setUserId(user.id);

      const [taskRows, chapterRows, streakCount, levelInfo, displayName] = await Promise.all([
        getTasksForDate(user.id, date),
        getChaptersOverview(),
        getStreak(user.id),
        getLevelInfo(user.id),
        getDisplayName(user.id),
      ]);

      setTasks(taskRows);
      setChapters(chapterRows);
      setStreak(streakCount);
      setLevel(levelInfo);
      setName(displayName);
    } catch (err) {
      console.error('Failed to load planner:', err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  async function markDone(taskId: string) {
    if (!userId) return;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'completed' } : t)));
    try {
      await closeTask(userId, taskId, 'completed');
      const [streakCount, levelInfo] = await Promise.all([getStreak(userId), getLevelInfo(userId)]);
      setStreak(streakCount);
      setLevel(levelInfo);
    } catch {
      load();
    }
  }

  async function markIncomplete(taskId: string, reason: IncompleteReason) {
    if (!userId) return;
    setReasonPickerFor(null);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'skipped', incomplete_reason: reason } : t))
    );
    try {
      await closeTask(userId, taskId, 'skipped', { incompleteReason: reason });
    } catch {
      load();
    }
  }

  const tasksBySlot = SLOT_ORDER.map((slot) => ({
    slot,
    items: tasks.filter((t) => t.time_slot === slot),
  })).filter((g) => g.items.length > 0);

  const slotStats = SLOT_ORDER.map((slot) => {
    const items = tasks.filter((t) => t.time_slot === slot);
    return { slot, total: items.length, completed: items.filter((t) => t.status === 'completed').length };
  });

  // Next mission: earliest pending task in slot order.
  const nextTask = tasksBySlot.flatMap((g) => g.items).find((t) => t.status === 'pending') ?? null;

  const now = new Date();

  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 pb-28 pt-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-paper/40">{format(now, 'EEEE, d MMMM')}</p>
        <h1 className="font-display text-2xl font-medium">
          {greeting(now.getHours())}, {name}
        </h1>
        <p className="mt-0.5 text-sm text-paper/40">Stay in orbit.</p>
      </header>

      {loading ? (
        <p className="text-sm text-paper/40">Loading…</p>
      ) : (
        <>
          <div className="mb-6">
            <OrbitDayRing slots={slotStats} />
          </div>

          <div className="mb-6">
            <StreakAndLevel streak={streak} level={level} />
          </div>

          <div className="mb-6">
            <NextMissionCard task={nextTask} onStart={() => {}} />
          </div>

          {tasksBySlot.length === 0 ? (
            <div className="rounded-xl2 border border-dashed border-white/10 p-8 text-center text-sm text-paper/40">
              <p className="mb-3">Nothing planned. Let's create today's mission.</p>
              <button
                onClick={() => setAddTaskOpen(true)}
                className="rounded-xl2 bg-amber px-4 py-2 text-xs font-semibold text-ink"
              >
                Add task
              </button>
            </div>
          ) : (
            <SlotAccordion
              tasksBySlot={tasksBySlot}
              onDone={markDone}
              onSkip={markIncomplete}
              reasonPickerFor={reasonPickerFor}
              setReasonPickerFor={setReasonPickerFor}
              defaultOpenSlot={currentSlot(now.getHours())}
            />
          )}

          <button
            onClick={() => setAddTaskOpen(true)}
            className="fixed bottom-20 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-amber text-2xl font-medium text-ink shadow-xl"
            aria-label="Add task"
          >
            +
          </button>
        </>
      )}

      {userId && (
        <AddTaskModal
          userId={userId}
          date={date}
          chapters={chapters}
          open={addTaskOpen}
          onClose={() => setAddTaskOpen(false)}
          onCreated={load}
        />
      )}
    </main>
  );
}
