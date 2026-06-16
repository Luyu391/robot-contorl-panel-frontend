import { motion } from 'framer-motion';

interface StatRingProps {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
  index: number;
}

export function StatRing({ label, value, max, unit, color, index }: StatRingProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const circumference = 2 * Math.PI * 38;
  const offset = circumference * (1 - pct / 100);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90" aria-hidden="true">
          <circle cx="48" cy="48" r="38" fill="none" stroke="#e2e8f0" strokeWidth="6" />
          <motion.circle
            cx="48" cy="48" r="38"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white/90">{value.toFixed(1)}</span>
          <span className="text-[10px] text-ink-400">{unit}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-white/70">{label}</span>
    </motion.div>
  );
}

interface StatsPanelProps {
  joints: Record<string, number>;
  className?: string;
}

const RING_COLORS = ['#22d3ee', '#34d399', '#fbbf24', '#c084fc', '#fb7185', '#2dd4bf'];
const RING_LABELS = ['J1 基座', 'J2 肩部', 'J3 肘部', 'J4 腕1', 'J5 腕2', 'J6 腕3'];
const RING_LIMITS = [170, 120, 160, 180, 120, 360];

export function StatsPanel({ joints, className = '' }: StatsPanelProps) {
  const values = [joints.j1, joints.j2, joints.j3, joints.j4, joints.j5, joints.j6];

  return (
    <div className={className} role="region" aria-label="关节环状统计">
      <h3 className="text-sm font-semibold text-white/80 mb-4">关节负载</h3>
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {values.map((v, i) => (
          <StatRing
            key={RING_LABELS[i]}
            label={RING_LABELS[i]}
            value={Math.abs(v)}
            max={RING_LIMITS[i]}
            unit="°"
            color={RING_COLORS[i]}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

export default StatsPanel;