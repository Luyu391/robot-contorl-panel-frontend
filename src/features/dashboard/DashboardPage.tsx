import { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { Crosshair, ArrowRight, Gauge, Terminal, TrendingUp, Activity, Zap, Shield, Cpu } from 'lucide-react';
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
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 px-4 py-1.5">
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-green-400" />
          <span className="text-xs font-medium text-white/60">系统在线</span>
        </div>
        <h1 className="mt-4 text-4xl font-bold text-white glow-text">控制面板</h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-white/50">
          通过自然语言指令控制机械臂。输入你想让机械臂做的事情，
          OpenCLaw 会解析并执行你的指令。
        </p>
      </motion.div>

      <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '今日执行', value: history.length, icon: Gauge, accent: 'indigo' },
          { label: '成功率', value: `${stats.successRate}%`, icon: TrendingUp, accent: 'emerald' },
          { label: '异常次数', value: stats.failedCount, icon: Activity, accent: 'rose' },
          { label: '运行时长', value: '8h 23m', icon: Zap, accent: 'amber' },
        ].map((stat) => {
          const Icon = stat.icon;
          const accentMap: Record<string, { bg: string; text: string; ring: string; glow: string }> = {
            indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-300', ring: 'ring-indigo-400/30', glow: 'shadow-[0_0_20px_rgba(99,102,241,0.3)]' },
            emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', ring: 'ring-emerald-400/30', glow: 'shadow-[0_0_20px_rgba(52,211,153,0.3)]' },
            rose: { bg: 'bg-rose-500/20', text: 'text-rose-300', ring: 'ring-rose-400/30', glow: 'shadow-[0_0_20px_rgba(244,114,130,0.3)]' },
            amber: { bg: 'bg-amber-500/20', text: 'text-amber-300', ring: 'ring-amber-400/30', glow: 'shadow-[0_0_20px_rgba(251,191,36,0.3)]' },
          };
          const a = accentMap[stat.accent];
          return (
            <StaggerItem key={stat.label}>
              <div className={`group relative overflow-hidden rounded-2xl glass p-5 transition-all duration-300 hover:${a.glow} hover:-translate-y-1`}>
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-transparent to-white/[0.08]" />
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${a.bg} opacity-0 transition-opacity group-hover:opacity-50`} />
                <div className={`relative inline-flex rounded-xl ${a.bg} p-3 ring-1 ${a.ring}`}>
                  <Icon className={`h-5 w-5 ${a.text}`} />
                </div>
                <p className="relative mt-3 font-mono text-3xl font-bold text-white/95">{stat.value}</p>
                <p className="relative text-xs text-white/40">{stat.label}</p>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl glass-strong p-6">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2.5 text-base font-semibold text-white/90">
              <span className="inline-flex h-2 w-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
              机械臂状态
            </h2>
            {state && <StatusIndicator status={state.status} />}
          </div>
          {state ? (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {(['X', 'Y', 'Z'] as const).map((axis) => (
                  <div key={axis} className="group relative overflow-hidden rounded-xl bg-white/[0.06] p-3 text-center transition-all hover:bg-white/[0.1]">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <p className="relative text-xs text-white/40">{axis} 轴</p>
                    <p className="relative mt-1 font-mono text-lg font-semibold text-white/95">{state.pose[axis.toLowerCase() as 'x' | 'y' | 'z'].toFixed(1)} mm</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-xl bg-white/[0.06] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-white/40" />
                    <span className="text-sm text-white/40">夹爪</span>
                  </div>
                  <span className="font-mono text-sm font-semibold text-white/90">{gripperLabel(state.gripper)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/[0.06] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-white/40" />
                    <span className="text-sm text-white/40">速度</span>
                  </div>
                  <span className="font-mono text-sm font-semibold text-white/90">{state.speed}%</span>
                </div>
              </div>
            </div>
          ) : <div className="mt-5 flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
                <span className="text-sm text-white/40">加载中...</span>
              </div>
            </div>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="relative overflow-hidden rounded-2xl glass-strong p-6">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />
          <h2 className="flex items-center gap-2.5 text-base font-semibold text-white/90">
            <Cpu className="h-5 w-5 text-white/60" />关节角度
          </h2>
          {state?.joints ? <JointVisualizer joints={state.joints} /> : <div className="mt-5 flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-500/30 border-t-purple-500" />
                <span className="text-sm text-white/40">关节数据加载中...</span>
              </div>
            </div>}
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
        className="relative overflow-hidden rounded-2xl glass-strong p-6">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500" />
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2.5 text-base font-semibold text-white/90">
            <Terminal className="h-5 w-5 text-white/60" />自然语言指令
          </h2>
          <span className="text-xs text-white/40">AI 驱动</span>
        </div>
        <CommandInput onExecute={onExecute} disabled={state?.status === 'offline'} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="relative overflow-hidden rounded-2xl glass-strong p-6">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
        <h2 className="flex items-center gap-2.5 text-base font-semibold text-white/90">
          <Zap className="h-5 w-5 text-white/60" />快捷操作
        </h2>
        <QuickActions onAction={onExecute} disabled={state?.status === 'offline'} />
      </motion.div>

      {state?.joints && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
          className="relative overflow-hidden rounded-2xl glass-strong p-6">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
          <h2 className="flex items-center gap-2.5 text-base font-semibold text-white/90">
            <Activity className="h-5 w-5 text-white/60" />关节负载监控
          </h2>
          <StatsPanel joints={state.joints} />
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="relative overflow-hidden rounded-2xl glass-strong p-6">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-red-500 to-rose-500" />
        <h2 className="flex items-center gap-2.5 text-base font-semibold text-white/90">
          <Shield className="h-5 w-5 text-white/60" />系统健康状态
        </h2>
        <SystemHealth />
      </motion.div>

      <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
        onClick={onNavigateCommand}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600/20 to-purple-600/20 p-6 text-left transition-all hover:from-indigo-600/30 hover:to-purple-600/30 hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_20px_rgba(99,102,241,0.4)]">
              <Crosshair className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">进入指令控制</p>
              <p className="mt-1 text-sm text-white/50">输入自然语言，精确控制机械臂</p>
            </div>
          </div>
          <ArrowRight className="h-6 w-6 text-white/60 transition-transform group-hover:translate-x-2" />
        </div>
      </motion.button>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="relative overflow-hidden rounded-2xl glass-strong p-6">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500" />
        <h2 className="flex items-center gap-2.5 text-base font-semibold text-white/90">
          <Gauge className="h-5 w-5 text-white/60" />执行历史
        </h2>
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