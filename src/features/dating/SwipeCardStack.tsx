import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { X, CheckCircle, Star, RotateCcw, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Camera, CameraOff, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import useReducedMotion from '../../hooks/useReducedMotion';
import type { SwipeCardCandidate, SwipeDirection } from '../../types';

// ==================== Constants ====================
const SWIPE_THRESHOLD_OFFSET = 80;
const SWIPE_THRESHOLD_VELOCITY = 500;
const FLY_DISTANCE = 900;
const MAX_TILT_DEG = 20;
const DRAG_ELASTIC = 0.6;
const GESTURE_HOLD_DURATION = 3000;
const GESTURE_DEAD_ZONE = 30;

interface SwipeCardStackProps {
  candidates: SwipeCardCandidate[];
  onSwipe?: (direction: SwipeDirection, candidate: SwipeCardCandidate) => void;
}

// ==================== Helpers ====================
function determineDirection(ox: number, oy: number, vx: number, vy: number): SwipeDirection | null {
  const aox = Math.abs(ox), aoy = Math.abs(oy), avx = Math.abs(vx), avy = Math.abs(vy);
  const vOk = aoy > SWIPE_THRESHOLD_OFFSET || avy > SWIPE_THRESHOLD_VELOCITY;
  const hOk = aox > SWIPE_THRESHOLD_OFFSET || avx > SWIPE_THRESHOLD_VELOCITY;
  if (vOk && aoy >= aox) return oy < 0 ? 'up' : 'down';
  if (hOk) return ox > 0 ? 'right' : 'left';
  return null;
}
function mapGestureToDirection(dx: number, dy: number): SwipeDirection | null {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if (ax < GESTURE_DEAD_ZONE && ay < GESTURE_DEAD_ZONE) return null;
  return ay > ax ? (dy < 0 ? 'up' : 'down') : (dx > 0 ? 'right' : 'left');
}

// ==================== Firework Particle System ====================
interface Spark {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number;
  hue: number; sat: number;
}

function spawnFirework(canvas: HTMLCanvasElement | null, direction: SwipeDirection, ox: number, oy: number) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const hueMap: Record<SwipeDirection, number> = { left: 350, right: 160, up: 250, down: 42 };
  const baseHue = hueMap[direction];

  // Two rings of sparks for cascade firework effect
  const sparks: Spark[] = [];

  // First burst ring
  for (let i = 0; i < 50; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    sparks.push({
      x: ox, y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      life: 0, maxLife: 18 + Math.random() * 22,
      size: 1.5 + Math.random() * 2.5,
      hue: baseHue + (Math.random() - 0.5) * 40,
      sat: 70 + Math.random() * 30,
    });
  }

  // Delayed second ring (bigger, faster)
  setTimeout(() => {
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      sparks.push({
        x: ox + (Math.random() - 0.5) * 10,
        y: oy + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 0, maxLife: 14 + Math.random() * 16,
        size: 2 + Math.random() * 3,
        hue: baseHue + (Math.random() - 0.5) * 50,
        sat: 80 + Math.random() * 20,
      });
    }
  }, 80);

  let frame = 0;
  const maxFrames = 55;
  const tick = () => {
    if (frame >= maxFrames) { ctx.clearRect(0, 0, rect.width, rect.height); return; }
    ctx.clearRect(0, 0, rect.width, rect.height);

    for (const s of sparks) {
      if (s.life >= s.maxLife) continue;
      s.life++;
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.03; // subtle gravity
      s.vx *= 0.99; // air drag

      const progress = s.life / s.maxLife;
      const alpha = progress < 0.15
        ? progress / 0.15 // fade in
        : 1 - (progress - 0.15) / 0.85; // fade out

      if (alpha <= 0) continue;

      // Glow core
      const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 2.5);
      glow.addColorStop(0, `hsla(${s.hue}, ${s.sat}%, 85%, ${alpha})`);
      glow.addColorStop(0.4, `hsla(${s.hue}, ${s.sat}%, 60%, ${alpha * 0.7})`);
      glow.addColorStop(1, `hsla(${s.hue}, ${s.sat}%, 40%, 0)`);

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Bright center
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${s.hue}, 40%, 95%, ${alpha})`;
      ctx.fill();
    }

    frame++;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ==================== useCameraGesture ====================
let mediaPipeScriptLoaded = false;
let mediaPipeScriptLoading: Promise<void> | null = null;
function loadMediaPipeScript(): Promise<void> {
  if (mediaPipeScriptLoaded) return Promise.resolve();
  if (mediaPipeScriptLoading) return mediaPipeScriptLoading;
  mediaPipeScriptLoading = new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined' || !('Hands' in window)) {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js';
      s.crossOrigin = 'anonymous';
      s.onload = () => { mediaPipeScriptLoaded = true; resolve(); };
      s.onerror = () => { mediaPipeScriptLoading = null; reject(new Error('加载失败')); };
      document.head.appendChild(s);
    } else { mediaPipeScriptLoaded = true; resolve(); }
  });
  return mediaPipeScriptLoading;
}
interface CameraResult {
  cameraActive: boolean; cameraError: string | null;
  gestureDirection: SwipeDirection | null; countdownProgress: number;
  startCamera: () => Promise<void>; stopCamera: () => void;
}
function useCameraGesture(videoRef: React.RefObject<HTMLVideoElement | null>, onGestureSwipe: (d: SwipeDirection) => void, enabled: boolean): CameraResult {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [gestureDirection, setGestureDirection] = useState<SwipeDirection | null>(null);
  const [countdownProgress, setCountdownProgress] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const handsRef = useRef<any>(null);
  const holdStartRef = useRef(0);
  const holdDirRef = useRef<SwipeDirection | null>(null);
  const rafRef = useRef(0);
  const triggeredRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    if (handsRef.current) { try { handsRef.current.close(); } catch {} handsRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false); setGestureDirection(null); setCountdownProgress(0);
    holdDirRef.current = null; holdStartRef.current = 0; triggeredRef.current = false;
  }, [videoRef]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      await loadMediaPipeScript();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      const HandsCtor = (window as any).Hands;
      const hands = new HandsCtor({ locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}` });
      hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.5 });
      const vel = videoRef.current!;
      let phx: number | null = null, phy: number | null = null, hs = 0;
      hands.onResults((r: any) => {
        if (!r.multiHandLandmarks?.length) {
          if (holdDirRef.current && holdStartRef.current > 0) { holdDirRef.current = null; holdStartRef.current = 0; triggeredRef.current = false; setGestureDirection(null); setCountdownProgress(0); }
          return;
        }
        const lm = r.multiHandLandmarks[0];
        const px = (lm[0].x + lm[9].x) / 2 * vel.videoWidth;
        const py = (lm[0].y + lm[9].y) / 2 * vel.videoHeight;
        if (hs < 30) {
          phx === null ? (phx = px, phy = py) : (phx = phx * 0.9 + px * 0.1, phy = phy! * 0.9 + py * 0.1);
          hs++; return;
        }
        const dir = mapGestureToDirection(px - (phx ?? px), py - (phy ?? py));
        const now = performance.now();
        if (!dir) { holdDirRef.current = null; holdStartRef.current = 0; triggeredRef.current = false; setGestureDirection(null); setCountdownProgress(0); }
        else if (dir === holdDirRef.current) {
          const e = now - holdStartRef.current;
          setCountdownProgress(Math.min(1, e / GESTURE_HOLD_DURATION));
          if (e >= GESTURE_HOLD_DURATION && !triggeredRef.current) { triggeredRef.current = true; onGestureSwipe(dir); holdDirRef.current = null; holdStartRef.current = 0; setGestureDirection(null); setCountdownProgress(0); setTimeout(() => { triggeredRef.current = false; hs = 0; phx = null; phy = null; }, 1000); }
        } else { holdDirRef.current = dir; holdStartRef.current = now; triggeredRef.current = false; setGestureDirection(dir); setCountdownProgress(0); }
      });
      handsRef.current = hands;
      setCameraActive(true);
      const loop = async () => { if (!videoRef.current || !handsRef.current) return; if (videoRef.current.readyState >= 2) await handsRef.current.send({ image: videoRef.current }); rafRef.current = requestAnimationFrame(loop); };
      vel.addEventListener('loadeddata', () => loop(), { once: true });
    } catch (e: any) {
      setCameraError(e.name === 'NotAllowedError' ? '摄像头权限被拒绝' : e.name === 'NotFoundError' ? '未检测到摄像头' : '摄像头不可用');
    }
  }, [videoRef, onGestureSwipe]);
  useEffect(() => () => stopCamera(), [stopCamera]);
  return { cameraActive, cameraError, gestureDirection, countdownProgress, startCamera, stopCamera };
}

