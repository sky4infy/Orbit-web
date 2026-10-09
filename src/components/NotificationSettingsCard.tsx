'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  Volume2,
  Check,
  AlertCircle,
  Clock,
  Sun,
  Moon,
  Sparkles,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { playOrbitChime } from '@/lib/orbitSound';
import {
  isNotificationSupported,
  getNotificationPermission,
  areOrbitNotificationsEnabled,
  setOrbitNotificationsEnabled,
  requestNotificationPermission,
  sendTestOrbitNotification,
  dispatchOrbitNotification,
  getOrbitNotificationStatus,
  type NotificationStatus,
} from '@/lib/notificationService';

interface Props {
  userId?: string;
}

export function NotificationSettingsCard({ userId }: Props) {
  const [status, setStatus] = useState<NotificationStatus>({
    supported: false,
    permission: 'default',
    enabled: false,
    todayPlanned: false,
    todayReflected: false,
    taskCountToday: 0,
  });
  const [playingAudio, setPlayingAudio] = useState(false);
  const [testingNotification, setTestingNotification] = useState(false);
  const [testSent, setTestSent] = useState(false);

  async function refreshStatus() {
    const s = await getOrbitNotificationStatus(userId);
    setStatus(s);
  }

  useEffect(() => {
    refreshStatus();
  }, [userId]);

  async function handlePlaySound() {
    try {
      setPlayingAudio(true);
      await playOrbitChime();
    } finally {
      setTimeout(() => setPlayingAudio(false), 1200);
    }
  }

  async function handleToggleEnable() {
    if (!status.supported) return;

    if (status.permission !== 'granted') {
      const granted = await requestNotificationPermission();
      if (granted) {
        setOrbitNotificationsEnabled(true);
      }
    } else {
      const next = !status.enabled;
      setOrbitNotificationsEnabled(next);
    }
    await refreshStatus();
  }

  async function handleTestNotification() {
    if (status.permission !== 'granted') {
      const granted = await requestNotificationPermission();
      if (!granted) return;
    }
    setTestingNotification(true);
    try {
      await sendTestOrbitNotification();
      setTestSent(true);
      setTimeout(() => setTestSent(false), 4000);
    } finally {
      setTestingNotification(false);
      await refreshStatus();
    }
  }

  async function handleSimulateMorning() {
    if (status.permission !== 'granted') {
      const granted = await requestNotificationPermission();
      if (!granted) return;
    }
    await dispatchOrbitNotification('Orbit · Morning Orbit Check (7:30 AM)', {
      body: "Your day isn't planned yet. Set your focus for today and stay in orbit.",
      tag: 'orbit-730-sim-' + Date.now(),
      url: '/planner',
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 4000);
  }

  async function handleSimulateNight() {
    if (status.permission !== 'granted') {
      const granted = await requestNotificationPermission();
      if (!granted) return;
    }
    await dispatchOrbitNotification('Orbit · Evening Debrief (10:00 PM)', {
      body: 'Time to close your loop. Log your wins, blockers, and energy rating for today.',
      tag: 'orbit-2200-sim-' + Date.now(),
      url: '/journey',
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 4000);
  }

  return (
    <section className="mb-6 rounded-3xl border border-amber/20 bg-amber/[0.03] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber/20 text-amber">
            <Bell size={15} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-paper">Orbit Notifications & Daily Rhythm</h2>
            <p className="text-[11px] text-amber/80 font-medium">
              Signature Cosmic Chime • 3 Intelligent Daily Checkpoints
            </p>
          </div>
        </div>

        {/* Status Badge */}
        {status.enabled && status.permission === 'granted' ? (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-paper/40">
            Inactive
          </span>
        )}
      </div>

      <p className="text-xs text-paper/60 leading-relaxed mt-2 mb-4">
        Orbit protects your focus with a distinctive acoustic signature. You are never spammed: morning alerts only fire if your day hasn&apos;t been planned yet, and night alerts prompt you to reflect and lock in your recovery.
      </p>

      {/* Main Controls Row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Permission / Toggle Button */}
        <button
          onClick={handleToggleEnable}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition active:scale-95 ${
            status.enabled && status.permission === 'granted'
              ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
              : 'border border-amber/30 bg-amber/20 text-amber hover:bg-amber/30'
          }`}
        >
          <Bell size={14} />
          <span>
            {status.permission !== 'granted'
              ? 'Enable Orbit Notifications'
              : status.enabled
              ? 'Notifications Enabled'
              : 'Turn On Reminders'}
          </span>
        </button>

        {/* Test Orbit Sound */}
        <button
          onClick={handlePlaySound}
          disabled={playingAudio}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-paper/80 hover:bg-white/10 hover:text-paper transition active:scale-95"
          title="Preview Orbit's signature chime"
        >
          <Volume2 size={14} className={playingAudio ? 'text-amber animate-pulse' : 'text-paper/60'} />
          <span>{playingAudio ? 'Playing Chime…' : 'Test Sound'}</span>
        </button>

        {/* Send Test Notification */}
        <button
          onClick={handleTestNotification}
          disabled={testingNotification}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-paper/80 hover:bg-white/10 hover:text-paper transition active:scale-95"
          title="Send an immediate test alert to your device"
        >
          <Send size={13} className="text-paper/50" />
          <span>Test Notification</span>
        </button>

        {/* Simulate 7:30 AM Check */}
        <button
          onClick={handleSimulateMorning}
          className="flex items-center gap-1.5 rounded-xl border border-amber/25 bg-amber/10 px-2.5 py-2 text-xs font-semibold text-amber hover:bg-amber/20 transition active:scale-95"
          title="Simulate 7:30 AM alert"
        >
          <Sun size={13} />
          <span>Simulate 7:30 AM</span>
        </button>

        {/* Simulate 10:00 PM Check */}
        <button
          onClick={handleSimulateNight}
          className="flex items-center gap-1.5 rounded-xl border border-subject-physics/30 bg-subject-physics/10 px-2.5 py-2 text-xs font-semibold text-subject-physics hover:bg-subject-physics/20 transition active:scale-95"
          title="Simulate 10:00 PM alert"
        >
          <Moon size={13} />
          <span>Simulate 10:00 PM</span>
        </button>
      </div>

      {testSent && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          <Check size={14} />
          <span>Test notification and chime dispatched! Check your desktop/phone banner.</span>
        </div>
      )}

      {status.permission === 'denied' && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-rust/30 bg-rust/10 p-3 text-xs text-rust">
          <AlertCircle size={15} className="shrink-0" />
          <span>
            Notifications are blocked in your browser settings. Please click the padlock or site settings icon in your address bar to allow notifications for Orbit.
          </span>
        </div>
      )}

      {/* The 3 Scheduled Checkpoints */}
      <div className="space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-paper/40 mb-1">
          Automated Daily Checkpoint Schedule
        </p>

        {/* Checkpoint 1: 7:30 AM */}
        <div className="rounded-2xl border border-white/5 bg-ink/40 p-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber/15 text-amber shrink-0 mt-0.5">
              <Sun size={13} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber">07:30 AM</span>
                <span className="text-xs font-semibold text-paper">Morning Orbit Check</span>
              </div>
              <p className="text-[11px] text-paper/50 mt-0.5">
                Notifies only if 0 tasks or missions are scheduled for today.
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-mono ${
              status.todayPlanned
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-amber/30 bg-amber/10 text-amber'
            }`}
          >
            {status.todayPlanned ? `Planned (${status.taskCountToday}) • Muted` : 'Armed'}
          </span>
        </div>

        {/* Checkpoint 2: 9:00 AM */}
        <div className="rounded-2xl border border-white/5 bg-ink/40 p-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber/15 text-amber shrink-0 mt-0.5">
              <Clock size={13} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber">09:00 AM</span>
                <span className="text-xs font-semibold text-paper">Final Morning Call</span>
              </div>
              <p className="text-[11px] text-paper/50 mt-0.5">
                Follow-up if day is still unbudgeted. Auto-muted if planned before 9:00 AM.
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-mono ${
              status.todayPlanned
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-amber/30 bg-amber/10 text-amber'
            }`}
          >
            {status.todayPlanned ? 'Auto-Muted' : 'Armed'}
          </span>
        </div>

        {/* Checkpoint 3: 10:00 PM */}
        <div className="rounded-2xl border border-white/5 bg-ink/40 p-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-subject-physics/20 text-subject-physics shrink-0 mt-0.5">
              <Moon size={13} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-subject-physics">10:00 PM</span>
                <span className="text-xs font-semibold text-paper">Evening Debrief & Reflection</span>
              </div>
              <p className="text-[11px] text-paper/50 mt-0.5">
                Prompts registered user to reflect on wins, blockers, and biological energy. Auto-muted once logged.
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-mono ${
              status.todayReflected
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-subject-physics/30 bg-subject-physics/10 text-subject-physics'
            }`}
          >
            {status.todayReflected ? 'Debrief Done • Muted' : 'Armed'}
          </span>
        </div>
      </div>

      {/* Signature Sound Details */}
      <div className="mt-4 rounded-2xl border border-white/5 bg-ink/30 p-3 flex items-center justify-between text-[11px] text-paper/60">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-amber" />
          <span>Acoustic Profile: <strong>Orbit Celestial Chime (D5 / A5 harmonic overtone)</strong></span>
        </div>
        <span className="font-mono text-[10px] text-paper/40">Zero Spam Rule</span>
      </div>
    </section>
  );
}
