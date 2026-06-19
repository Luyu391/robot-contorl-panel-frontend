import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * 液态玻璃动态背景组件
 * 包含流动的光效、渐变球体、粒子效果
 */
export function LiquidGlassBackground() {
  // 生成随机球体数据
  const spheres = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      id: i,
      size: 200 + Math.random() * 400,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 20 + Math.random() * 15,
      delay: Math.random() * 5,
      hue: [220, 260, 280, 200, 320, 180][i],
    }));
  }, []);

  // 生成流动光效数据
  const flows = useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => ({
      id: i,
      width: 100 + Math.random() * 200,
      height: 300 + Math.random() * 400,
      x: Math.random() * 100,
      duration: 8 + Math.random() * 6,
      delay: Math.random() * 4,
      rotate: Math.random() * 360,
    }));
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[#0a0e1a]" />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-indigo-950/30 to-slate-900/95" />
      
      {/* 渐变网格 */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* 流动光效层 */}
      {flows.map((flow) => (
        <div
          key={flow.id}
          className="absolute"
          style={{
            left: `${flow.x}%`,
            top: '-20%',
            width: `${flow.width}px`,
            height: `${flow.height}px`,
            transform: `rotate(${flow.rotate}deg)`,
          }}
        >
          <div
            className="w-full h-full rounded-full"
            style={{
              background: `linear-gradient(180deg, 
                transparent 0%,
                rgba(99, 102, 241, 0.15) 30%,
                rgba(168, 85, 247, 0.1) 50%,
                rgba(236, 72, 153, 0.08) 70%,
                transparent 100%
              )`,
              animation: `flowVertical ${flow.duration}s ease-in-out ${flow.delay}s infinite`,
              filter: 'blur(30px)',
            }}
          />
        </div>
      ))}

      {/* 液态玻璃球体 */}
      {spheres.map((sphere) => (
        <motion.div
          key={sphere.id}
          className="absolute rounded-full"
          style={{
            width: sphere.size,
            height: sphere.size,
            left: `${sphere.x}%`,
            top: `${sphere.y}%`,
            background: `radial-gradient(circle at 30% 30%, 
              hsla(${sphere.hue}, 70%, 50%, 0.12) 0%,
              hsla(${sphere.hue}, 60%, 40%, 0.06) 40%,
              hsla(${sphere.hue}, 50%, 30%, 0.02) 70%,
              transparent 100%
            )`,
            filter: 'blur(50px)',
          }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -20, 30, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{
            duration: sphere.duration,
            delay: sphere.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* 噪点纹理 */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <style>{`
        @keyframes flowVertical {
          0%, 100% {
            transform: translateY(-20%) scaleY(1);
            opacity: 0.3;
          }
          50% {
            transform: translateY(20%) scaleY(1.2);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * 液态玻璃卡片组件
 */
interface LiquidGlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'glow';
  glowColor?: string;
  hoverable?: boolean;
}

export function LiquidGlassCard({
  children,
  className = '',
  variant = 'default',
  glowColor = 'rgba(99, 102, 241, 0.3)',
  hoverable = true,
}: LiquidGlassCardProps) {
  const baseStyles = `
    relative
    backdrop-blur-2xl
    bg-white/[0.06]
    border border-white/[0.12]
    rounded-3xl
    overflow-hidden
    transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
  `;

  const variantStyles = {
    default: 'shadow-[0_8px_32px_rgba(0,0,0,0.2)]',
    elevated: 'shadow-[0_20px_60px_rgba(0,0,0,0.3),0_0_80px_rgba(255,255,255,0.05)]',
    glow: 'shadow-[0_8px_32px_rgba(0,0,0,0.2)]',
  };

  const hoverStyles = hoverable ? `
    hover:bg-white/[0.09]
    hover:border-white/[0.2]
    hover:shadow-[0_16px_48px_rgba(0,0,0,0.3),0_0_100px_rgba(255,255,255,0.1)]
    hover:scale-[1.01]
    active:scale-[0.99]
  ` : '';

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${hoverStyles} ${className}`}>
      {/* 内层光泽 */}
      <div className="absolute inset-[1px] rounded-3xl bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent pointer-events-none" />
      
      {/* 顶部高光 */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.3] to-transparent" />
      
      {children}
    </div>
  );
}

/**
 * 液态玻璃按钮组件
 */
interface LiquidGlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function LiquidGlassButton({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  ...props
}: LiquidGlassButtonProps) {
  const sizeStyles = {
    sm: 'px-4 py-2 text-sm gap-2',
    md: 'px-6 py-3 text-base gap-2',
    lg: 'px-8 py-4 text-lg gap-3',
  };

  const variantStyles = {
    primary: `
      bg-gradient-to-br from-indigo-500/30 via-purple-500/25 to-pink-500/30
      border-white/[0.25]
      shadow-[0_4px_20px_rgba(99,102,241,0.25),0_0_40px_rgba(99,102,241,0.1)]
      hover:from-indigo-500/40 hover:via-purple-500/35 hover:to-pink-500/40
      hover:border-white/[0.35]
      hover:shadow-[0_6px_30px_rgba(99,102,241,0.35),0_0_60px_rgba(99,102,241,0.15)]
    `,
    secondary: `
      bg-white/[0.08]
      border-white/[0.18]
      shadow-[0_4px_16px_rgba(0,0,0,0.1)]
      hover:bg-white/[0.12]
      hover:border-white/[0.28]
      hover:shadow-[0_6px_24px_rgba(0,0,0,0.15)]
    `,
    ghost: `
      bg-transparent
      border-white/[0.12]
      hover:bg-white/[0.06]
      hover:border-white/[0.2]
    `,
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative
        inline-flex items-center justify-center
        backdrop-blur-xl
        rounded-2xl
        font-medium
        transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${className}
      `}
      {...(props as any)}
    >
      {/* 内层光泽 */}
      <div className="absolute inset-[1px] rounded-2xl bg-gradient-to-br from-white/[0.15] via-white/[0.05] to-transparent pointer-events-none" />
      
      {icon && <span className="relative z-10">{icon}</span>}
      {children && <span className="relative z-10">{children}</span>}
    </motion.button>
  );
}

/**
 * 液态玻璃输入框组件
 */
interface LiquidGlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function LiquidGlassInput({
  label,
  error,
  icon,
  className = '',
  ...props
}: LiquidGlassInputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-white/70">
          {label}
        </label>
      )}
      <div className="relative">
        <div className="
          absolute left-4 top-1/2 -translate-y-1/2
          text-white/40
          pointer-events-none
        ">
          {icon}
        </div>
        <input
          className={`
            w-full
            backdrop-blur-xl
            bg-white/[0.05]
            border ${error ? 'border-red-400/50' : 'border-white/[0.15]'}
            rounded-2xl
            px-4 py-3.5
            ${icon ? 'pl-12' : ''}
            text-white
            placeholder:text-white/30
            transition-all duration-300
            focus:outline-none
            focus:bg-white/[0.08]
            focus:border-white/[0.3]
            focus:shadow-[0_0_30px_rgba(99,102,241,0.2)]
            ${className}
          `}
          {...props}
        />
        {/* 输入框光泽 */}
        <div className="absolute inset-[1px] rounded-2xl bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />
      </div>
      {error && (
        <p className="text-sm text-red-400/80">{error}</p>
      )}
    </div>
  );
}

/**
 * 液态玻璃徽章组件
 */
interface LiquidGlassBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning';
  size?: 'sm' | 'md';
}

export function LiquidGlassBadge({
  children,
  variant = 'default',
  size = 'sm',
}: LiquidGlassBadgeProps) {
  const variantStyles = {
    default: 'bg-white/[0.1] border-white/[0.15] text-white/80',
    primary: 'bg-indigo-500/20 border-indigo-400/30 text-indigo-300',
    success: 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300',
    warning: 'bg-amber-500/20 border-amber-400/30 text-amber-300',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  return (
    <div className={`
      inline-flex items-center gap-1.5
      backdrop-blur-md
      border rounded-full
      font-medium
      ${variantStyles[variant]}
      ${sizeStyles[size]}
    `}>
      {children}
    </div>
  );
}