// ==================== Main Component ====================
export function SwipeCardStack({ candidates, onSwipe }: SwipeCardStackProps) {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLCanvasElement>(null);

  const [queue, setQueue] = useState<SwipeCardCandidate[]>(candidates);
  const [exiting, setExiting] = useState<{ id: string; direction: SwipeDirection } | null>(null);
  const [returning, setReturning] = useState<{ id: string; direction: SwipeDirection } | null>(null);
  const [history, setHistory] = useState<Array<{ candidate: SwipeCardCandidate }>>([]);

  useEffect(() => { if (candidates.length > 0) setQueue(candidates); }, [candidates]);

  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;

  const handleSwipe = useCallback((direction: SwipeDirection, cardId: string) => {
    const card = queue.find(c => c.id === cardId);
    if (!card) return;
    setExiting({ id: cardId, direction });

    const cardEl = document.querySelector(`[data-card-id="${cardId}"]`);
    if (cardEl && particlesRef.current) {
      const cr = cardEl.getBoundingClientRect();
      const pr = particlesRef.current.getBoundingClientRect();
      spawnFirework(particlesRef.current, direction, cr.left + cr.width / 2 - pr.left, cr.top + cr.height / 2 - pr.top);
    }

    setTimeout(() => {
      setExiting(null);
      setQueue(prev => { const f = prev.filter(c => c.id !== cardId); return [...f, card]; });
      setHistory(prev => [...prev, { candidate: card }]);
      onSwipeRef.current?.(direction, card);
      setReturning({ id: cardId, direction });
      setTimeout(() => setReturning(null), 600);
    }, 350);
  }, [queue]);

  const handleUndo = useCallback(() => {
    if (!history.length || exiting) return;
    const last = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setQueue(prev => { const f = prev.filter(c => c.id !== last.candidate.id); return [last.candidate, ...f]; });
    setReturning({ id: last.candidate.id, direction: 'down' });
    setTimeout(() => setReturning(null), 600);
  }, [history, exiting]);

  // 滚轮切换方案
  const cycleNext = useCallback(() => {
    if (exiting || queue.length < 2) return;
    setQueue(prev => { const [first, ...rest] = prev; return [...rest, first]; });
  }, [exiting, queue]);
  const cyclePrev = useCallback(() => {
    if (exiting || queue.length < 2) return;
    setQueue(prev => { const last = prev[prev.length - 1]; return [last, ...prev.slice(0, -1)]; });
  }, [exiting, queue]);

  useEffect(() => {
    const h = (e: WheelEvent) => {
      if (!queue.length || exiting) return;
      e.preventDefault();
      if (e.deltaY > 0) cycleNext();
      else cyclePrev();
    };
    const el = containerRef.current;
    if (el) el.addEventListener('wheel', h, { passive: false });
    return () => { if (el) el.removeEventListener('wheel', h); };
  }, [queue, exiting, cycleNext, cyclePrev]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const gs = useCallback((d: SwipeDirection) => { if (queue.length && !exiting) handleSwipe(d, queue[0].id); }, [queue, exiting, handleSwipe]);
  const { cameraActive, cameraError, gestureDirection, countdownProgress, startCamera, stopCamera } = useCameraGesture(videoRef, gs, queue.length > 0 && !exiting);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (!queue.length || exiting) return; const m: Record<string, SwipeDirection> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }; if (m[e.key]) handleSwipe(m[e.key], queue[0].id); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [queue, exiting, handleSwipe]);

  const visibleCards = queue.slice(0, 4);
  const dirColors: Record<SwipeDirection, string> = { left: 'rose', right: 'emerald', up: 'violet', down: 'amber' };
  const dirHex: Record<SwipeDirection, string> = { left: '#f43f5e', right: '#10b981', up: '#8b5cf6', down: '#f59e0b' };
  const dirLabels: Record<SwipeDirection, string> = { left: '跳过', right: '采纳', up: '优先', down: '撤销' };
  const dirIcons: Record<SwipeDirection, typeof X> = { left: X, right: CheckCircle, up: Star, down: RotateCcw };
  const dirHint: Record<SwipeDirection, string> = { left: '左滑 · ←', right: '右滑 · → + 揭晓动画', up: '上滑 · ↑', down: '下滑 · ↓' };

  return (
    <div data-testid="swipe-card-stack" role="region" aria-label="方案卡片" className="relative mx-auto flex w-full max-w-3xl flex-col items-center">
      {/* Camera */}
      <div className="relative mb-6 flex w-full items-center justify-center">
        {!cameraActive && !cameraError && (
          <button onClick={startCamera} disabled={!queue.length || !!exiting} className="glass-btn glass-btn-indigo flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-600">
            <Camera className="h-3.5 w-3.5" /><span>手势控制</span>
          </button>
        )}
        {cameraActive && (
          <div className="relative overflow-hidden rounded-xl border border-white/40 shadow-lg">
            <video ref={videoRef} autoPlay playsInline muted className="h-24 w-32 object-cover" />
            {gestureDirection && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
                {gestureDirection === 'left' && <ChevronLeft className="h-8 w-8 text-rose-400" />}
                {gestureDirection === 'right' && <ChevronRight className="h-8 w-8 text-emerald-400" />}
                {gestureDirection === 'up' && <ChevronUp className="h-8 w-8 text-indigo-400" />}
                {gestureDirection === 'down' && <ChevronDown className="h-8 w-8 text-amber-400" />}
              </div>
            )}
            {countdownProgress > 0 && (
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke={gestureDirection === 'left' ? '#f43f5e' : gestureDirection === 'right' ? '#10b981' : gestureDirection === 'up' ? '#6366f1' : '#f59e0b'} strokeWidth="3" strokeDasharray={`${countdownProgress * 276.5} 276.5`} strokeLinecap="round" transform="rotate(-90 50 50)" opacity={0.8} />
              </svg>
            )}
            <button onClick={stopCamera} className="absolute right-1 top-1 rounded-full bg-black/40 p-1 text-white hover:bg-black/60" aria-label="关闭手势"><CameraOff className="h-3 w-3" /></button>
          </div>
        )}
        {cameraError && <span className="text-xs text-slate-400">{cameraError}</span>}
      </div>

      {/* Gallery stage */}
      <div ref={containerRef} className="relative flex h-[480px] w-full items-center justify-center overflow-hidden" style={{ perspective: '1400px' }}>
        <canvas ref={particlesRef} className="pointer-events-none absolute inset-0 z-50" style={{ width: '100%', height: '100%' }} />

        {/* Ambient light spots */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-indigo-200/15 via-purple-200/10 to-pink-200/10 blur-3xl" />

        {!visibleCards.length ? (
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <Sparkles className="h-8 w-8 opacity-40" />
            <p className="text-sm">等待方案加载...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {visibleCards.map((card, idx) => {
              const isCenter = idx === 0;
              const isExiting = exiting?.id === card.id;
              const isReturning = returning?.id === card.id;
              return (
                <GalleryCard
                  key={card.id}
                  candidate={card}
                  index={idx}
                  isCenter={isCenter}
                  isExiting={isExiting}
                  isReturning={isReturning}
                  exitDir={exiting?.direction ?? null}
                  returnDir={returning?.direction ?? null}
                  reduced={reduced}
                  onSwipe={handleSwipe}
                  containerRef={containerRef}
                  blocked={!!exiting}
                />
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Action buttons with color labels */}
      <div className="mt-5 flex flex-col items-center gap-3">
        {/* 四色方向提示 */}
        <div className="flex gap-4 text-[10px]">
          <span className="flex items-center gap-1 text-rose-500"><span className="inline-block h-2 w-2 rounded-full bg-rose-500" />左·跳过</span>
          <span className="flex items-center gap-1 text-emerald-500"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />右·采纳</span>
          <span className="flex items-center gap-1 text-violet-500"><span className="inline-block h-2 w-2 rounded-full bg-violet-500" />上·优先</span>
          <span className="flex items-center gap-1 text-amber-500"><span className="inline-block h-2 w-2 rounded-full bg-amber-500" />下·撤销</span>
        </div>

        <div className="flex items-center gap-3">
        <button data-testid="action-undo" aria-label="撤销" onClick={handleUndo} disabled={!history.length || !!exiting} className="glass-btn glass-btn-amber p-2.5 text-amber-500">
          <RotateCcw className="h-5 w-5" />
        </button>
        {(['left', 'up', 'right'] as SwipeDirection[]).map(dir => {
          const Icon = dirIcons[dir];
          const colorClass = `glass-btn-${dirColors[dir]}`;
          const textClass = `text-${dirColors[dir]}-500`;
          return (
            <button key={dir} data-testid={`action-${dir === 'left' ? 'pass' : dir === 'right' ? 'like' : 'super'}`} aria-label={`${dirLabels[dir]}：${dirHint[dir]}`}
              onClick={() => { if (visibleCards[0]) handleSwipe(dir, visibleCards[0].id); }}
              disabled={!visibleCards.length || !!exiting}
              title={dirHint[dir]}
              className={`glass-btn ${colorClass} p-3 ${textClass}`}>
              <Icon className="h-6 w-6" />
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
}

// ==================== Gallery Card ====================
interface GalleryCardProps {
  candidate: SwipeCardCandidate;
  index: number;
  isCenter: boolean;
  isExiting: boolean;
  isReturning: boolean;
  exitDir: SwipeDirection | null;
  returnDir: SwipeDirection | null;
  reduced: boolean;
  onSwipe: (d: SwipeDirection, id: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  blocked: boolean;
}

function GalleryCard({ candidate, index, isCenter, isExiting, isReturning, exitDir, returnDir, reduced, onSwipe, containerRef, blocked }: GalleryCardProps) {
  const [localTilt, setLocalTilt] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState(false);

  // Arc fan-out positions
  const arcPosition = useMemo(() => {
    if (isCenter) return { x: 0, y: 0, rotate: 0, scale: 1, zIndex: 20, hoverScale: 1.08, hoverY: -10 };
    const dir = index % 2 === 0 ? 1 : -1;
    const dist = Math.ceil(index / 2);
    const x = dir * (dist * 190);
    const y = dist * 28;
    const rot = dir * (8 + dist * 3);
    return { x, y, rotate: rot, scale: 0.8 - dist * 0.05, zIndex: 10 - dist, hoverScale: 0.85 - dist * 0.03, hoverY: -6 - dist * 2 };
  }, [isCenter, index]);

  // Mouse parallax → tilt facing cursor
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || reduced) return;
    const r = containerRef.current.getBoundingClientRect();
    const relX = (e.clientX - r.left) / r.width;
    const relY = (e.clientY - r.top) / r.height;
    setLocalTilt({
      x: (relY - 0.5) * -MAX_TILT_DEG * 2,
      y: (relX - 0.5) * MAX_TILT_DEG * 2,
    });
  }, [containerRef, reduced]);

  // Physics drag: velocity-based exit
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (reduced || !isCenter || blocked) return;
    const d = determineDirection(info.offset.x, info.offset.y, info.velocity.x, info.velocity.y);
    if (d) onSwipe(d, candidate.id);
  }, [reduced, isCenter, blocked, onSwipe, candidate.id]);

  // Exit target with speed proportional to velocity
  const exitTarget = useMemo(() => {
    if (!exitDir) return undefined;
    const m: Record<SwipeDirection, { x: number; y: number; rotate: number; scale: number }> = {
      left: { x: -FLY_DISTANCE, y: -80, rotate: -30, scale: 0.6 },
      right: { x: FLY_DISTANCE, y: -80, rotate: 30, scale: 0.6 },
      up: { x: 0, y: -FLY_DISTANCE, rotate: -5, scale: 0.7 },
      down: { x: 0, y: FLY_DISTANCE, rotate: 5, scale: 0.7 },
    };
    return { ...m[exitDir], opacity: 0 };
  }, [exitDir]);

  const returnInit = useMemo(() => {
    if (!returnDir) return undefined;
    const m: Record<SwipeDirection, { x: number; y: number; rotate: number; scale: number }> = {
      left: { x: -FLY_DISTANCE, y: -80, rotate: -30, scale: 0.6 },
      right: { x: FLY_DISTANCE, y: -80, rotate: 30, scale: 0.6 },
      up: { x: 0, y: -FLY_DISTANCE, rotate: -5, scale: 0.7 },
      down: { x: 0, y: FLY_DISTANCE, rotate: 5, scale: 0.7 },
    };
    return { ...m[returnDir], opacity: 0 };
  }, [returnDir]);

  const dirIcons: Record<SwipeDirection, typeof ArrowLeft> = { left: ArrowLeft, right: ArrowRight, up: ArrowUp, down: ArrowDown };
  const dirGlow: Record<SwipeDirection, string> = { left: 'rgba(244,63,94,0.35)', right: 'rgba(16,185,129,0.35)', up: 'rgba(139,92,246,0.35)', down: 'rgba(245,158,11,0.35)' };
  const dirLabels: Record<SwipeDirection, string> = { left: '跳过', right: '采纳', up: '优先', down: '撤销' };

  const currentScale = isExiting ? (exitTarget?.scale ?? 1) : isReturning ? (returnInit?.scale ?? 1) : (hover ? arcPosition.hoverScale : arcPosition.scale);
  const currentYOffset = hover ? arcPosition.hoverY : 0;

  return (
    <motion.div
      data-testid="swipe-card"
      data-card-id={candidate.id}
      aria-label={`${candidate.name}，${candidate.campus}，适配指数${candidate.score}`}
      className="absolute flex flex-col select-none"
      style={{
        width: isCenter ? 320 : 240,
        transformStyle: 'preserve-3d',
        zIndex: isCenter && hover ? 30 : arcPosition.zIndex,
      }}
      initial={{ x: arcPosition.x, y: arcPosition.y + 60, rotate: arcPosition.rotate, scale: arcPosition.scale, opacity: 0 }}
      animate={
        isExiting ? exitTarget
        : isReturning ? { x: arcPosition.x, y: arcPosition.y, rotate: arcPosition.rotate, scale: arcPosition.scale, opacity: 1 }
        : { x: arcPosition.x, y: arcPosition.y + currentYOffset, rotate: arcPosition.rotate, scale: currentScale, opacity: 1 }
      }
      exit={isExiting ? exitTarget : undefined}
      transition={
        isExiting
          ? { type: 'spring', stiffness: 180, damping: 22, mass: 0.8 }
          : isReturning
            ? { type: 'spring', stiffness: 300, damping: 25, mass: 0.7 }
            : { type: 'spring', stiffness: 280, damping: 23, mass: 0.5 }
      }
      // Drag physics with momentum
      drag={isCenter && !blocked && !reduced}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={DRAG_ELASTIC}
      dragMomentum={true}
      dragTransition={{ bounceStiffness: 380, bounceDamping: 18, power: 0.15 }}
      onDragEnd={isCenter ? handleDragEnd : undefined}
      onMouseMove={isCenter ? handleMouseMove : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setLocalTilt({ x: 0, y: 0 }); }}
    >
      {/* Card body with 3D depth */}
      <div className="relative overflow-hidden rounded-2xl">
        {/* Depth layers */}
        <div className="absolute -inset-[3px] rounded-2xl bg-gradient-to-b from-white/70 via-white/30 to-white/5 translate-y-1.5 -z-10 transition-transform duration-200" />
        <div className="absolute -inset-[1px] rounded-2xl bg-white/25 translate-y-0.5 -z-10 transition-transform duration-200" />

        {/* Main glass pane */}
        <div
          className={`relative rounded-2xl p-5 backdrop-blur-xl ring-1 ring-black/5 transition-shadow duration-300
            ${isCenter ? 'glass' : 'glass-light'}
            ${hover ? 'shadow-2xl shadow-black/10' : 'shadow-lg'}`}
          style={isCenter && !blocked ? {
            transform: `rotateX(${localTilt.x}deg) rotateY(${localTilt.y}deg)`,
            transition: hover ? 'transform 0.12s ease-out, box-shadow 0.25s ease' : 'transform 0.3s ease-out, box-shadow 0.3s ease',
          } : undefined}
        >
          {/* Edge iridescence */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-400/10 via-transparent to-rose-400/10" />
          {/* Light sweep */}
          <motion.div
            className="pointer-events-none absolute -inset-24 rounded-2xl bg-gradient-to-r from-transparent via-white/12 to-transparent"
            animate={{ x: ['-120%', '120%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
          />

          {/* Direction overlay while exiting */}
          {isExiting && exitDir && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl" style={{ background: dirGlow[exitDir] }}>
              <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/60 p-5 backdrop-blur-md">
                {(() => { const I = dirIcons[exitDir]; return <I className="h-12 w-12" />; })()}
                <span className="text-base font-bold">{dirLabels[exitDir]}</span>
              </div>
            </div>
          )}

          {/* Card content */}
          {isCenter ? (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{candidate.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{candidate.campus} · {candidate.academy}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="rounded-full bg-slate-100/70 px-3 py-1 text-xs font-semibold text-slate-700">{candidate.grade}</span>
                  {candidate.mbti && <span className="rounded-full bg-indigo-50/70 px-2.5 py-0.5 text-[10px] font-medium text-indigo-500">{candidate.mbti}</span>}
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">{candidate.intro}</p>
              {candidate.hobbies.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {candidate.hobbies.slice(0, 4).map(h => (
                    <span key={h} className="rounded-full bg-white/60 border border-white/40 px-2.5 py-0.5 text-[11px] text-slate-600">{h}</span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center justify-between border-t border-white/30 pt-3">
                <span className="text-xs text-slate-400">适配指数</span>
                <div className="flex items-center gap-2">
                  <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="url(#scoreGrad)" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${(candidate.score / 100) * 88} 88`} />
                    <defs><linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#a855f7" /></linearGradient></defs>
                  </svg>
                  <span className="font-mono text-lg font-bold text-indigo-600">{candidate.score}</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold text-slate-800">{candidate.name}</h3>
              <p className="mt-0.5 text-[11px] text-slate-400">{candidate.campus}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500 line-clamp-2">{candidate.intro}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">适配</span>
                <span className="font-mono text-sm font-bold text-indigo-500">{candidate.score}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Glow ring */}
      {isCenter && (
        <motion.div className="pointer-events-none absolute -inset-5 -z-20 rounded-[30px]"
          style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.12) 0%, transparent 70%)' }}
          animate={{ opacity: [0.15, 0.35, 0.15], scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
      )}
    </motion.div>
  );
}

export default SwipeCardStack;