import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, X } from 'lucide-react';
import { useRef, useEffect } from 'react';
import useReducedMotion from '../hooks/useReducedMotion';

interface SafetyGuardProps {
  open: boolean;
  title?: string;
  message: string;
  warnings?: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function SafetyGuard({ open, title = '安全确认', message, warnings = [], onConfirm, onCancel }: SafetyGuardProps) {
  const reduced = useReducedMotion();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previouslyFocusedRef.current = (document.activeElement as HTMLElement) ?? null;
      confirmRef.current?.focus();
    } else {
      previouslyFocusedRef.current?.focus?.();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="absolute inset-0 bg-slate-900/40"
            onClick={onCancel}
          />
          <motion.div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: reduced ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-md rounded-card border border-white/30 glass p-6 shadow-lg"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50/50">
                <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{message}</p>
                {warnings.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {warnings.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-amber-600">
                        <span className="mt-0.5 shrink-0">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="glass-btn inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-500"
              >
                <X className="h-4 w-4" />
                取消
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={onConfirm}
                className="glass-btn glass-btn-indigo inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-indigo-600"
              >
                <Check className="h-4 w-4" />
                确认执行
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default SafetyGuard;