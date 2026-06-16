import { motion } from 'framer-motion';
import { Cpu, Thermometer, BarChart3, Wifi } from 'lucide-react';

interface SystemHealthProps { className?: string; }

const metrics = [
  { label: 'CPU 负载', value: '24%', icon: Cpu, color: 'text-white/50', bg: 'bg-white/5' },
  { label: '电机温度', value: '42°C', icon: Thermometer, color: 'text-emerald-300', bg: 'bg-emerald-500/20' },
  { label: '运行时长', value: '3h 21m', icon: BarChart3, color: 'text-amber-300', bg: 'bg-amber-500/20' },
  { label: '连接延迟', value: '8ms', icon: Wifi, color: 'text-emerald-300', bg: 'bg-emerald-500/20' },
];

export function SystemHealth({ className = '' }: SystemHealthProps) {
  return (
    <div className={className} role="region" aria-label="系统健康">
      <h3 className="mb-3 text-sm font-semibold text-white/80">系统健康</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div key={item.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="flex flex-col items-center rounded-xl bg-white/[0.06] py-3 text-center">
              <div className={`rounded-full p-1.5 ${item.bg}`}>
                <Icon className={`h-3.5 w-3.5 ${item.color}`} />
              </div>
              <p className="mt-1.5 font-mono text-sm font-semibold text-white/90">{item.value}</p>
              <p className="text-[10px] text-white/40">{item.label}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default SystemHealth;