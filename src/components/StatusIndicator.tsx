import { memo } from 'react';
import { motion } from 'framer-motion';
import type { RobotStatus } from '../types';
import useReducedMotion from '../hooks/useReducedMotion';

interface StatusIndicatorProps {
  status: RobotStatus;
  className?: string;
}

const statusConfig: Record<RobotStatus, { label: string; dotClass: string; pulseClass: string }> = {
  idle: { label: '就绪', dotClass: 'bg-emerald-500', pulseClass: 'bg-emerald-500/20' },
  moving: { label: '运动中', dotClass: 'bg-amber-500', pulseClass: 'bg-amber-500/20' },
  executing: { label: '执行中', dotClass: 'bg-indigo-500', pulseClass: 'bg-indigo-500/20' },
  error: { label: '异常', dotClass: 'bg-rose-500', pulseClass: 'bg-rose-500/20' },
  offline: { label: '离线', dotClass: 'bg-slate-500', pulseClass: 'bg-slate-500/20' },
};

export const StatusIndicator = memo(function StatusIndicator({ status, className = '' }: StatusIndicatorProps) {
  const config = statusConfig[status];
  const reduced = useReducedMotion();

  const pulseAnimate = !reduced && status === 'idle' ? { scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] } : {};
  const dotAnimate = !reduced
    ? status === 'error'
      ? { opacity: [1, 0.3, 1, 0.3, 1] }
      : status === 'executing' || status === 'moving'
      ? { scale: [1, 1.2, 1] }
      : {}
    : {};

  const pulseTransition = !reduced
    ? status === 'error'
      ? { duration: 0.6, repeat: Infinity }
      : { duration: status === 'idle' ? 2 : 0.8, repeat: Infinity, ease: 'easeInOut' }
    : {};

  return (
    <div className={`inline-flex items-center gap-2 ${className}`} role="status" aria-label={`机械臂状态：${config.label}`}>
      <span className="relative flex h-3 w-3">
        {!reduced && (
          <motion.span
            className={`absolute inset-0 rounded-full ${config.pulseClass}`}
            animate={pulseAnimate}
            transition={pulseTransition}
          />
        )}
        <motion.span
          className={`relative inline-flex h-3 w-3 rounded-full ${config.dotClass}`}
          animate={dotAnimate}
          transition={pulseTransition}
        />
      </span>
      <span className="text-sm font-medium text-white/80">{config.label}</span>
    </div>
  );
});

export default StatusIndicator;