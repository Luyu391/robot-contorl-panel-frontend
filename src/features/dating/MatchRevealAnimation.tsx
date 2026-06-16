import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, SkipForward } from 'lucide-react';
import useReducedMotion from '../../hooks/useReducedMotion';
import type { MatchRevealPayload } from '../../types';

interface MatchRevealAnimationProps {
  payload: MatchRevealPayload;
  onComplete?: (skipped: boolean) => void;
  autoCompleteMs?: number;
}

const EASE: [number, number, number, number] = [0.22, 0, 0, 1];

/* ── 分数计数动画组件 ── */
function ScoreCounter({ target, active, reduced }: { target: number; active: boolean; reduced: boolean }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active || reduced) { if (active) setValue(target); return; }
    const duration = 400;
    const start = performance.now();
    let raf: number;
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.round(progress * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, target, reduced]);
  return <>{value}</>;
}

/* ── 动画内容组件 ── */
function RevealContent({ payload, stage, reduced }: { payload: MatchRevealPayload; stage: number; reduced: boolean }) {
  return (
    <div className="relative z-10 flex flex-col items-center gap-5 text-center">
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.2, ease: EASE }}
        className="text-xs tracking-[0.4em] text-white/40"
      >OpenCLaw · 方案确认</motion.p>

      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: stage >= 1 ? 1 : 0, opacity: stage >= 1 ? 1 : 0 }}
        transition={{ duration: reduced ? 0 : 0.3, ease: EASE }}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600"
      ><Check className="h-10 w-10 text-white" strokeWidth={3} /></motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: stage >= 2 ? 1 : 0, y: stage >= 2 ? 0 : 16 }}
        transition={{ duration: reduced ? 0 : 0.25, ease: EASE }}
        className="text-2xl font-bold text-white/90"
      >{payload.selfName} & {payload.partnerName}</motion.h2>

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: stage >= 2 ? 1 : 0, scale: stage >= 2 ? 1 : 0.85 }}
        transition={{ delay: reduced ? 0 : 0.08, duration: reduced ? 0 : 0.25, ease: EASE }}
        className="flex items-center gap-2"
      >
        <span className="rounded-full bg-indigo-50/60 px-4 py-1.5 text-sm font-semibold text-indigo-300">
          适配指数{' '}
          <span className="text-lg font-bold text-white/90">
            <ScoreCounter target={payload.score} active={stage >= 2} reduced={reduced} />
          </span>
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: stage >= 2 ? 1 : 0 }}
        transition={{ delay: reduced ? 0 : 0.12, duration: reduced ? 0 : 0.2, ease: EASE }}
        className="max-w-sm space-y-2"
      >
        {payload.highlights.map((h, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, x: -16 }}
            animate={stage >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
            transition={{ delay: reduced ? 0 : 0.15 + i * 0.08, duration: reduced ? 0 : 0.25, ease: EASE }}
            className="relative flex items-center gap-3 rounded-lg bg-indigo-50/50 px-4 py-2 text-sm text-white/80"
          >
            <span aria-hidden="true" className="absolute left-0 top-1/2 h-3/4 w-[3px] -translate-y-1/2 rounded-full bg-indigo-400" />
            <span>{h}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export function MatchRevealAnimation({ payload, onComplete, autoCompleteMs = 1400 }: MatchRevealAnimationProps) {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState<0 | 1 | 2>(reduced ? 2 : 0);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const finish = useCallback((skipped: boolean) => {
    if (completedRef.current) return;
    completedRef.current = true;
    setStage(2);
    onCompleteRef.current?.(skipped);
  }, []);

  /* 新 payload → 重置 */
  useEffect(() => {
    completedRef.current = false;
    setStage(reduced ? 2 : 0);
  }, [payload.matchId, reduced]);

  /* 阶段推进 — 大幅提速 */
  useEffect(() => {
    if (reduced) { const t = setTimeout(() => finish(false), 50); return () => clearTimeout(t); }
    const t1 = setTimeout(() => { if (!completedRef.current) setStage(1); }, 120);
    const t2 = setTimeout(() => { if (!completedRef.current) setStage(2); }, 400);
    const t3 = setTimeout(() => finish(false), autoCompleteMs);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [reduced, autoCompleteMs, finish]);

  const handleSkip = useCallback(() => finish(true), [finish]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={payload.matchId}
        data-testid="match-reveal"
        role="dialog" aria-modal="true"
        aria-label={`方案${payload.partnerName}已确认`} aria-live="assertive"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.15, ease: EASE }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden glass"
      >
        <button type="button" data-testid="match-reveal-skip" onClick={handleSkip}
          aria-label="跳过方案确认动画"
          className="glass-btn absolute right-5 top-5 z-20 flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white/50">
          <SkipForward className="h-4 w-4" />跳过
        </button>

        <RevealContent payload={payload} stage={stage} reduced={reduced} />
      </motion.div>
    </AnimatePresence>
  );
}

export default MatchRevealAnimation;