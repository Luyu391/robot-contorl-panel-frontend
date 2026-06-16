import { memo } from 'react';
import { motion, type MotionValue } from 'framer-motion';

interface JointVisualizerProps {
  joints: { j1: number; j2: number; j3: number; j4: number; j5: number; j6: number };
  className?: string;
}

const JOINT_LABELS = ['J1', 'J2', 'J3', 'J4', 'J5', 'J6'];
const JOINT_COLORS = ['#3b82f6', '#2563eb', '#6366f1', '#1d4ed8', '#0ea5e9', '#06b6d4'];
const JOINT_LIMITS: [number, number][] = [[-170, 170], [-120, 120], [-160, 160], [-180, 180], [-120, 120], [-360, 360]];

export const JointVisualizer = memo(function JointVisualizer({ joints, className = '' }: JointVisualizerProps) {
  const values = [joints.j1, joints.j2, joints.j3, joints.j4, joints.j5, joints.j6];

  return (
    <div className={`space-y-3 ${className}`} role="region" aria-label="关节角度可视化">
      <h3 className="text-sm font-semibold text-white/80">关节角度</h3>
      <div className="space-y-2">
        {values.map((angle, i) => {
          const [min, max] = JOINT_LIMITS[i];
          const pct = ((angle - min) / (max - min)) * 100;
          const isWarning = Math.abs(angle) > Math.abs(max) * 0.85;
          const clampedPct = Math.min(100, Math.max(0, pct));

          return (
            <div key={JOINT_LABELS[i]} className="flex items-center gap-3">
              <span className="w-8 text-xs font-mono font-medium text-white/50">{JOINT_LABELS[i]}</span>
              <div className="relative flex-1 h-3 rounded-full bg-white/30 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: isWarning ? undefined : JOINT_COLORS[i], originX: 0 }}
                  initial={{ width: 0 }}
                  animate={{ width: `${clampedPct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  {isWarning && (
                    <div className="h-full w-full rounded-full bg-amber-600" />
                  )}
                </motion.div>
                <div
                  className="absolute inset-y-0 w-px bg-white/30"
                  style={{ left: `${((0 - min) / (max - min)) * 100}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className={`w-14 text-right text-xs font-mono ${isWarning ? 'text-amber-600 font-semibold' : 'text-white/80'}`}>
                {angle.toFixed(1)}°
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default JointVisualizer;