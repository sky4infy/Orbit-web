'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import type { ChapterOverview } from '@/api/chapters';

interface Props {
  chapters: ChapterOverview[];
}

// Distinct base hues for predefined standard subjects
const SUBJECT_COLORS: Record<string, string> = {
  Physics: '#6C93E0',
  Chemistry: '#4FB894',
  Maths: '#E0AE4F',
  Mathematics: '#E0AE4F',
  Biology: '#D983A6',
  'Data Structures & Algorithms': '#38BDF8',
  'AI & Machine Learning': '#A855F7',
  'Web Dev & Systems': '#10B981',
  'Web Development & Systems': '#10B981',
  'Core Computer Science': '#F97316',
};

// Vibrant curated celestial palette for custom college subjects
const DYNAMIC_PALETTE = [
  '#EC4899', // Pink / Rose
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
  '#14B8A6', // Teal
  '#E11D48', // Crimson
  '#3B82F6', // Blue
  '#D946EF', // Fuchsia
];

function colorForSubject(name: string): string {
  if (SUBJECT_COLORS[name]) return SUBJECT_COLORS[name];
  // Deterministic color hash based on subject name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % DYNAMIC_PALETTE.length;
  return DYNAMIC_PALETTE[idx];
}

/**
 * Chapters closer to the center = lower confidence (need attention).
 * Chapters further out = higher confidence (mastered, drifting stable).
 * Dot size scales with unresolved mistake count — a visibly bigger dot
 * near the center is exactly the "weak spot" a student should look at.
 */
