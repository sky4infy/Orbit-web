'use client';

import { motion } from 'framer-motion';

const PARTICLES = Array.from({ length: 6 }, (_, i) => i);

/** A handful of small dots that drift outward and fade — meant to read as
 * "settling," not "celebrating." Renders once and unmounts itself. */
export function CompletionBurst() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {PARTICLES.map((i) => {
        const angle = (i / PARTICLES.length) * 2 * Math.PI;
        const distance = 18;
        return (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-sage"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              opacity: 0,
              scale: 0.5,
            }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}
