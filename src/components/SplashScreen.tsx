import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, ChevronRight } from 'lucide-react';

interface SplashScreenProps {
  onEnter: () => void;
}

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  const [ready, setReady] = useState(false);

  // Blur in the background then reveal
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
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Animated gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 30%, #f093fb 60%, #4facfe 100%)',
            backgroundSize: '400% 400%',
            animation: 'bg-shift 12s ease infinite',
          }}
        />

        {/* Floating glass orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -left-20 top-1/4 h-64 w-64 rounded-full bg-white/10 blur-3xl"
            animate={{ y: [0, -30, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -right-20 bottom-1/4 h-80 w-80 rounded-full bg-purple-300/20 blur-3xl"
            animate={{ y: [0, 30, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
          <motion.div
            className="absolute left-1/3 top-1/2 h-48 w-48 rounded-full bg-blue-300/20 blur-3xl"
            animate={{ x: [-20, 20, -20], y: [10, -10, 10] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />
        </div>

        {/* Particle grid background */}
        <div className="absolute inset-0 opacity-20">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* Logo mark */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 16, delay: 0.2 }}
            className="relative"
          >
            <div className="glass-strong flex h-28 w-28 items-center justify-center rounded-[32px] shadow-2xl">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-white/30 to-transparent"
              />
              <Bot className="relative h-14 w-14 text-indigo-600" />
            </div>
            {/* Glow ring */}
            <motion.div
              className="absolute -inset-3 rounded-[40px] border-2 border-white/20"
              animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-center"
          >
            <h1 className="text-5xl font-bold tracking-tight text-white">
              OpenCLaw
            </h1>
            <motion.p
              className="mt-3 text-lg font-medium text-white/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              智能机器人控制系统
            </motion.p>
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-sm text-white/50"
          >
            Precision · Intelligence · Control
          </motion.p>

          {/* Enter button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 20 }}
            transition={{ duration: 0.6, delay: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
            onClick={handleEnter}
            className="glass-btn group relative flex items-center gap-3 overflow-hidden px-8 py-3.5 text-base font-medium text-white hover:scale-105 active:scale-100" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
          >
            <Sparkles className="h-4 w-4 opacity-70 transition group-hover:opacity-100" />
            <span className="tracking-wide">进入系统</span>
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            {/* Button glow */}
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-r from-white/0 via-white/15 to-white/0"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
            />
          </motion.button>
        </div>

        {/* Bottom subtle text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 text-xs text-white/40"
        >
          OpenCLaw Robotics · v2.0
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}