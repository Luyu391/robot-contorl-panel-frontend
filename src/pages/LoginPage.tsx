import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles,
  Shield,
  Zap
} from 'lucide-react';
import { LiquidGlassBackground, LiquidGlassCard, LiquidGlassButton, LiquidGlassInput } from '../components/LiquidGlass';

/**
 * 液态玻璃风格登录页面
 * Apple Liquid Glass Design
 */
export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // 模拟登录
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (formData.username && formData.password) {
      // 登录成功，跳转
      window.location.href = '/dashboard';
    } else {
      setError('请输入用户名和密码');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <LiquidGlassBackground />
      
      {/* 中心内容 */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo 和标题 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          className="text-center mb-10"
        >
          {/* Logo */}
          <motion.div
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6
              bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-pink-500/30
              border border-white/[0.2]
              shadow-[0_8px_32px_rgba(99,102,241,0.3),0_0_80px_rgba(99,102,241,0.15)]"
            animate={{
              boxShadow: [
                '0 8px 32px rgba(99,102,241,0.3), 0 0 80px rgba(99,102,241,0.15)',
                '0 12px 48px rgba(168,85,247,0.35), 0 0 100px rgba(168,85,247,0.2)',
                '0 8px 32px rgba(236,72,153,0.3), 0 0 80px rgba(236,72,153,0.15)',
                '0 8px 32px rgba(99,102,241,0.3), 0 0 80px rgba(99,102,241,0.15)',
              ],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Bot className="w-10 h-10 text-white/90" />
          </motion.div>

          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            OpenRobot
          </h1>
          <p className="text-white/50 text-sm">
            智能机械臂控制系统
          </p>
        </motion.div>

        {/* 登录卡片 */}
        <LiquidGlassCard variant="elevated" className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 用户名输入 */}
            <LiquidGlassInput
              type="text"
              label="用户名"
              placeholder="请输入用户名"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              disabled={isLoading}
            />

            {/* 密码输入 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/70">
                密码
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码"
                  className="
                    w-full
                    backdrop-blur-xl
                    bg-white/[0.05]
                    border border-white/[0.15]
                    rounded-2xl
                    pl-12 pr-12 py-3.5
                    text-white
                    placeholder:text-white/30
                    transition-all duration-300
                    focus:outline-none
                    focus:bg-white/[0.08]
                    focus:border-white/[0.3]
                    focus:shadow-[0_0_30px_rgba(99,102,241,0.2)]
                  "
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                {/* 输入框光泽 */}
                <div className="absolute inset-[1px] rounded-2xl bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />
              </div>
            </div>

            {/* 错误提示 */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="px-4 py-3 rounded-xl bg-red-500/15 border border-red-400/30 text-red-300 text-sm"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 登录按钮 */}
            <motion.button
              type="submit"
              disabled={isLoading}
              className="
                relative w-full
                backdrop-blur-xl
                bg-gradient-to-br from-indigo-500/40 via-purple-500/30 to-pink-500/40
                border border-white/[0.25]
                rounded-2xl
                py-4
                text-white font-semibold
                shadow-[0_8px_32px_rgba(99,102,241,0.3),0_0_60px_rgba(99,102,241,0.15)]
                transition-all duration-300
                hover:from-indigo-500/50 hover:via-purple-500/40 hover:to-pink-500/50
                hover:border-white/[0.35]
                hover:shadow-[0_12px_48px_rgba(99,102,241,0.4),0_0_80px_rgba(99,102,241,0.2)]
                disabled:opacity-60 disabled:cursor-not-allowed
                overflow-hidden
                group
              "
              whileHover={{ scale: 1.01, y: -2 }}
              whileTap={{ scale: 0.99 }}
            >
              {/* 按钮内层光泽 */}
              <div className="absolute inset-[1px] rounded-2xl bg-gradient-to-br from-white/[0.15] via-white/[0.05] to-transparent pointer-events-none" />
              
              {/* 流动光效 */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.1] to-transparent animate-[shimmer_2s_infinite]" />
              </div>

              <span className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                    <span>登录中...</span>
                  </>
                ) : (
                  <>
                    <span>登录</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </motion.button>
          </form>

          {/* 分隔线 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.1]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 text-xs text-white/30 bg-transparent">或</span>
            </div>
          </div>

          {/* 快捷登录按钮 */}
          <div className="grid grid-cols-3 gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="
                relative
                backdrop-blur-lg
                bg-white/[0.05]
                border border-white/[0.12]
                rounded-xl
                py-3
                text-white/60 text-xs
                hover:bg-white/[0.08]
                hover:border-white/[0.2]
                transition-all
                overflow-hidden
              "
            >
              <div className="absolute inset-[1px] rounded-xl bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />
              <span className="relative">访客</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="
                relative
                backdrop-blur-lg
                bg-white/[0.05]
                border border-white/[0.12]
                rounded-xl
                py-3
                text-white/60 text-xs
                hover:bg-white/[0.08]
                hover:border-white/[0.2]
                transition-all
                overflow-hidden
              "
            >
              <div className="absolute inset-[1px] rounded-xl bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />
              <span className="relative">扫码</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="
                relative
                backdrop-blur-lg
                bg-white/[0.05]
                border border-white/[0.12]
                rounded-xl
                py-3
                text-white/60 text-xs
                hover:bg-white/[0.08]
                hover:border-white/[0.2]
                transition-all
                overflow-hidden
              "
            >
              <div className="absolute inset-[1px] rounded-xl bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />
              <span className="relative">注册</span>
            </motion.button>
          </div>
        </LiquidGlassCard>

        {/* 底部特性介绍 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="mt-8 flex justify-center gap-8"
        >
          {[
            { icon: Sparkles, label: '智能控制' },
            { icon: Shield, label: '安全可靠' },
            { icon: Zap, label: '实时响应' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-white/40">
              <item.icon className="w-4 h-4" />
              <span className="text-xs">{item.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

export default LoginPage;
