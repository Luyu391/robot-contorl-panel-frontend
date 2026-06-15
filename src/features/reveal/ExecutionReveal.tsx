import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Clock, Crosshair } from 'lucide-react';
import useReducedMotion from '../../hooks/useReducedMotion';

interface ExecutionRevealProps {
  rawText: string;
  success: boolean;
  summary: string;
  duration: number;
  joints?: Record<string, number>;
  onComplete?: () => void;
  autoCompleteMs?: number;
}

export function ExecutionReveal({
  rawText,
  success,
  summary,
  duration,
  joints,
  onComplete,
  autoCompleteMs = 2500,
}: ExecutionRevealProps) {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState<0 | 1 | 2>(reduced ? 2 : 0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (reduced) {
      const t = window.setTimeout(() => onComplete?.(), 200);
      return () => window.clearTimeout(t);
    }
    const t1 = window.setTimeout(() => setStage(1), 380);
    const t2 = window.setTimeout(() => setStage(2), 950);
    const t3 = window.setTimeout(() => onComplete?.(), autoCompleteMs);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [reduced, onComplete, autoCompleteMs]);

  useEffect(() => {
    previouslyFocusedRef.current = (document.activeElement as HTMLElement) ?? null;
    skipRef.current?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onComplete?.();
      }
    };

    document.addEventListener('keydown', handleKey);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('keydown', handleEscape);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [onComplete]);

  const iconColor = success ? 'text-emerald-600' : 'text-rose-600';
  const bgColor = success ? 'bg-emerald-50/50' : 'bg-rose-50/50';

  return (
    <div
      ref={dialogRef}
      data-testid="execution-reveal"
      role="dialog"
      aria-modal="true"
      aria-label={success ? '指令执行成功' : '指令执行失败'}
      aria-live="assertive"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
    >
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduced ? 0 : 0.3 }}
        className="absolute inset-0 glass"
      />

      <button
        ref={skipRef}
        type="button"
        data-testid="execution-reveal-skip"
        onClick={() => onComplete?.()}
        className="glass-btn absolute right-5 top-5 z-10 px-4 py-2 text-sm font-medium text-slate-500"
        aria-label="关闭揭晓动画"
      >
        关闭
      </button>

      <div className="relative z-10 flex flex-col items-center gap-5 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.4 }}
          className="text-xs tracking-[0.4em] text-slate-400"
        >
          OpenCLaw · 指令执行
        </motion.p>

        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: stage >= 1 ? 1 : 0, opacity: stage >= 1 ? 1 : 0 }}
          transition={{
            duration: reduced ? 0 : 0.5,
            type: reduced ? 'tween' : 'spring',
            stiffness: 200,
          }}
          className={`relative flex h-24 w-24 items-center justify-center rounded-full ${bgColor} border border-white/30`}
        >
          {success ? (
            <CheckCircle2 className={`h-12 w-12 ${iconColor}`} />
          ) : (
            <XCircle className={`h-12 w-12 ${iconColor}`} />
          )}
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: stage >= 2 ? 1 : 0, y: stage >= 2 ? 0 : 16 }}
          transition={{ duration: reduced ? 0 : 0.45 }}
          className="text-2xl font-semibold text-slate-800"
        >
          {success ? '指令执行成功' : '指令执行失败'}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: stage >= 2 ? 1 : 0 }}
          transition={{ delay: reduced ? 0 : 0.1, duration: reduced ? 0 : 0.4 }}
          className="max-w-sm text-sm leading-6 text-slate-600"
          data-testid="execution-reveal-summary"
        >
          {summary}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: stage >= 2 ? 1 : 0 }}
          transition={{ delay: reduced ? 0 : 0.15, duration: reduced ? 0 : 0.4 }}
          className="flex items-center gap-4 text-xs text-slate-400"
        >
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {(duration / 1000).toFixed(1)}s
          </span>
          <span className="flex items-center gap-1">
            <Crosshair className="h-3.5 w-3.5" />
            {rawText.slice(0, 20)}...
          </span>
        </motion.div>

        {joints && stage >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: stage >= 2 ? 1 : 0, y: stage >= 2 ? 0 : 8 }}
            transition={{ delay: reduced ? 0 : 0.25 }}
            className="grid grid-cols-3 gap-3 text-xs"
          >
            {Object.entries(joints).map(([joint, angle]) => (
              <div key={joint} className="rounded-lg border border-white/30 glass px-3 py-2 text-center">
                <p className="text-slate-400">{joint.toUpperCase()}</p>
                <p className="mt-0.5 font-mono font-medium text-slate-700">{angle.toFixed(1)}°</p>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default ExecutionReveal;