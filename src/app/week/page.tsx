'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { getWeekOverview, getTasksForDate, createTask, type DayOverview, type TaskWithChapter } from '@/api/tasks';
import { getExams, deleteExam } from '@/api/exams';
import { getChaptersOverview, type ChapterOverview } from '@/api/chapters';
import type { ExamReadinessRow, TrackType } from '@/types/database.types';
import { WeekDayCard } from '@/components/WeekDayCard';
import { ExamCard } from '@/components/ExamCard';
import { AddExamModal } from '@/components/AddExamModal';
import { EditExamModal } from '@/components/EditExamModal';
import { AddTaskModal } from '@/components/AddTaskModal';
import { CalibratePlanModal } from '@/components/CalibratePlanModal';
import type { SuggestedTask } from '@/lib/planningEngine';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { getCurriculumChapters } from '@/lib/curriculumData';
import { syncAllUserData } from '@/lib/syncService';
import { subscribeDataChanged } from '@/lib/syncEvents';

function withTimeout<T>(promise: Promise<T>, ms = 6000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Network timeout')), ms)),
  ]);
}

const getFallbackExams = (activeTrack: TrackType): ExamReadinessRow[] => {
  const today = new Date();
  if (activeTrack === 'jee_nsep') {
    return [
      {
        exam_id: 'sample-nsep-1',
        name: 'NSEP Physics Olympiad 2026',
        exam_type: 'nsep',
        exam_date: format(addDays(today, 45), 'yyyy-MM-dd'),
        total_chapters: 12,
        mastered_chapters: 4,
        avg_confidence: 68,
      },
      {
        exam_id: 'sample-jee-1',
        name: 'JEE Main Session 1 Mock Sprint',
        exam_type: 'jee_main',
        exam_date: format(addDays(today, 90), 'yyyy-MM-dd'),
        total_chapters: 28,
        mastered_chapters: 10,
        avg_confidence: 74,
      },
    ];
  }
  return [
    {
      exam_id: 'sample-contest-1',
      name: 'LeetCode Weekly Contest 417',
      exam_type: 'college_contest',
      exam_date: format(addDays(today, 3), 'yyyy-MM-dd'),
      total_chapters: 8,
      mastered_chapters: 5,
      avg_confidence: 82,
    },
    {
      exam_id: 'sample-midsem-1',
      name: 'Deep Learning & Systems Midsem Exam',
      exam_type: 'midsem',
      exam_date: format(addDays(today, 21), 'yyyy-MM-dd'),
      total_chapters: 10,
      mastered_chapters: 4,
      avg_confidence: 70,
    },
  ];
};

