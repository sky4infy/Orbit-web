'use client';

import type { ChapterOverview } from '@/api/chapters';

interface Props {
  chapters: ChapterOverview[];
}

export function WeakSpotsPanel({ chapters }: Props) {
  const weak = [...chapters]
    .filter((c) => c.unresolvedMistakes > 0)
    .sort((a, b) => b.unresolvedMistakes - a.unresolvedMistakes)
    .slice(0, 5);

  if (weak.length === 0) {
    return (
      <div className="rounded-xl2 border border-white/5 bg-ink-50 p-4 text-sm text-paper/40">
        No open mistakes logged yet — this panel fills in as you log them.
      </div>
    );
  }

  const maxCount = weak[0].unresolvedMistakes;

  return (
    <div className="rounded-xl2 border border-white/5 bg-ink-50 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-paper/40">Weak spots</h3>
      <div className="flex flex-col gap-2.5">
        {weak.map((c) => (
          <div key={c.id}>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="font-medium text-paper/80">{c.name}</span>
              <span className="font-mono text-paper/40">{c.unresolvedMistakes}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-rust"
                style={{ width: `${(c.unresolvedMistakes / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
