'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Sun, Moon, Bell, Sparkles, ArrowRight, X } from 'lucide-react';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  checkTodayPlanned,
  checkTodayReflected,
} from '@/lib/notificationService';
import { playOrbitChime } from '@/lib/orbitSound';

interface Props {
  userId?: string;
  onOpenReflection: () => void;
  onOpenAddTask: () => void;
}

export function DailyRhythmBanner({ userId, onOpenReflection, onOpenAddTask }: Props) {
  const [showEveningDebrief, setShowEveningDebrief] = useState(false);
  const [showMorningCheck, setShowMorningCheck] = useState(false);
  const [showPermissionNudge, setShowPermissionNudge] = useState(false);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const totalMinutes = now.getHours() * 60 + now.getMinutes();

    // 1. Check Notification Permission status
    if (isNotificationSupported()) {
      const perm = getNotificationPermission();
      if (perm !== 'granted') {
        const dismissed = sessionStorage.getItem(`orbit_nudge_perm_${todayStr}`);
        if (!dismissed) setShowPermissionNudge(true);
      }
    }

    // 2. Check 10:00 PM Evening Debrief Catch-Up
    // If it is 10:00 PM or later (totalMinutes >= 22 * 60)
    if (totalMinutes >= 22 * 60) {
      const eveningDismissed = sessionStorage.getItem(`orbit_nudge_night_${todayStr}`);
      if (!eveningDismissed && userId) {
        checkTodayReflected(userId).then((reflected) => {
          if (!reflected && isMounted) {
            setShowEveningDebrief(true);
            playOrbitChime().catch(() => {});
          }
        });
      }
    }

    // 3. Check Morning Check (between 7:30 AM and 12:00 PM)
    if (totalMinutes >= 7 * 60 + 30 && totalMinutes < 12 * 60) {
      const morningDismissed = sessionStorage.getItem(`orbit_nudge_morning_${todayStr}`);
      if (!morningDismissed) {
        checkTodayPlanned(userId).then(({ planned }) => {
          if (!planned && isMounted) {
            setShowMorningCheck(true);
            playOrbitChime().catch(() => {});
          }
        });
      }
    }

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  if (showEveningDebrief) {
    return (
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-subject-physics/30 bg-subject-physics/10 p-3.5 shadow-lg backdrop-blur-sm transition-all animate-fadeIn">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-subject-physics/20 text-subject-physics shrink-0">
            <Moon size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-subject-physics">
                10:00 PM Checkpoint
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-subject-physics animate-pulse" />
            </div>
            <p className="text-xs font-semibold text-paper mt-0.5">
              Daily Debrief Pending: Log your wins &amp; energy to close today.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowEveningDebrief(false);
              onOpenReflection();
            }}
            className="flex items-center gap-1 rounded-xl bg-subject-physics/20 border border-subject-physics/40 px-3 py-1.5 text-xs font-bold text-subject-physics hover:bg-subject-physics/30 active:scale-95 transition"
          >
            <span>Reflect</span>
            <ArrowRight size={13} />
          </button>
          <button
            onClick={() => {
              sessionStorage.setItem(`orbit_nudge_night_${todayStr}`, 'true');
              setShowEveningDebrief(false);
            }}
            className="p-1 text-paper/40 hover:text-paper transition"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  if (showMorningCheck) {
    return (
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-amber/30 bg-amber/10 p-3.5 shadow-lg backdrop-blur-sm transition-all animate-fadeIn">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber/20 text-amber shrink-0">
            <Sun size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber">
                Morning Launch Check
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-amber animate-pulse" />
            </div>
            <p className="text-xs font-semibold text-paper mt-0.5">
              0 tasks planned for today. Lock in your core mission before noon.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowMorningCheck(false);
              onOpenAddTask();
            }}
            className="flex items-center gap-1 rounded-xl bg-amber px-3 py-1.5 text-xs font-bold text-ink-950 hover:bg-amber-400 active:scale-95 transition"
          >
            <span>Plan Day</span>
            <ArrowRight size={13} />
          </button>
          <button
            onClick={() => {
              sessionStorage.setItem(`orbit_nudge_morning_${todayStr}`, 'true');
              setShowMorningCheck(false);
            }}
            className="p-1 text-paper/40 hover:text-paper transition"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  if (showPermissionNudge) {
    return (
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/10 bg-ink-50/90 p-3 shadow-md backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber/15 text-amber shrink-0">
            <Bell size={14} />
          </div>
          <p className="text-xs text-paper/80">
            Orbit check-ins (7:30 &amp; 9:00 AM, 10:00 PM) are paused.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const ok = await requestNotificationPermission();
              if (ok) {
                setShowPermissionNudge(false);
                playOrbitChime().catch(() => {});
              }
            }}
            className="rounded-xl bg-amber/20 border border-amber/30 px-2.5 py-1 text-[11px] font-semibold text-amber hover:bg-amber/30 active:scale-95 transition"
          >
            Enable Now
          </button>
          <button
            onClick={() => {
              sessionStorage.setItem(`orbit_nudge_perm_${todayStr}`, 'true');
              setShowPermissionNudge(false);
            }}
            className="p-1 text-paper/40 hover:text-paper transition"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
