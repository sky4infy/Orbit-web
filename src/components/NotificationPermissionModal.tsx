'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Sun, Moon, Volume2, Sparkles, X, Check, AlertTriangle } from 'lucide-react';
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
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    // Only prompt when user is loaded and not on the /login page
    if (authLoading || pathname === '/login') return;

    if (!isNotificationSupported()) return;

    const perm = getNotificationPermission();
    setPermissionState(perm);

    // If already granted, no need to ask
    if (perm === 'granted') return;

    // Check if user already dismissed it in this browser session
    const dismissed = sessionStorage.getItem('orbit_notif_prompt_v2');
    if (dismissed === 'true') return;

    // Show after a gentle 800ms delay on dashboard entry
    const timer = setTimeout(() => {
      setOpen(true);
    }, 800);

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
        // Send instant verification test notification
        dispatchOrbitNotification('Orbit · Notifications Active 🪐', {
          body: 'Sound and alerts verified! 7:30 AM, 9:00 AM, and 10:00 PM check-ins are locked in.',
          url: '/planner',
          tag: 'orbit-welcome',
        }).catch(() => {});

        setTimeout(() => {
          setOpen(false);
        }, 1600);
      } else {
        const nextPerm = getNotificationPermission();
        setPermissionState(nextPerm);
      }
    } finally {
      setLoading(false);
      sessionStorage.setItem('orbit_notif_prompt_v2', 'true');
    }
  }

  function handleDismiss() {
    sessionStorage.setItem('orbit_notif_prompt_v2', 'true');
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
            className="fixed inset-0 bg-ink-950/85 backdrop-blur-md"
            onClick={handleDismiss}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber/30 bg-ink-50 p-6 shadow-2xl"
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
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber/20 text-amber shadow-sm shrink-0">
                <Bell size={20} />
              </div>
              <div>
                <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber font-semibold">
                  <Sparkles size={11} />
                  Orbit Rhythm Protocol
                </span>
                <h3 className="font-heading text-lg font-bold text-paper">
                  Enable Orbit Notifications
                </h3>
              </div>
            </div>

            <p className="text-xs text-paper/70 leading-relaxed mb-4">
              Never miss your morning launch or evening reflection. Orbit alerts you only when your study loop is unclosed, accompanied by our signature celestial chime:
            </p>

            {/* Checkpoints Preview */}
            <div className="space-y-2 mb-5">
              <div className="rounded-2xl border border-white/5 bg-ink/50 p-3 flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber/15 text-amber shrink-0 mt-0.5">
                  <Sun size={13} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-paper">
                    7:30 AM & 9:00 AM · Morning Orbit Check
                  </p>
                  <p className="text-[11px] text-paper/50 mt-0.5">
                    Notifies you if today is unplanned. Auto-muted if tasks are already scheduled.
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
                    Prompts you to log your wins, energy levels, and lock in your recovery. Auto-muted once logged.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-ink/30 px-3 py-2 flex items-center justify-between text-[11px] text-paper/60">
                <div className="flex items-center gap-2">
                  <Volume2 size={13} className="text-amber" />
                  <span>Custom Orbit chime (unlike generic app beeps)</span>
                </div>
                <button
                  type="button"
                  onClick={() => playOrbitChime()}
                  className="font-medium text-amber hover:underline text-[11px] transition"
                >
                  Test Sound 🎵
                </button>
              </div>
            </div>

            {/* Permission Denied Warning */}
            {permissionState === 'denied' && (
              <div className="mb-4 rounded-2xl border border-rust/30 bg-rust/10 p-3.5 text-xs text-rust flex items-start gap-2.5">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Notifications blocked in browser</p>
                  <p className="text-[11px] text-rust/80 mt-0.5">
                    To receive Orbit check-ins, click the padlock or settings icon in your browser address bar and set Notifications to &quot;Allow&quot;.
                  </p>
                </div>
              </div>
            )}

            {/* Success Banner */}
            {success ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-xs font-semibold text-emerald-400">
                <Check size={16} />
                <span>Orbit Notifications Active & Sound Verified!</span>
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
                  <span>{loading ? 'Enabling…' : 'Enable Orbit Notifications'}</span>
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
