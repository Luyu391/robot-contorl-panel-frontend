import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Sliders, Shield, Bell, Eye, Zap } from 'lucide-react';

export function SettingsPage() {
  const [speed, setSpeed] = useState(50);
  const [safetyLevel, setSafetyLevel] = useState<'normal' | 'strict'>('normal');
  const [notifyComplete, setNotifyComplete] = useState(true);
  const [notifyError, setNotifyError] = useState(true);
  const [showPreview, setShowPreview] = useState(true);

  return (
    <section className="space-y-5 pt-2">
      <div>
        <p className="text-xs tracking-[0.4em] text-white/40">OPENROBOT</p>
        <h1 className="mt-2 text-3xl font-bold text-white glow-text">系统设置</h1>
        <p className="mt-2 max-w-lg text-sm leading-6 text-white/50">
          配置机械臂控制参数、安全偏好与通知选项。修改会自动保存。
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl glass shadow-lg"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
        <div className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
              <Sliders className="h-4 w-4 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white/90">控制参数</h2>
              <p className="text-[10px] text-white/40">调整机械臂运行设置</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-xl bg-white/[0.06] p-4">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="speed" className="text-sm text-white/90">默认速度</label>
                <span className="font-mono text-sm font-semibold text-indigo-300">{speed}%</span>
              </div>
              <input
                id="speed"
                type="range"
                min="10" max="100" step="5"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                aria-label={`默认速度 ${speed}%`}
                className="w-full h-1.5 rounded-full bg-white/[0.08] appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-white/40 mt-1.5">
                <span>慢速</span><span>快速</span>
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.06] p-4">
              <label className="text-sm text-white/90 mb-3 block">安全等级</label>
              <div className="flex gap-2">
                {(['normal', 'strict'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setSafetyLevel(level)}
                    aria-pressed={safetyLevel === level}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all ${
                      safetyLevel === level
                        ? level === 'normal'
                          ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/25 text-emerald-300 border border-emerald-500/30'
                          : 'bg-gradient-to-r from-rose-500/25 to-red-500/25 text-rose-300 border border-rose-500/30'
                        : 'bg-white/[0.06] text-white/50 hover:bg-white/[0.1] border border-transparent'
                    }`}
                  >
                    {level === 'normal' ? '🟢 标准' : '🔴 严格'}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-white/40">
                {safetyLevel === 'strict' ? '严格模式：所有指令执行前必须确认' : '标准模式：仅警告类指令需要确认'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl glass shadow-lg"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
        <div className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
              <Bell className="h-4 w-4 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white/90">通知偏好</h2>
              <p className="text-[10px] text-white/40">自定义消息提醒方式</p>
            </div>
          </div>
          <div className="space-y-3">
            <ToggleRow label="指令完成通知" checked={notifyComplete} onChange={setNotifyComplete} />
            <ToggleRow label="错误告警通知" checked={notifyError} onChange={setNotifyError} />
            <ToggleRow label="执行动画预览" checked={showPreview} onChange={setShowPreview} />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative overflow-hidden rounded-2xl glass shadow-lg"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500" />
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
              <Eye className="h-4 w-4 text-blue-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white/90">关于</h2>
              <p className="text-[10px] text-white/40">系统版本信息</p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { label: '版本', value: 'v1.0.0' },
              { label: '引擎', value: 'OpenRobot NL' },
              { label: '机械臂型号', value: 'XRobotics i7' },
              { label: '前端框架', value: 'React 18 + Vite 5' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg bg-white/[0.06] px-3 py-2">
                <span className="text-sm text-white/60">{item.label}</span>
                <span className="font-mono text-sm font-semibold text-white/80">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/[0.06] px-4 py-3">
      <span className="text-sm text-white/90">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-all ${checked ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-white/[0.1]'}`}
      >
        <motion.div
          animate={{ x: checked ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-0.5 h-5 w-5 rounded-full glass shadow-lg"
        />
      </button>
    </div>
  );
}

export default SettingsPage;