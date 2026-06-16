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
    <section className="space-y-6 pt-2">
      <div>
        <p className="text-xs tracking-[0.4em] text-white/40">OPENCLAW</p>
        <h1 className="mt-2 text-3xl font-bold text-white/90">系统设置</h1>
        <p className="mt-2 max-w-lg text-sm leading-6 text-white/40">
          配置机械臂控制参数、安全偏好与通知选项。修改会自动保存。
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-card border border-white/[0.1] glass p-5 shadow-lg"
      >
        <div className="flex items-center gap-2 mb-5">
          <Sliders className="h-4 w-4 text-white/40" />
          <h2 className="text-sm font-semibold text-white/80">控制参数</h2>
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="speed" className="text-sm text-white/90">默认速度</label>
              <span className="font-mono text-sm font-semibold text-white/40">{speed}%</span>
            </div>
            <input
              id="speed"
              type="range"
              min="10" max="100" step="5"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              aria-label={`默认速度 ${speed}%`}
              className="w-full h-2 rounded-full bg-white/[0.06] appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-white/40 mt-1">
              <span>慢速</span><span>快速</span>
            </div>
          </div>

          <div>
            <label className="text-sm text-white/90 mb-2 block">安全等级</label>
            <div className="flex gap-2">
              {(['normal', 'strict'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setSafetyLevel(level)}
                  aria-pressed={safetyLevel === level}
                  className={`glass-btn flex-1 py-2.5 text-sm font-medium ${
                    safetyLevel === level
                      ? 'glass-btn-indigo text-indigo-300'
                      : 'text-white/40'
                  }`}
                >
                  {level === 'normal' ? '🟢 标准' : '🔴 严格'}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-white/40">
              {safetyLevel === 'strict' ? '严格模式：所有指令执行前必须确认' : '标准模式：仅警告类指令需要确认'}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-card border border-white/[0.1] glass p-5 shadow-lg"
      >
        <div className="flex items-center gap-2 mb-5">
          <Bell className="h-4 w-4 text-white/40" />
          <h2 className="text-sm font-semibold text-white/80">通知偏好</h2>
        </div>
        <div className="space-y-4">
          <ToggleRow label="指令完成通知" checked={notifyComplete} onChange={setNotifyComplete} />
          <ToggleRow label="错误告警通知" checked={notifyError} onChange={setNotifyError} />
          <ToggleRow label="执行动画预览" checked={showPreview} onChange={setShowPreview} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-card border border-white/[0.1] glass p-5 shadow-lg"
      >
        <div className="flex items-center gap-2 mb-4">
          <Eye className="h-4 w-4 text-white/40" />
          <h2 className="text-sm font-semibold text-white/80">关于</h2>
        </div>
        <div className="space-y-2 text-sm text-white/80">
          <p className="flex justify-between"><span>版本</span><span className="font-mono">v1.0.0</span></p>
          <p className="flex justify-between"><span>引擎</span><span className="font-mono">OpenCLaw NL</span></p>
          <p className="flex justify-between"><span>机械臂型号</span><span className="font-mono">XRobotics i7</span></p>
          <p className="flex justify-between"><span>前端框架</span><span className="font-mono">React 18 + Vite 5</span></p>
        </div>
      </motion.div>
    </section>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-white/90">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`glass-btn relative h-6 w-11 p-0 ${checked ? 'bg-indigo-500/60' : 'bg-white/[0.06]'}`}
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