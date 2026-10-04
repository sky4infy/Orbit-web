'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, X, Sparkles, Clock, CheckCircle2, RotateCcw } from 'lucide-react';
import { startStudySession, endStudySession } from '@/api/study_sessions';
import { closeTask, type TaskWithChapter } from '@/api/tasks';

interface Props {
  userId: string;
  task: TaskWithChapter | null;
  open: boolean;
  onClose: () => void;
  onSessionEnded?: () => void;
}

type TimerPreset = 'stopwatch' | 25 | 50 | 90;

export function FocusTimerModal({ userId, task, open, onClose, onSessionEnded }: Props) {
  const [preset, setPreset] = useState<TimerPreset>(50);
  const [isRunning, setIsRunning] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [pausedSeconds, setPausedSeconds] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [markTaskComplete, setMarkTaskComplete] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const accumulatedSecondsRef = useRef<number>(0);
  const wakeLockRef = useRef<any>(null);

  const targetSeconds = typeof preset === 'number' ? preset * 60 : null;
  const remainingSeconds = targetSeconds ? Math.max(0, targetSeconds - secondsElapsed) : secondsElapsed;

  // Format mm:ss or hh:mm:ss
  function formatTime(totalSec: number) {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Request Screen Wake Lock so phone doesn't sleep during deep work
  const requestWakeLock = async () => {
    try {
      if (typeof window !== 'undefined' && 'wakeLock' in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch {
      // Ignored if device policy or low battery rejects wakeLock
    }
  };

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch {
      // Ignore
    }
  };

  // Drift-proof timer: calculates elapsed time from real system timestamps
  useEffect(() => {
    if (isRunning) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
      requestWakeLock();

      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const currentSegment = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setSecondsElapsed(accumulatedSecondsRef.current + currentSegment);
        }
      }, 500);

      // Instantly catches up elapsed time when returning from screen timeout or background app
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && isRunning && startTimeRef.current) {
          const currentSegment = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setSecondsElapsed(accumulatedSecondsRef.current + currentSegment);
          requestWakeLock();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      releaseWakeLock();
    }
  }, [isRunning]);

  // Clean up wake lock on unmount
  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, []);

  async function handleStart() {
    startTimeRef.current = Date.now();
    setIsRunning(true);
    if (!sessionId && userId) {
      try {
        const session = await startStudySession(userId, task?.id ?? null);
        setSessionId(session.id);
      } catch (err) {
        console.error('Failed to start study session:', err);
      }
    }
  }

  function handlePause() {
    setIsRunning(false);
    if (startTimeRef.current) {
      const currentSegment = Math.floor((Date.now() - startTimeRef.current) / 1000);
      accumulatedSecondsRef.current += currentSegment;
      startTimeRef.current = null;
    }
    releaseWakeLock();
  }

  async function handleFinish() {
    setIsRunning(false);
    releaseWakeLock();
    if (startTimeRef.current) {
      const currentSegment = Math.floor((Date.now() - startTimeRef.current) / 1000);
      accumulatedSecondsRef.current += currentSegment;
      startTimeRef.current = null;
    }
    setIsFinishing(true);
    const minutesSpent = Math.max(1, Math.round(secondsElapsed / 60));

    try {
      if (sessionId && userId) {
        await endStudySession(userId, sessionId, pausedSeconds);
      }
      if (task && userId) {
        if (markTaskComplete) {
          await closeTask(userId, task.id, 'completed', { actualMinutes: minutesSpent });
        }
      }
      setTimeout(() => {
        setIsFinishing(false);
        setSecondsElapsed(0);
        accumulatedSecondsRef.current = 0;
        setSessionId(null);
        onSessionEnded?.();
        onClose();
      }, 900);
    } catch (err) {
      console.error('Failed to complete study session:', err);
      setIsFinishing(false);
      onClose();
    }
  }

  function handleReset() {
    setIsRunning(false);
    startTimeRef.current = null;
    accumulatedSecondsRef.current = 0;
    setSecondsElapsed(0);
    setPausedSeconds(0);
    releaseWakeLock();
  }

  if (!open) return null;

  const progressPct = targetSeconds
    ? Math.min(100, (secondsElapsed / targetSeconds) * 100)
    : Math.min(100, (secondsElapsed / 3600) * 100);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (!isRunning) onClose();
          }}
          className="absolute inset-0 bg-ink/85 backdrop-blur-lg"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          className="relative flex w-full max-w-md flex-col items-center rounded-3xl border border-white/10 bg-gradient-to-b from-ink-50 to-ink p-7 shadow-2xl text-center"
        >
          {/* Top Bar */}
          <div className="flex w-full items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber">
              <Clock size={14} /> Deep Work Chamber
            </span>
            <button
              onClick={onClose}
              disabled={isRunning}
              className="rounded-full p-1.5 text-paper/40 transition hover:bg-white/10 hover:text-paper disabled:opacity-30"
            >
              <X size={18} />
            </button>
          </div>

          {/* Task Badge */}
          {task ? (
            <div className="mt-4 flex max-w-xs flex-col items-center">
              <span className="rounded-full bg-subject-physics/10 px-3 py-1 text-[11px] font-medium text-subject-physics ring-1 ring-subject-physics/20">
                {task.chapter?.name ?? 'Focused Study'}
              </span>
              <h3 className="mt-2 text-base font-medium text-paper line-clamp-2">{task.title}</h3>
            </div>
          ) : (
            <div className="mt-4">
              <h3 className="text-base font-medium text-paper">Deep Focus Session</h3>
              <p className="text-xs text-paper/40">Uninterrupted learning block</p>
            </div>
          )}

          {/* Preset Buttons */}
          <div className="mt-5 flex gap-2">
            {[
              { id: 'stopwatch', label: 'Stopwatch' },
              { id: 25, label: '25m Sprint' },
              { id: 50, label: '50m Deep' },
              { id: 90, label: '90m Olympiad' },
            ].map(({ id, label }) => {
              const active = preset === id;
              return (
                <button
                  key={id}
                  disabled={isRunning || secondsElapsed > 0}
                  onClick={() => setPreset(id as TimerPreset)}
                  className={`rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                    active
                      ? 'bg-amber text-ink font-semibold'
                      : 'bg-white/5 text-paper/60 hover:bg-white/10'
                  } disabled:opacity-40`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Orbital Timer Dial */}
          <div className="relative my-7 flex h-56 w-56 items-center justify-center">
            {/* Pulsing Aura */}
            {isRunning && (
              <motion.div
                animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.35, 0.15] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-amber/20 blur-xl"
              />
            )}

            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
              {/* Background ring */}
              <circle
                cx="50"
                cy="50"
                r="44"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                className="text-white/10"
              />
              {/* Animated Progress ring */}
              <circle
                cx="50"
                cy="50"
                r="44"
                stroke="currentColor"
                strokeWidth="5"
                strokeDasharray="276.46"
                strokeDashoffset={276.46 - (276.46 * progressPct) / 100}
                strokeLinecap="round"
                fill="transparent"
                className="text-amber transition-all duration-300 ease-out"
              />
            </svg>

            {/* Central Counter */}
            <div className="absolute flex flex-col items-center">
              <span className="font-mono text-4xl font-semibold tracking-tight text-paper">
                {formatTime(targetSeconds ? remainingSeconds : secondsElapsed)}
              </span>
              <span className="mt-1 text-xs text-paper/40 font-mono">
                {targetSeconds ? (remainingSeconds === 0 ? 'Goal Reached!' : 'Remaining') : 'Elapsed'}
              </span>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-3">
            {isRunning ? (
              <button
                onClick={handlePause}
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-paper ring-1 ring-white/20 transition hover:bg-white/20"
                aria-label="Pause"
              >
                <Pause size={24} />
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber text-ink shadow-lg shadow-amber/20 transition hover:brightness-110"
                aria-label="Start"
              >
                <Play size={24} className="ml-1" />
              </button>
            )}

            {secondsElapsed > 0 && (
              <>
                <button
                  onClick={handleFinish}
                  disabled={isFinishing}
                  className="flex h-14 items-center gap-2 rounded-2xl bg-sage/20 px-5 text-sm font-semibold text-sage ring-1 ring-sage/40 transition hover:bg-sage/30 disabled:opacity-50"
                >
                  <Square size={16} fill="currentColor" />
                  {isFinishing ? 'Saving…' : 'Complete & Log'}
                </button>
                <button
                  onClick={handleReset}
                  disabled={isRunning}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-paper/40 transition hover:bg-white/10 hover:text-paper disabled:opacity-30"
                  aria-label="Reset"
                >
                  <RotateCcw size={18} />
                </button>
              </>
            )}
          </div>

          {/* Task Completion Toggle */}
          {task && secondsElapsed > 0 && (
            <label className="mt-5 flex cursor-pointer items-center gap-2 text-xs text-paper/70">
              <input
                type="checkbox"
                checked={markTaskComplete}
                onChange={(e) => setMarkTaskComplete(e.target.checked)}
                className="rounded border-white/20 bg-ink text-amber focus:ring-amber"
              />
              <span>Mark "{task.title}" as completed</span>
            </label>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