export default function WeekPage() {
  const { userId, authLoading } = useRequireAuth();

  const initialTrack: TrackType = typeof window !== 'undefined'
    ? ((localStorage.getItem('orbit_active_track') as TrackType) || 'college_cs_aiml')
    : 'college_cs_aiml';

  const [track, setTrack] = useState<TrackType>(() => initialTrack);

  const weekDates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i), 'yyyy-MM-dd')
      ),
    []
  );

  // Eager initialization — authenticated users start clean; guests get fallback
  const [days, setDays] = useState<DayOverview[]>(() =>
    weekDates.map((date, idx) => ({ date, total: 3, completed: idx === 0 ? 1 : 0 }))
  );
  const [exams, setExams] = useState<ExamReadinessRow[]>([]);
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
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [dayTasks, setDayTasks] = useState<Record<string, TaskWithChapter[]>>({});
  const [loadingDay, setLoadingDay] = useState<string | null>(null);
  const [addExamOpen, setAddExamOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamReadinessRow | null>(null);
  const [planModalDate, setPlanModalDate] = useState<string | null>(null);
  const [calibrateModalDate, setCalibrateModalDate] = useState<string | null>(null);

  // Read track preference once
  useEffect(() => {
    const saved = localStorage.getItem('orbit_active_track') as TrackType | null;
    if (saved && saved !== track) {
      setTrack(saved);
      if (!userId) {
        setExams(getFallbackExams(saved));
      }
      setChapters(
        getCurriculumChapters(saved).map((c) => ({
          id: c.id,
          name: c.name,
          subjectId: c.subjectId,
          subjectName: c.subjectName,
          confidence: c.confidence,
          status: c.status,
          unresolvedMistakes: c.unresolvedMistakes,
        }))
      );
    }
  }, [track, userId]);

  // Background sync with timeout protection
  const load = useCallback(
    async (uid: string, activeTrack = track) => {
      try {
        const results = await Promise.allSettled([
          withTimeout(getWeekOverview(uid, weekDates[0], weekDates[6]), 6000),
          withTimeout(getExams(uid), 6000),
          withTimeout(getChaptersOverview(activeTrack), 6000),
        ]);
        const [overviewRes, examRes, chapterRes] = results;

        if (overviewRes.status === 'fulfilled' && overviewRes.value.length > 0) {
          const byDate = new Map(overviewRes.value.map((d) => [d.date, d]));
          const fullWeek = weekDates.map((date) => byDate.get(date) ?? { date, total: 0, completed: 0 });
          setDays(fullWeek);
        }

        if (examRes.status === 'fulfilled') {
          setExams(examRes.value);
        } else if (!uid) {
          setExams(getFallbackExams(activeTrack));
        }

        if (chapterRes.status === 'fulfilled' && chapterRes.value.length > 0) {
          setChapters(chapterRes.value);
        }
      } catch (err) {
        console.warn('Week data load failed:', err);
      }
    },
    [track, weekDates]
  );

  useEffect(() => {
    if (!userId) {
      if (!authLoading) {
        setExams(getFallbackExams(track));
      }
      return;
    }

    // Trigger background synchronization so phone and PC share identical tests
    syncAllUserData(userId).then(() => {
      load(userId, track);
    });

    load(userId, track);
  }, [userId, authLoading, load, track]);

  // Real-time reactive updates: Re-sync when switching back to tab or on cross-tab update
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
            if (isMounted) load(userId, track);
          });
        } else {
          if (isMounted) load(userId, track);
        }
      }
    };

    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);

    const unsubscribe = subscribeDataChanged((source) => {
      if (source !== 'local-optimistic' && isMounted) {
        load(userId, track);
      }
    });

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
      unsubscribe();
    };
  }, [userId, load, track]);

  const refresh = useCallback(() => {
    if (userId) load(userId, track);
  }, [userId, load, track]);

  async function toggleDay(date: string) {
    if (openDay === date) {
      setOpenDay(null);
      return;
    }
    setOpenDay(date);
    if (!dayTasks[date] && userId) {
      setLoadingDay(date);
      try {
        const tasks = await withTimeout(getTasksForDate(userId, date), 6000);
        setDayTasks((prev) => ({ ...prev, [date]: tasks }));
      } catch {
        // Keep smooth fallback
      } finally {
        setLoadingDay(null);
      }
    }
  }

  async function handleDeleteExam(examId: string) {
    setExams((prev) => prev.filter((e) => e.exam_id !== examId));
    await deleteExam(examId).catch(() => {});
  }

  async function handleTaskCreated(date: string) {
    if (userId) {
      try {
        const updated = await withTimeout(getTasksForDate(userId, date), 6000);
        setDayTasks((prev) => ({ ...prev, [date]: updated }));
      } catch {
        // fallback
      }
      load(userId, track);
    }
  }

  async function handleApplyCalibratedPlan(date: string, suggested: SuggestedTask[]) {
    if (!userId) return;
    for (const st of suggested) {
      await createTask({
        user_id: userId,
        title: st.title,
        chapter_id: st.chapterId,
        scheduled_date: date,
        time_slot: st.slot,
        effort_level: st.effort,
        priority: st.priority ?? 2,
        position: 0,
        status: 'pending',
        incomplete_reason: null,
        estimated_minutes: st.estimatedMinutes,
        actual_minutes: null,
      }).catch(() => {});
    }
    try {
      const updated = await withTimeout(getTasksForDate(userId, date), 6000);
      setDayTasks((prev) => ({ ...prev, [date]: updated }));
    } catch {
      // fallback
    }
    load(userId, track);
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 pb-32 pt-8">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-paper/40">Readiness & Milestones</p>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="font-display text-2xl font-semibold text-paper">Week & Tests</h1>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[10px] text-amber">
              {track === 'jee_nsep' ? 'STEM • JEE' : 'CS & AI'}
            </span>
          </div>
        </div>
        <button
          onClick={() => setAddExamOpen(true)}
          className="rounded-xl bg-amber px-3.5 py-2 text-xs font-semibold text-ink shadow-md shadow-amber/20 hover:brightness-110 active:scale-95 transition"
        >
          + Add Test
        </button>
      </header>

      {/* Upcoming Tests / Milestones Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-paper/40">
            Upcoming Exams ({exams.length})
          </h2>
          <span className="text-[11px] text-paper/30 font-mono">Exam proximity engine</span>
        </div>

        {exams.length > 0 ? (
          <div className="flex flex-col gap-3">
            {exams.map((exam) => (
              <ExamCard
                key={exam.exam_id}
                exam={exam}
                onEdit={(e) => setEditingExam(e)}
                onDelete={handleDeleteExam}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-ink-50/50 p-6 text-center">
            <p className="text-xs text-paper/40">No upcoming tests or milestones scheduled.</p>
            <button
              onClick={() => setAddExamOpen(true)}
              className="mt-2 text-xs font-semibold text-amber hover:underline"
            >
              + Add a test milestone
            </button>
          </div>
        )}
      </section>

      {/* 7-Day Week Trajectory Section */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-paper/40">
            7-Day Trajectory
          </h2>
          <span className="text-[11px] text-paper/30 font-mono">Mon – Sun</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {days.map((day) => (
            <WeekDayCard
              key={day.date}
              day={day}
              isOpen={openDay === day.date}
              tasks={dayTasks[day.date] ?? []}
              loadingTasks={loadingDay === day.date}
              onToggle={() => toggleDay(day.date)}
              onPlanDay={(d) => setPlanModalDate(d)}
              onAutoCalibrateDay={(d) => setCalibrateModalDate(d)}
            />
          ))}
        </div>
      </section>

      {/* Add Exam Modal */}
      <AddExamModal
        userId={userId ?? 'local-user'}
        chapters={chapters}
        open={addExamOpen}
        onClose={() => setAddExamOpen(false)}
        onCreated={refresh}
      />

      {/* Edit Exam Modal */}
      {editingExam && (
        <EditExamModal
          userId={userId ?? 'local-user'}
          exam={editingExam}
          chapters={chapters}
          open={Boolean(editingExam)}
          onClose={() => setEditingExam(null)}
          onUpdated={refresh}
          onDeleted={(id) => handleDeleteExam(id)}
        />
      )}

      {/* Plan Day / Add Task Modal */}
      {planModalDate && (
        <AddTaskModal
          userId={userId ?? 'local-user'}
          date={planModalDate}
          chapters={chapters}
          open={Boolean(planModalDate)}
          onClose={() => setPlanModalDate(null)}
          onCreated={() => {
            const targetDate = planModalDate;
            setPlanModalDate(null);
            handleTaskCreated(targetDate);
          }}
        />
      )}

      {/* Auto-Calibrate Day Modal */}
      {calibrateModalDate && (
        <CalibratePlanModal
          userId={userId ?? 'local-user'}
          track={track}
          date={calibrateModalDate}
          tasks={dayTasks[calibrateModalDate] ?? []}
          chapters={chapters}
          open={Boolean(calibrateModalDate)}
          onClose={() => setCalibrateModalDate(null)}
          onApplyPlan={(suggested) => {
            const targetDate = calibrateModalDate;
            setCalibrateModalDate(null);
            handleApplyCalibratedPlan(targetDate, suggested);
          }}
        />
      )}
    </main>
  );
}