export function OrbitMasteryMap({ chapters }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const size = 340;
  const center = size / 2;
  const minRadius = 38;
  const maxRadius = center - 26;

  const subjects = useMemo(() => Array.from(new Set(chapters.map((c) => c.subjectName))), [chapters]);

  const positioned = useMemo(() => {
    const bySubject: Record<string, ChapterOverview[]> = {};
    for (const c of chapters) {
      bySubject[c.subjectName] ??= [];
      bySubject[c.subjectName].push(c);
    }
    const out: (ChapterOverview & { x: number; y: number; r: number })[] = [];
    const numSubjects = Math.max(1, subjects.length);
    const sectorAngle = (2 * Math.PI) / numSubjects;

    subjects.forEach((subject, subjectIdx) => {
      const list = bySubject[subject] || [];
      const baseAngle = subjectIdx * sectorAngle - Math.PI / 2; // start from top

      list.forEach((c, i) => {
        // True Confidence-to-Radius Mapping:
        // 0% confidence -> minRadius (38px, directly near center core)
        // 100% confidence -> maxRadius (144px, outer Mastered ring)
        const conf = Math.max(0, Math.min(100, c.confidence));
        const r = minRadius + (conf / 100) * (maxRadius - minRadius);

        // Angular spread within the subject's sector to prevent exact overlaps
        const spread =
          list.length > 1
            ? ((i / (list.length - 1)) - 0.5) * (sectorAngle * 0.72)
            : 0;
        const angle = baseAngle + spread;

        out.push({
          ...c,
          x: center + r * Math.cos(angle),
          y: center + r * Math.sin(angle),
          r,
        });
      });
    });
    return out;
  }, [chapters, subjects, maxRadius, minRadius, center]);

  const activeChapter = useMemo(
    () => positioned.find((p) => p.id === selectedId) ?? null,
    [positioned, selectedId]
  );

  if (chapters.length === 0) {
    return (
      <div className="flex h-[340px] items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-paper/40">
        Seed subjects and chapters to see your orbit take shape.
      </div>
    );
  }

  return (
    <div className="relative select-none" onClick={() => setSelectedId(null)}>
      {/* SVG Orbital Canvas */}
      <svg width={size} height={size} className="mx-auto overflow-visible">
        {/* Concentric Mastery Orbit Rings (25%, 50%, 75%, 100% Mastered) */}
        {[0.25, 0.5, 0.75, 1.0].map((tier) => {
          const r = minRadius + tier * (maxRadius - minRadius);
          const isMastery = tier === 1.0;
          return (
            <g key={tier}>
              <circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke={isMastery ? 'rgba(52, 211, 153, 0.35)' : 'rgba(255, 255, 255, 0.08)'}
                strokeWidth={isMastery ? 1.5 : 1}
                strokeDasharray={isMastery ? undefined : '3 3'}
              />
              {isMastery && (
                <text
                  x={center}
                  y={center - r - 4}
                  textAnchor="middle"
                  className="fill-emerald-400/70 font-mono text-[8px] uppercase tracking-wider font-semibold"
                >
                  Mastered (100%)
                </text>
              )}
            </g>
          );
        })}

        {/* Center core — "You" */}
        <circle cx={center} cy={center} r={6} fill="currentColor" className="fill-paper" />
        <circle
          cx={center}
          cy={center}
          r={11}
          fill="none"
          stroke="currentColor"
          className="text-paper/40"
          strokeWidth={1}
        />

        {/* Chapter Celestial Nodes */}
        {positioned.map((c) => {
          const dotSize = 5 + Math.min(c.unresolvedMistakes, 6) * 1.6;
          const color = colorForSubject(c.subjectName);
          const isSelected = selectedId === c.id;

          return (
            <g
              key={c.id}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId((prev) => (prev === c.id ? null : c.id));
              }}
            >
              {/* Invisible expanded hit target for touch devices */}
              <circle cx={c.x} cy={c.y} r={dotSize + 10} fill="transparent" />

              {/* Pulsing ring if selected */}
              {isSelected && (
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={dotSize + 5}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  className="animate-pulse"
                />
              )}

              {/* Core Chapter Dot */}
              <motion.circle
                cx={c.x}
                cy={c.y}
                r={dotSize}
                fill={color}
                fillOpacity={c.unresolvedMistakes > 0 ? 0.95 : 0.75}
                stroke={isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.2)'}
                strokeWidth={isSelected ? 2 : 0.8}
                initial={{ scale: 0 }}
                animate={{ scale: isSelected ? 1.25 : 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                onMouseEnter={() => setSelectedId(c.id)}
              />
            </g>
          );
        })}
      </svg>

      {/* Floating Interactive Chapter Inspection Card */}
      <AnimatePresence>
        {activeChapter && (
          <div className="absolute inset-x-0 top-3 z-20 flex justify-center px-3 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto w-full max-w-[320px] rounded-2xl border border-white/15 bg-ink-100/95 p-3.5 shadow-2xl backdrop-blur-md"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="h-2 w-2 rounded-full shrink-0 shadow-sm"
                    style={{ background: colorForSubject(activeChapter.subjectName) }}
                  />
                  <span className="font-mono text-[10px] text-paper/60 uppercase tracking-wider truncate">
                    {activeChapter.subjectName}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  className="text-paper/40 hover:text-paper rounded-md p-1 transition"
                  aria-label="Close details"
                >
                  <X size={14} />
                </button>
              </div>

              <p className="font-display text-sm font-semibold text-paper leading-snug line-clamp-2">
                {activeChapter.name}
              </p>

              <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-amber">
                    {activeChapter.confidence}% confidence
                  </span>
                  <span className="text-white/20">•</span>
                  <span className={activeChapter.unresolvedMistakes > 0 ? 'text-rust font-medium' : 'text-emerald-400'}>
                    {activeChapter.unresolvedMistakes > 0
                      ? `${activeChapter.unresolvedMistakes} mistake${activeChapter.unresolvedMistakes > 1 ? 's' : ''}`
                      : 'Clean'}
                  </span>
                </div>

                <Link
                  href={`/journey/${activeChapter.id}`}
                  className="flex items-center gap-1 rounded-lg bg-amber px-2.5 py-1 font-semibold text-ink shadow-sm hover:brightness-105 active:scale-95 transition text-[11px]"
                >
                  <span>Open</span>
                  <ArrowRight size={11} />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Colored Subject Legend */}
      <div className="mt-3 flex flex-wrap justify-center gap-2 px-1">
        {subjects.map((s) => {
          const color = colorForSubject(s);
          return (
            <span
              key={s}
              className="flex items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-2.5 py-1 text-[11px] text-paper/70 font-medium transition hover:border-white/10"
            >
              <span className="h-2 w-2 rounded-full shrink-0 shadow-sm" style={{ background: color }} />
              <span className="whitespace-nowrap">{s}</span>
            </span>
          );
        })}
      </div>

      <p className="mt-2 text-center text-[10px] text-paper/40">
        Closer to center = lower confidence · bigger dot = open mistakes · tap any dot to inspect
      </p>
    </div>
  );
}
