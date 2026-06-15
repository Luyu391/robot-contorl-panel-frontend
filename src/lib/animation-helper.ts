import { type MotionValue } from 'framer-motion';

export function animateMotionValue(
  mv: MotionValue<number>,
  target: number,
  instant: boolean,
  durationSec = 0.28,
): Promise<void> {
  if (instant) {
    mv.set(target);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const start = mv.get();
    const startTime = performance.now();
    const duration = durationSec * 1000;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      mv.set(start + (target - start) * eased);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(tick);
  });
}