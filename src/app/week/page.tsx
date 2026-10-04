'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { getWeekOverview, getTasksForDate, type DayOverview, type TaskWithChapter } from '@/api/tasks';
import { getExams, deleteExam } from '@/api/exams';
import { getChaptersOverview, type ChapterOverview } from '@/api/chapters';
import type { ExamReadinessRow, TrackType } from '@/types/database.types';
import { WeekDayCard } from '@/components/WeekDayCard';
import { ExamCard } from '@/components/ExamCard';
import { AddExamModal } from '@/components/AddExamModal';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { getCurriculumChapters } from '@/lib/curriculumData';

function withTimeout<T>(promise: Promise<T>, ms = 800): Promise<T> {
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
  const [track, setTrack] = useState<TrackType>('jee_nsep');

  const weekDates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i), 'yyyy-MM-dd')
      ),
    []
  );

  // Eager initialization — renders immediately (0ms latency)
  const [days, setDays] = useState<DayOverview[]>(() =>
    weekDates.map((date, idx) => ({ date, total: 3, completed: idx === 0 ? 1 : 0 }))
  );
  const [exams, setExams] = useState<ExamReadinessRow[]>(() => getFallbackExams('jee_nsep'));
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
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [dayTasks, setDayTasks] = useState<Record<string, TaskWithChapter[]>>({});
  const [loadingDay, setLoadingDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [addExamOpen, setAddExamOpen] = useState(false);

  // Read track preference once
  useEffect(() => {
    const saved = localStorage.getItem('orbit_active_track') as TrackType | null;
    if (saved && saved !== track) {
      setTrack(saved);
      setExams(getFallbackExams(saved));
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
  }, [track]);

  // Background sync with timeout protection
  const load = useCallback(
    async (uid: string, activeTrack = track) => {
      try {
        const results = await Promise.allSettled([
          withTimeout(getWeekOverview(uid, weekDates[0], weekDates[6]), 800),
          withTimeout(getExams(), 800),
          withTimeout(getChaptersOverview(activeTrack)),
        ]);
        const [overviewRes, examRes, chapterRes] = results;

        if (overviewRes.status === 'fulfilled' && overviewRes.value.length > 0) {
          const byDate = new Map(overviewRes.value.map((d) => [d.date, d]));
          const fullWeek = weekDates.map((date) => byDate.get(date) ?? { date, total: 0, completed: 0 });
          setDays(fullWeek);
        }

        if (examRes.status === 'fulfilled' && examRes.value.length > 0) {
          setExams(examRes.value);
        }

        if (chapterRes.status === 'fulfilled' && chapterRes.value.length > 0) {
          setChapters(chapterRes.value);
        }
      } catch {
        // Fallback already rendered
      }
    },
    [track, weekDates]
  );

  useEffect(() => {
    if (userId) {
      load(userId, track);
    }
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
        const tasks = await withTimeout(getTasksForDate(userId, date), 800);
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
    if (userId) {
      await deleteExam(examId).catch(() => {});
    }
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
      {exams.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-paper/40">
              Upcoming Exams ({exams.length})
            </h2>
            <span className="text-[11px] text-paper/30 font-mono">Exam proximity engine</span>
          </div>
          <div className="flex flex-col gap-3">
            {exams.map((exam) => (
              <ExamCard key={exam.exam_id} exam={exam} onDelete={handleDeleteExam} />
            ))}
          </div>
        </section>
      )}

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
            />
          ))}
        </div>
      </section>

      {/* Add Exam Modal */}
      {userId && (
        <AddExamModal
          userId={userId}
          chapters={chapters}
          open={addExamOpen}
          onClose={() => setAddExamOpen(false)}
          onCreated={refresh}
        />
      )}
    </main>
  );
}
