import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import useReducedMotion from '../hooks/useReducedMotion';

export type TransitionMode = 'fade' | 'push' | 'pop' | 'enter';

const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

const VARIANTS: Record<TransitionMode, Variants> = {
  enter: {
    initial: { opacity: 0, y: '100%' },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: EASE },
    },
    exit: {
      opacity: 0,
      y: '30%',
      transition: { duration: 0.2, ease: EASE },
    },
  },
  push: {
    initial: { opacity: 0, x: 40 },
    animate: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, ease: EASE },
    },
    exit: {
      opacity: 0,
      x: -40,
      transition: { duration: 0.2, ease: EASE },
    },
  },
  pop: {
    initial: { opacity: 0, x: -40 },
    animate: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, ease: EASE },
    },
    exit: {
      opacity: 0,
      x: 40,
      transition: { duration: 0.2, ease: EASE },
    },
  },
  fade: {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { duration: 0.2, ease: EASE },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.2, ease: EASE },
    },
  },
};

export interface PageTransitionProps {
  mode?: TransitionMode;
  children: ReactNode;
  routeKey?: string;
}

export function PageTransition({ mode = 'push', children, routeKey }: PageTransitionProps) {
  const reduced = useReducedMotion();
  const location = useLocation();
  const key = routeKey ?? location.pathname;

  if (reduced) {
    return (
      <div data-testid="page-transition" data-mode={mode} data-reduced="true">
        {children}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        data-testid="page-transition"
        data-mode={mode}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={VARIANTS[mode]}
        className="min-h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default PageTransition;