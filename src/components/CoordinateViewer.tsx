import { motion } from 'framer-motion';

interface CoordinateViewerProps {
  x: number;
  y: number;
  z: number;
  roll: number;
  pitch: number;
  yaw: number;
}

export function CoordinateViewer({ x, y, z, roll, pitch, yaw }: CoordinateViewerProps) {
  const range = 400;
  const cx = 200;
  const cy = 150;

  const px = cx + (x / range) * 160;
  const py = cy - (z / range) * 120;
  const indicatorSize = 24;

  return (
    <div role="img" aria-label="末端坐标平面视图" className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">末端坐标平面视图</h3>
      <div className="relative h-[200px] overflow-hidden rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30">
        <svg viewBox="0 0 400 200" className="h-full w-full" aria-hidden="true">
          <line x1="40" y1="170" x2="360" y2="170" stroke="#94a3b8" strokeWidth="1" />
          <line x1="40" y1="170" x2="40" y2="20" stroke="#94a3b8" strokeWidth="1" />
          <text x="370" y="174" fontSize="10" fill="#64748b" textAnchor="middle">X</text>
          <text x="36" y="16" fontSize="10" fill="#64748b">Z</text>

          {[0, 100, 200, 300, 400].map((v) => {
            const tx = 40 + (v / range) * 320;
            return (
              <g key={`x-${v}`}>
                <line x1={tx} y1="170" x2={tx} y2="174" stroke="#94a3b8" strokeWidth="1" />
                <text x={tx} y="186" fontSize="9" fill="#64748b" textAnchor="middle">{v}</text>
              </g>
            );
          })}
          {[0, 100, 200, 300, 400].map((v) => {
            const tz = 170 - (v / range) * 150;
            return (
              <g key={`z-${v}`}>
                <line x1="40" y1={tz} x2="36" y2={tz} stroke="#94a3b8" strokeWidth="1" />
                <text x="30" y={tz + 4} fontSize="9" fill="#64748b" textAnchor="end">{v}</text>
              </g>
            );
          })}

          <g filter="url(#glow)">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <motion.circle
              cx={0} cy={0}
              r={6}
              fill="#2563eb"
              opacity={0.3}
              animate={{ r: [6, 9, 6], opacity: [0.3, 0.15, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ transform: `translate(${px}px, ${py}px)` }}
            />
            <circle cx={px} cy={py} r={3} fill="#2563eb" />
          </g>

          <text x={px} y={py - 12} fontSize="10" fill="#334155" fontWeight="600" textAnchor="middle">
            {`(${x.toFixed(0)}, ${z.toFixed(0)})`}
          </text>
        </svg>

        <div className="absolute bottom-3 right-3 flex gap-3 text-[10px] text-ink-400">
          <span>Roll {roll.toFixed(1)}°</span>
          <span>Pitch {pitch.toFixed(1)}°</span>
          <span>Yaw {yaw.toFixed(1)}°</span>
        </div>
      </div>
    </div>
  );
}

export default CoordinateViewer;