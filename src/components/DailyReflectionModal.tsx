'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Moon, Zap, X, Check, Award, AlertTriangle, Target } from 'lucide-react';
import { saveReflection, getReflectionForDay } from '@/api/reflection';

interface Props {
  userId: string;
  date: string;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const ENERGY_LEVELS = [
  { level: 1, label: 'Drained', desc: 'Need rest & recovery' },
  { level: 2, label: 'Low', desc: 'Slow progress' },
  { level: 3, label: 'Balanced', desc: 'Steady focus' },
  { level: 4, label: 'High', desc: 'Strong clarity' },
  { level: 5, label: 'Peak Flow', desc: 'Unstoppable momentum' },
];

export function DailyReflectionModal({ userId, date, open, onClose, onSaved }: Props) {
  const [wins, setWins] = useState('');
  const [blockers, setBlockers] = useState('');
  const [tomorrowFocus, setTomorrowFocus] = useState('');
  const [sleepHours, setSleepHours] = useState<number>(7.5);
  const [energyRating, setEnergyRating] = useState<number>(4);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    setSuccess(false);
    getReflectionForDay(userId, date).then((ref) => {
      if (ref) {
        setWins(ref.wins ?? '');
        setBlockers(ref.blockers ?? '');
        setTomorrowFocus(ref.tomorrow_focus ?? '');
        setSleepHours(ref.sleep_hours ? Number(ref.sleep_hours) : 7.5);
        setEnergyRating(ref.energy_rating ?? 4);
      }
    });
  }, [open, userId, date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    try {
      await saveReflection(userId, {
        day: date,
        wins: wins.trim() || null,
        blockers: blockers.trim() || null,
        tomorrow_focus: tomorrowFocus.trim() || null,
        sleep_hours: sleepHours,
        energy_rating: energyRating,
      });
      setSuccess(true);
      setTimeout(() => {
        onSaved?.();
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to save reflection:', err);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-ink/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-b from-ink-50 to-ink p-6 shadow-2xl"
        >
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber/15 text-amber ring-1 ring-amber/30">
                <Moon size={20} />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-paper">Evening Reflection</h2>
                <p className="text-xs text-paper/50">Debrief your day, clear mental debt & calibrate tomorrow</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-paper/40 transition hover:bg-white/10 hover:text-paper"
            >
              <X size={18} />
            </button>
          </div>

          {success ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sage/20 text-sage ring-2 ring-sage/40">
                <Check size={32} />
              </div>
              <h3 className="font-display text-xl font-medium text-paper">Reflection Logged</h3>
              <p className="mt-1 text-sm text-paper/60">Rest well. Tomorrow's mission is already in orbit.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Question 1: Wins */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-amber">
                  <Award size={14} /> 1. Today's Victory (Win)
                </label>
                <textarea
                  value={wins}
                  onChange={(e) => setWins(e.target.value)}
                  placeholder="e.g., Cracked 6 hard Rotational Motion problems, or implemented DP knapsack cleanly..."
                  rows={2}
                  className="w-full rounded-2xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-paper placeholder-paper/30 transition focus:border-amber/50 focus:outline-none focus:ring-1 focus:ring-amber/50"
                />
              </div>

              {/* Question 2: Blockers */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-rust">
                  <AlertTriangle size={14} /> 2. Friction or Lessons
                </label>
                <textarea
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  placeholder="e.g., Coaching lecture ran 45m late, slipped on unit conversions under time pressure..."
                  rows={2}
                  className="w-full rounded-2xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-paper placeholder-paper/30 transition focus:border-rust/50 focus:outline-none focus:ring-1 focus:ring-rust/50"
                />
              </div>

              {/* Question 3: Tomorrow's Focus */}
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-sage">
                  <Target size={14} /> 3. Tomorrow's #1 Mission
                </label>
                <input
                  type="text"
                  value={tomorrowFocus}
                  onChange={(e) => setTomorrowFocus(e.target.value)}
                  placeholder="e.g., Master Angular Momentum & finish 1 timed NSEP mock..."
                  className="w-full rounded-2xl border border-white/10 bg-ink/60 px-4 py-3 text-sm text-paper placeholder-paper/30 transition focus:border-sage/50 focus:outline-none focus:ring-1 focus:ring-sage/50"
                />
              </div>

              {/* Energy Rating */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-paper/60">
                    <Zap size={14} className="text-amber" /> Energy Level
                  </span>
                  <span className="font-mono text-xs font-semibold text-amber">
                    {ENERGY_LEVELS[energyRating - 1]?.label}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {ENERGY_LEVELS.map(({ level, label }) => {
                    const active = energyRating === level;
                    return (
                      <button
                        type="button"
                        key={level}
                        onClick={() => setEnergyRating(level)}
                        className={`flex flex-col items-center justify-center rounded-xl py-2.5 transition ${
                          active
                            ? 'bg-amber text-ink font-semibold shadow-md'
                            : 'bg-white/5 text-paper/60 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-base font-bold">{level}</span>
                        <span className="text-[10px] leading-tight opacity-80">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sleep Hours Slider */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-medium uppercase tracking-wider text-paper/60">
                    <Moon size={14} className="text-subject-physics" /> Target Sleep Tonight
                  </span>
                  <span className="font-mono text-sm font-semibold text-subject-physics">{sleepHours} hrs</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="10"
                  step="0.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-amber"
                />
                <div className="mt-1 flex justify-between text-[10px] text-paper/30">
                  <span>4 hrs (Exhaustion risk)</span>
                  <span>7.5 hrs (Optimal)</span>
                  <span>10 hrs</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saving}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber to-amber/90 py-3.5 text-sm font-semibold text-ink shadow-lg transition hover:brightness-110 disabled:opacity-50"
              >
                <Sparkles size={16} />
                {saving ? 'Sealing the day…' : 'Complete Reflection & Clear Mind'}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
