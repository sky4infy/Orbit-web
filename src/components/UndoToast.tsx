'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, X } from 'lucide-react';

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

export function UndoToast({ toast, onDismiss, durationMs = 6000 }: Props) {
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
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/15 bg-ink-100/95 px-4 py-3 shadow-2xl backdrop-blur-xl"
        >
          <span className="text-sm font-medium text-paper/90">{toast.message}</span>
          {toast.onUndo && (
            <button
              onClick={() => {
                toast.onUndo?.();
                onDismiss();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-amber/40 bg-amber/20 px-3 py-1 text-xs font-bold text-amber hover:bg-amber/30 transition active:scale-95 shadow-sm"
            >
              <RotateCcw size={12} />
              <span>Undo</span>
            </button>
          )}
          <button
            onClick={onDismiss}
            className="text-paper/40 hover:text-paper/80 p-0.5 rounded-md transition"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
