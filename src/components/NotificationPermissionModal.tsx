'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Sun, Moon, Volume2, Sparkles, X, Check } from 'lucide-react';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { playOrbitChime } from '@/lib/orbitSound';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  dispatchOrbitNotification,
} from '@/lib/notificationService';

export function NotificationPermissionModal() {
  const { userId, authLoading } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Only prompt registered/logged-in users, and never on the /login screen
    if (authLoading || !userId || pathname === '/login') return;

    if (!isNotificationSupported()) return;

    // Check if permission has not yet been decided
    const perm = getNotificationPermission();
    if (perm !== 'default') return;

    // Check if the user already dismissed it this session
    const dismissed = sessionStorage.getItem('orbit_notif_modal_dismissed');
    if (dismissed === 'true') return;

    // Short delay so it feels natural after dashboard transition
    const timer = setTimeout(() => {
      setOpen(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [userId, authLoading, pathname]);

  async function handleEnable() {
    setLoading(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        setSuccess(true);
        // Play signature celestial chime
        playOrbitChime().catch(() => {});
        // Send welcome test notification
        dispatchOrbitNotification('Orbit · Notifications Active 🪐', {
          body: 'Your morning checks (7:30 & 9:00 AM) and evening debrief (10:00 PM) are locked in.',
          url: '/planner',
          tag: 'orbit-welcome',
        }).catch(() => {});

        setTimeout(() => {
          setOpen(false);
        }, 1500);
      } else {
        setOpen(false);
      }
    } finally {
      setLoading(false);
      sessionStorage.setItem('orbit_notif_modal_dismissed', 'true');
    }
  }

  function handleDismiss() {
    sessionStorage.setItem('orbit_notif_modal_dismissed', 'true');
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink-950/80 backdrop-blur-md"
            onClick={handleDismiss}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber/25 bg-ink-50 p-6 shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-paper/40 hover:bg-white/5 hover:text-paper transition"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            {/* Header Badge */}
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber/20 text-amber shadow-sm">
                <Bell size={18} />
              </div>
              <div>
                <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber font-semibold">
                  <Sparkles size={11} />
                  Orbit Rhythm Engine
                </span>
                <h3 className="font-heading text-lg font-bold text-paper">
                  Enable Daily Orbit Check-ins?
                </h3>
              </div>
            </div>

            <p className="text-xs text-paper/70 leading-relaxed mb-4">
              Stay in rhythm without the spam. Orbit alerts you only when your day needs attention, accompanied by our signature celestial chime:
            </p>

            {/* Checkpoints Preview */}
            <div className="space-y-2 mb-5">
              <div className="rounded-2xl border border-white/5 bg-ink/50 p-3 flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber/15 text-amber shrink-0 mt-0.5">
                  <Sun size={13} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-paper">
                    7:30 AM & 9:00 AM · Morning Launch Check
                  </p>
                  <p className="text-[11px] text-paper/50 mt-0.5">
                    Fires only if 0 tasks are planned for today. Automatically muted if you already charted your missions.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-ink/50 p-3 flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-subject-physics/20 text-subject-physics shrink-0 mt-0.5">
                  <Moon size={13} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-paper">
                    10:00 PM · Evening Reflection Debrief
                  </p>
                  <p className="text-[11px] text-paper/50 mt-0.5">
                    A gentle prompt to log your wins, energy levels, and close the loop on your day.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-ink/30 px-3 py-2 flex items-center justify-between text-[11px] text-paper/60">
                <div className="flex items-center gap-2">
                  <Volume2 size={13} className="text-amber" />
                  <span>Distinctive Orbit chime (unlike generic beeps)</span>
                </div>
                <button
                  type="button"
                  onClick={() => playOrbitChime()}
                  className="font-medium text-amber hover:underline text-[11px]"
                >
                  Preview Sound
                </button>
              </div>
            </div>

            {/* Success Banner */}
            {success ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-xs font-semibold text-emerald-400">
                <Check size={16} />
                <span>Orbit Notifications Active!</span>
              </div>
            ) : (
              /* Action Buttons */
              <div className="flex items-center gap-3">
                <button
                  onClick={handleEnable}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-amber px-4 py-3 text-xs font-bold text-ink-950 transition hover:bg-amber-400 active:scale-95 disabled:opacity-50 shadow-md shadow-amber/10"
                >
                  <Bell size={14} />
                  <span>{loading ? 'Requesting…' : 'Enable Orbit Notifications'}</span>
                </button>

                <button
                  onClick={handleDismiss}
                  disabled={loading}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-paper/60 transition hover:bg-white/10 hover:text-paper active:scale-95"
                >
                  Maybe Later
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
