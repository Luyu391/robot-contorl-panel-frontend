import { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { Crosshair, ArrowRight, Gauge, Terminal, TrendingUp } from 'lucide-react';
import StatusIndicator from '../../components/StatusIndicator';
import JointVisualizer from '../../components/JointVisualizer';
import ExecutionTimeline from '../../components/ExecutionTimeline';
import SystemHealth from '../../components/SystemHealth';
import StatsPanel from '../../components/StatsPanel';
import QuickActions from './QuickActions';
import CommandInput from '../../components/CommandInput';
import { useRobotContext } from '../../hooks/useRobotContext';
import { StaggerContainer, StaggerItem } from '../../lib/animation-presets.tsx';
import type { CommandRecord } from '../../types';

interface DashboardPageProps {
  history: CommandRecord[];
  onExecute: (text: string) => void;
  onNavigateCommand: () => void;
}

export const DashboardPage = memo(function DashboardPage({ history, onExecute, onNavigateCommand }: DashboardPageProps) {
  const { state } = useRobotContext();

  const stats = useMemo(() => {
    const completedCount = history.filter((r) => r.status === 'completed').length;
    const failedCount = history.filter((r) => r.status === 'failed').length;
    const successRate = history.length > 0 ? Math.round((completedCount / history.length) * 100) : 100;
    return { completedCount, failedCount, successRate };
  }, [history]);

  return (
    <section className="space-y-6 pt-2">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs tracking-[0.4em] text-slate-400">OPENCLAW</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">控制面板</h1>
        <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
          通过自然语言指令控制机械臂。输入你想让机械臂做的事情，
          OpenCLaw 会解析并执行你的指令。
        </p>
      </motion.div>

      {/* 指标卡片 — 无边框纯玻璃 */}
      <StaggerContainer className="grid grid-cols-3 gap-3">
        {[
          { label: '今日执行', value: history.length, icon: Gauge, accent: 'indigo' },
          { label: '成功率', value: `${stats.successRate}%`, icon: TrendingUp, accent: 'emerald' },
          { label: '异常次数', value: stats.failedCount, icon: Crosshair, accent: 'rose' },
        ].map((stat) => {
          const Icon = stat.icon;
          const accentMap: Record<string, { bg: string; text: string; ring: string }> = {
            indigo: { bg: 'bg-indigo-50/60', text: 'text-indigo-600', ring: 'ring-indigo-200/50' },
            emerald: { bg: 'bg-emerald-50/60', text: 'text-emerald-600', ring: 'ring-emerald-200/50' },
            rose: { bg: 'bg-rose-50/60', text: 'text-rose-600', ring: 'ring-rose-200/50' },
          };
          const a = accentMap[stat.accent];
          return (
            <StaggerItem key={stat.label}>
              <div className="group relative overflow-hidden rounded-2xl glass p-4 text-center transition-shadow hover:shadow-lg">
                <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-transparent to-slate-100/30" />
                <div className={`mx-auto inline-flex rounded-xl ${a.bg} p-2.5 ring-1 ${a.ring}`}>
                  <Icon className={`h-4 w-4 ${a.text}`} />
                </div>
                <p className="mt-2.5 font-mono text-2xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-xs text-slate-400">{stat.label}</p>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* 状态 + 关节 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl glass p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />机械臂状态
            </h2>
            {state && <StatusIndicator status={state.status} />}
          </div>
          {state ? (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                {(['X', 'Y', 'Z'] as const).map((axis) => (
                  <div key={axis} className="rounded-xl bg-white/30 py-2.5">
                    <p className="text-xs text-slate-400">{axis}</p>
                    <p className="font-mono text-base font-semibold text-slate-800">{state.pose[axis.toLowerCase() as 'x' | 'y' | 'z'].toFixed(1)}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/30 px-4 py-2 text-xs">
                <span className="text-slate-400">夹爪</span>
                <span className="font-medium text-slate-700">{gripperLabel(state.gripper)}</span>
                <span className="text-slate-400">速度</span>
                <span className="font-medium text-slate-700">{state.speed}%</span>
              </div>
            </div>
          ) : <p className="mt-4 text-sm text-slate-400">加载中...</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl glass p-5">
          {state?.joints ? <JointVisualizer joints={state.joints} /> : <p className="text-sm text-slate-400">关节数据加载中...</p>}
        </motion.div>
      </div>

      {/* 快速指令 */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
        className="rounded-2xl glass p-5">
        <div className="mb-4 flex items-center gap-2">
          <Terminal className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">快速指令</h2>
        </div>
        <CommandInput onExecute={onExecute} disabled={state?.status === 'offline'} />
      </motion.div>

      {/* 快捷操作 */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="rounded-2xl glass p-5">
        <QuickActions onAction={onExecute} disabled={state?.status === 'offline'} />
      </motion.div>

      {/* 关节负载 */}
      {state?.joints && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
          className="rounded-2xl glass p-5">
          <StatsPanel joints={state.joints} />
        </motion.div>
      )}

      {/* 系统健康 */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="rounded-2xl glass p-5">
        <SystemHealth />
      </motion.div>

      {/* CTA */}
      <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
        onClick={onNavigateCommand}
        className="glass-btn glass-btn-indigo group flex w-full items-center justify-between p-5 text-indigo-600">
        <div className="flex items-center gap-3">
          <Crosshair className="h-6 w-6" />
          <div className="text-left">
            <p className="text-base font-semibold">进入指令控制</p>
            <p className="text-sm opacity-80">输入自然语言，精确控制机械臂</p>
          </div>
        </div>
        <ArrowRight className="h-6 w-6 transition group-hover:translate-x-1" />
      </motion.button>

      {/* 执行历史 */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="rounded-2xl glass p-5">
        <ExecutionTimeline history={history} />
      </motion.div>
    </section>
  );
});

function gripperLabel(g: string): string {
  switch (g) {
    case 'open': return '打开';
    case 'closed': return '闭合';
    case 'holding': return '抓取中';
    default: return '未知';
  }
}

export default DashboardPage;