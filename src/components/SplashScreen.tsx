import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, ChevronRight } from 'lucide-react';
import { LiquidGlassBackground } from './LiquidGlass';

interface SplashScreenProps {
  onEnter: () => void;
}

/**
 * 液态玻璃风格启动界面
 * Apple Liquid Glass Design
 */
export default function SplashScreen({ onEnter }: SplashScreenProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  const handleEnter = useCallback(() => {
    onEnter();
  }, [onEnter]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
        exit={{ opacity: 0, scale: 1.02 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* 液态玻璃背景 */}
        <LiquidGlassBackground />

        {/* 内容 */}
        <div className="relative z-10 flex flex-col items-center gap-10">
          {/* Logo 标记 */}
          <motion.div
            initial={{ scale: 0, rotate: -30, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ 
              type: 'spring', 
              stiffness: 150, 
              damping: 14, 
              delay: 0.2,
              duration: 0.8 
            }}
            className="relative"
          >
            {/* 外层发光环 */}
            <motion.div
              className="absolute -inset-6 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
              }}
              animate={{ 
                scale: [1, 1.15, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            
            {/* 主容器 */}
            <div className="
              relative
              flex h-32 w-32 items-center justify-center
              rounded-[36px]
              backdrop-blur-2xl
              bg-gradient-to-br from-indigo-500/30 via-purple-500/25 to-pink-500/30
              border border-white/[0.25]
              shadow-[0_20px_60px_rgba(99,102,241,0.35),0_0_100px_rgba(99,102,241,0.2)]
            ">
              {/* 内层光泽 */}
              <div className="absolute inset-[2px] rounded-[34px] bg-gradient-to-br from-white/[0.15] via-white/[0.05] to-transparent" />
              
              {/* 旋转光效 */}
              <motion.div
                className="absolute inset-0 rounded-[36px]"
                style={{
                  background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.1), transparent)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              />
              
              {/* 机器人图标 */}
              <motion.div
                animate={{ 
                  y: [0, -4, 0],
                  filter: ['drop-shadow(0 0 8px rgba(255,255,255,0.3))', 'drop-shadow(0 0 16px rgba(99,102,241,0.5))', 'drop-shadow(0 0 8px rgba(255,255,255,0.3))'],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Bot className="relative h-16 w-16 text-white/90" />
              </motion.div>
            </div>

            {/* 外边框 */}
            <motion.div
              className="absolute -inset-1 rounded-[38px] border border-white/[0.15]"
              animate={{ 
                scale: [1, 1.02, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>

          {/* 标题 */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="text-center"
          >
            <motion.h1 
              className="text-5xl font-bold tracking-tight text-white"
              style={{ textShadow: '0 0 40px rgba(255,255,255,0.3)' }}
              initial={{ letterSpacing: '0.2em' }}
              animate={{ letterSpacing: '0.05em' }}
              transition={{ duration: 1.5, delay: 0.6 }}
            >
              OpenCLaw
            </motion.h1>
            
            <motion.p
              className="mt-4 text-lg font-medium text-white/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              智能机械臂控制系统
            </motion.p>
          </motion.div>

          {/* 标语 */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1 }}
            className="text-sm text-white/40 tracking-[0.3em] uppercase"
          >
            Precision · Intelligence · Control
          </motion.p>

          {/* 进入按钮 */}
          <motion.button
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 30, scale: ready ? 1 : 0.9 }}
            transition={{ duration: 0.6, delay: 1.2, ease: [0.23, 1, 0.32, 1] }}
            onClick={handleEnter}
            className="
              group relative
              flex items-center gap-3
              px-10 py-4
              backdrop-blur-2xl
              bg-white/[0.1]
              border border-white/[0.2]
              rounded-2xl
              text-base font-medium text-white
              shadow-[0_8px_32px_rgba(0,0,0,0.2),0_0_60px_rgba(255,255,255,0.08)]
              transition-all duration-300
              hover:bg-white/[0.15]
              hover:border-white/[0.3]
              hover:shadow-[0_12px_48px_rgba(0,0,0,0.25),0_0_80px_rgba(255,255,255,0.12)]
              overflow-hidden
            "
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* 内层光泽 */}
            <div className="absolute inset-[1px] rounded-2xl bg-gradient-to-br from-white/[0.12] via-white/[0.04] to-transparent pointer-events-none" />
            
            {/* 流动光效 */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div 
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                  animation: 'shimmer 2s ease-in-out infinite',
                }}
              />
            </div>

            <Sparkles className="relative h-5 w-5 text-white/60 group-hover:text-white/90 transition-colors" />
            <span className="relative tracking-wide">进入系统</span>
            <ChevronRight className="relative h-5 w-5 transition-transform group-hover:translate-x-1.5" />
          </motion.button>

          {/* 版本信息 */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            transition={{ delay: 1.6 }}
            className="absolute bottom-10 text-xs text-white/40 tracking-wider"
          >
            OpenCLaw Robotics · v2.0
          </motion.p>
        </div>

        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-150%); }
            100% { transform: translateX(150%); }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}
