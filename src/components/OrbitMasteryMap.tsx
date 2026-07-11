'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { ChapterOverview } from '@/api/chapters';

interface Props {
  chapters: ChapterOverview[];
}

// Distinct hue per subject ring, warm-to-cool so Physics/Chem/Maths/Bio
// read as different "orbits" at a glance, not just a color legend.
const SUBJECT_COLORS: Record<string, string> = {
  Physics: '#6C93E0',
  Chemistry: '#4FB894',
  Maths: '#E0AE4F',
  Mathematics: '#E0AE4F',
  Biology: '#D983A6',
};

function colorForSubject(name: string): string {
  return SUBJECT_COLORS[name] ?? '#B8B5A8';
}

/**
 * Chapters closer to the center = lower confidence (need attention).
 * Chapters further out = higher confidence (mastered, drifting stable).
 * Dot size scales with unresolved mistake count — a visibly bigger dot
 * near the center is exactly the "weak spot" a student should look at.
 */
export function OrbitMasteryMap({ chapters }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const size = 340;
  const center = size / 2;
  const maxRadius = center - 28;

  const subjects = useMemo(() => Array.from(new Set(chapters.map((c) => c.subjectName))), [chapters]);

  const positioned = useMemo(() => {
    // spread chapters evenly around their subject's ring by index
    const bySubject: Record<string, ChapterOverview[]> = {};
    for (const c of chapters) {
      bySubject[c.subjectName] ??= [];
      bySubject[c.subjectName].push(c);
    }
    const out: (ChapterOverview & { x: number; y: number; r: number })[] = [];
    Object.entries(bySubject).forEach(([subject, list], subjectIdx) => {
      const ringRadius = 55 + subjectIdx * ((maxRadius - 55) / Math.max(1, subjects.length - 1 || 1));
      list.forEach((c, i) => {
        // lower confidence pulls the dot slightly inward from its subject ring
        const inwardPull = ((100 - c.confidence) / 100) * 30;
        const r = Math.max(30, ringRadius - inwardPull);
        const angle = (i / list.length) * 2 * Math.PI + subjectIdx * 0.4;
        out.push({
          ...c,
          x: center + r * Math.cos(angle),
          y: center + r * Math.sin(angle),
          r,
        });
      });
    });
    return out;
  }, [chapters, subjects.length, maxRadius, center]);

  if (chapters.length === 0) {
    return (
      <div className="flex h-[340px] items-center justify-center rounded-xl2 border border-dashed border-white/10 text-sm text-paper/40">
        Seed subjects and chapters to see your orbit take shape.
      </div>
    );
  }

  return (
    <div className="relative">
      <svg width={size} height={size} className="mx-auto overflow-visible">
        {/* orbit rings, one per subject */}
        {subjects.map((subject, idx) => {
          const ringRadius = 55 + idx * ((maxRadius - 55) / Math.max(1, subjects.length - 1 || 1));
          return (
            <circle
              key={subject}
              cx={center}
              cy={center}
              r={ringRadius}
              fill="none"
              stroke={colorForSubject(subject)}
              strokeOpacity={0.15}
              strokeWidth={1}
            />
          );
        })}

        {/* center — "you" */}
        <circle cx={center} cy={center} r={6} fill="#F6F3EC" />
        <circle cx={center} cy={center} r={10} fill="none" stroke="#F6F3EC" strokeOpacity={0.3} />

        {positioned.map((c) => {
          const dotSize = 5 + Math.min(c.unresolvedMistakes, 6) * 1.6;
          const color = colorForSubject(c.subjectName);
          const isHovered = hovered === c.id;
          return (
            <g key={c.id}>
              <motion.circle
                cx={c.x}
                cy={c.y}
                r={dotSize}
                fill={color}
                fillOpacity={c.unresolvedMistakes > 0 ? 0.95 : 0.6}
                stroke={isHovered ? '#F6F3EC' : 'none'}
                strokeWidth={1.5}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                onMouseEnter={() => setHovered(c.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer' }}
              />
            </g>
          );
        })}
      </svg>

      {hovered && (
        <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-lg border border-white/10 bg-ink-100 px-3 py-2 text-xs shadow-xl">
          {(() => {
            const c = positioned.find((p) => p.id === hovered)!;
            return (
              <>
                <p className="font-semibold">{c.name}</p>
                <p className="text-paper/50">
                  {c.subjectName} · confidence {c.confidence}%
                  {c.unresolvedMistakes > 0 && ` · ${c.unresolvedMistakes} open mistakes`}
                </p>
              </>
            );
          })()}
        </div>
      )}

      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {subjects.map((s) => (
          <span key={s} className="flex items-center gap-1.5 text-[11px] text-paper/50">
            <span className="h-2 w-2 rounded-full" style={{ background: colorForSubject(s) }} />
            {s}
          </span>
        ))}
      </div>
      <p className="mt-1 text-center text-[11px] text-paper/30">
        Closer to center = lower confidence · bigger dot = more open mistakes
      </p>
    </div>
  );
}
