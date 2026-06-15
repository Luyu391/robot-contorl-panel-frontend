import { type CSSProperties } from 'react';
import useReducedMotion from '../hooks/useReducedMotion';

interface SkeletonProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  animate?: boolean;
  ariaLabel?: string;
}

const roundedMap: Record<NonNullable<SkeletonProps['rounded']>, string> = {
  sm: 'rounded',
  md: 'rounded-md',
  lg: 'rounded-2xl',
  full: 'rounded-full',
};

export function Skeleton({
  className = '',
  width,
  height,
  rounded = 'md',
  animate,
  ariaLabel = '内容加载中',
}: SkeletonProps) {
  const reduced = useReducedMotion();
  const effectiveAnimate = animate ?? !reduced;
  const style: CSSProperties = {};
  if (width !== undefined) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      data-testid="skeleton"
      className={[
        'relative overflow-hidden bg-slate-200',
        roundedMap[rounded],
        effectiveAnimate ? 'skeleton-shimmer' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={style}
    >
      {effectiveAnimate && (
        <div className="absolute inset-0 animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-slate-300/40 to-transparent" />
      )}
    </div>
  );
}

export function SkeletonPanel() {
  return (
    <div
      data-testid="skeleton-panel"
      className="rounded-card border border-white/30 glass p-6"
      role="status"
      aria-label="控制面板加载中"
    >
      <Skeleton height={24} width="40%" />
      <div className="mt-4 space-y-2">
        <Skeleton height={14} width="90%" />
        <Skeleton height={14} width="80%" />
      </div>
      <div className="mt-6 flex gap-2">
        <Skeleton width={80} height={36} rounded="full" />
        <Skeleton width={80} height={36} rounded="full" />
        <Skeleton width={80} height={36} rounded="full" />
      </div>
    </div>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div data-testid="skeleton-list" className="space-y-3" role="status" aria-label="历史记录加载中">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-card border border-white/30 glass p-4"
        >
          <Skeleton width={48} height={48} rounded="full" ariaLabel="状态加载中" />
          <div className="flex-1 space-y-2">
            <Skeleton width="60%" height={14} />
            <Skeleton width="40%" height={12} />
          </div>
          <Skeleton width={50} height={24} rounded="sm" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonMonitor() {
  return (
    <div data-testid="skeleton-monitor" className="space-y-6" role="status" aria-label="监控数据加载中">
      <div className="rounded-card border border-white/30 glass p-6">
        <Skeleton height={20} width="30%" />
        <div className="mt-4 grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton width="60%" height={12} />
              <Skeleton height={28} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}