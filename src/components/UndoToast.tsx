'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ToastState {
  id: string;
  message: string;
  onUndo?: () => void;
}

interface Props {
  toast: ToastState | null;
  onDismiss: () => void;
  durationMs?: number;
}

export function UndoToast({ toast, onDismiss, durationMs = 4000 }: Props) {
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(id);
  }, [toast, onDismiss, durationMs]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-xl2 border border-white/10 bg-ink-100 px-4 py-3 shadow-xl"
        >
          <span className="text-sm text-paper/80">{toast.message}</span>
          {toast.onUndo && (
            <button
              onClick={() => {
                toast.onUndo?.();
                onDismiss();
              }}
              className="text-sm font-semibold text-amber"
            >
              Undo
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
