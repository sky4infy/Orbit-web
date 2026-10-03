'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Code2, Users, Send } from 'lucide-react';
import type { TrackType } from '@/types/database.types';

interface Props {
  currentTrack: TrackType;
  onTrackChange: (track: TrackType) => void;
  userDisplayName?: string;
  partnerName?: string;
}

export function TrackSwitcher({ currentTrack, onTrackChange, partnerName = 'Study Partner' }: Props) {
  const [sparkSent, setSparkSent] = useState(false);
  const [showSparkBox, setShowSparkBox] = useState(false);
  const [sparkMsg, setSparkMsg] = useState('');

  const isOlympiadTrack = currentTrack === 'jee_nsep';

  const partnerStatus = isOlympiadTrack
    ? 'Algorithms & System Design deep work finished 30m ago'
    : 'Rotational Dynamics problem set finished 25m ago';

  function handleSendSpark() {
    if (!sparkMsg.trim()) return;
    setSparkSent(true);
    setTimeout(() => {
      setSparkSent(false);
      setShowSparkBox(false);
      setSparkMsg('');
    }, 1500);
  }

  return (
    <div className="mb-6 flex flex-col gap-2.5">
      {/* Track Selector Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-ink-50/70 p-1.5 backdrop-blur-md">
        <button
          onClick={() => onTrackChange('jee_nsep')}
          className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
            currentTrack === 'jee_nsep'
              ? 'bg-amber text-ink shadow-md shadow-amber/20'
              : 'text-paper/60 hover:text-paper hover:bg-white/5'
          }`}
        >
          <Sparkles size={14} className={currentTrack === 'jee_nsep' ? 'text-ink' : 'text-amber'} />
          <span>JEE & Olympiad</span>
          <span className="rounded-md bg-black/15 px-1.5 py-0.5 text-[9px] font-mono">STEM</span>
        </button>

        <button
          onClick={() => onTrackChange('college_cs_aiml')}
          className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
            currentTrack === 'college_cs_aiml'
              ? 'bg-subject-physics text-ink shadow-md shadow-subject-physics/20'
              : 'text-paper/60 hover:text-paper hover:bg-white/5'
          }`}
        >
          <Code2 size={14} className={currentTrack === 'college_cs_aiml' ? 'text-ink' : 'text-subject-physics'} />
          <span>Computer Science & AI</span>
          <span className="rounded-md bg-black/15 px-1.5 py-0.5 text-[9px] font-mono">Tech</span>
        </button>
      </div>

      {/* Orbit Study Partner Presence Card */}
      <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-gradient-to-r from-white/[0.03] to-white/[0.01] px-3.5 py-2">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-amber/10 text-amber ring-1 ring-amber/20">
            <Users size={13} />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-paper/80">{partnerName}</span>
              <span className="rounded bg-amber/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber">
                5d streak 🔥
              </span>
            </div>
            <p className="truncate text-[10px] text-paper/40">{partnerStatus}</p>
          </div>
        </div>

        <button
          onClick={() => setShowSparkBox((prev) => !prev)}
          className="ml-2 flex-shrink-0 rounded-xl bg-white/5 px-2.5 py-1 text-[11px] font-medium text-amber hover:bg-amber/10 transition"
        >
          Spark ✨
        </button>
      </div>

      {/* Partner Encouragement Dropdown */}
      <AnimatePresence>
        {showSparkBox && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-2xl border border-white/10 bg-ink-50 p-3 shadow-lg"
          >
            {sparkSent ? (
              <p className="py-1 text-center text-xs font-medium text-sage">
                ✨ Focus spark sent to partner's orbit!
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={sparkMsg}
                  onChange={(e) => setSparkMsg(e.target.value)}
                  placeholder="Send quick focus encouragement or study tip…"
                  className="flex-1 rounded-xl border border-white/10 bg-ink/80 px-3 py-1.5 text-xs text-paper placeholder-paper/30 focus:border-amber/50 focus:outline-none"
                />
                <button
                  onClick={handleSendSpark}
                  className="flex items-center gap-1 rounded-xl bg-amber px-3 py-1.5 text-xs font-semibold text-ink hover:brightness-110"
                >
                  <Send size={12} />
                  Send
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
