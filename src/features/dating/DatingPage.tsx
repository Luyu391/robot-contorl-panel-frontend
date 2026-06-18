import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SwipeCardStack } from './SwipeCardStack';
import MatchRevealAnimation from './MatchRevealAnimation';
import { Skeleton } from '../../components/Skeleton';
import type { SwipeCardCandidate, SwipeDirection, MatchRevealPayload } from '../../types';

const FALLBACK_CANDIDATES: SwipeCardCandidate[] = [
  { id: 'c1', name: '精密抓取方案', campus: 'A3实验室', academy: '装配组', grade: '高优先级', intro: '适用于精密零件的抓取与放置操作。', hobbies: ['precision', 'assembly'], score: 86, mbti: 'ISTJ' },
  { id: 'c2', name: '快速分拣方案', campus: 'B1实验室', academy: '物流组', grade: '中优先级', intro: '适用于流水线快速分拣场景。', hobbies: ['sorting', 'speed'], score: 81, mbti: 'ESTP' },
  { id: 'c3', name: '柔性操作方案', campus: 'C2实验室', academy: '研发组', grade: '高优先级', intro: '适用于不规则物体的柔性夹取。', hobbies: ['flexible', 'research'], score: 78, mbti: 'INFP' },
  { id: 'c4', name: '协作搬运方案', campus: 'A1实验室', academy: '产线组', grade: '低优先级', intro: '适用于双臂协作重物搬运。', hobbies: ['collaboration', 'heavy'], score: 83, mbti: 'ENTJ' },
  { id: 'c5', name: '检测探针方案', campus: 'D1实验室', academy: '质检组', grade: '中优先级', intro: '适用于表面质量检测与探针扫描。', hobbies: ['inspection', 'scanning'], score: 75, mbti: 'INTJ' },
];

function CardSkeleton() {
  return (
    <div className="mx-auto w-[320px] rounded-2xl glass p-6 shadow-lg" role="status" aria-label="方案卡片加载中">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton width={100} height={24} rounded="md" />
          <Skeleton width={140} height={12} rounded="sm" />
        </div>
        <Skeleton width={56} height={22} rounded="full" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton width="100%" height={14} rounded="sm" />
        <Skeleton width="80%" height={14} rounded="sm" />
      </div>
      <div className="mt-3 flex gap-2">
        <Skeleton width={60} height={22} rounded="full" />
        <Skeleton width={60} height={22} rounded="full" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Skeleton width={48} height={12} rounded="sm" />
        <Skeleton width={32} height={20} rounded="sm" />
      </div>
    </div>
  );
}

export function DatingPage() {
  const [candidates, setCandidates] = useState<SwipeCardCandidate[]>([]);
  const [revealPayload, setRevealPayload] = useState<MatchRevealPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [history, setHistory] = useState<Array<{ direction: SwipeDirection; candidate: SwipeCardCandidate }>>([]);
  const [showUndo, setShowUndo] = useState(false);
  const particlesRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    fetch('/api/dating/profiles?limit=12', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.candidates?.length) {
          setCandidates(data.candidates);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCandidates(FALLBACK_CANDIDATES);
          setOffline(true);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; controller.abort(); };
  }, []);

  const handleSwipe = useCallback((direction: SwipeDirection, candidate: SwipeCardCandidate) => {
    if (direction === 'down') return;
    setHistory((prev) => [...prev, { direction, candidate }]);
    setShowUndo(true);
    setTimeout(() => setShowUndo(false), 3000);

    // 只有右滑（采纳）才触发揭晓动画和粒子爆发
    if (direction === 'right') {
      setRevealPayload({
        matchId: `match-${candidate.id}-${Date.now()}`,
        selfName: '当前任务',
        partnerName: candidate.name,
        score: candidate.score,
        highlights: ['操作参数匹配', '执行环境兼容', '精度要求吻合'],
      });
      triggerParticles();
    }

    // 后台发送请求
    fetch('/api/dating/swipe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidate.id, direction }),
    }).catch(() => {});
  }, []);

  const handleRevealComplete = useCallback((_skipped: boolean) => {
    setRevealPayload(null);
  }, []);

  const triggerParticles = useCallback(() => {
    const canvas = particlesRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; hue: number }> = [];
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      particles.push({ x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1, life: 0, maxLife: 30 + Math.random() * 25, size: 2 + Math.random() * 3, hue: 220 + Math.random() * 30 });
    }

    let frame = 0;
    const maxFrames = 60;
    const animate = () => {
      if (frame >= maxFrames) { ctx.clearRect(0, 0, rect.width, rect.height); return; }
      ctx.clearRect(0, 0, rect.width, rect.height);
      for (const p of particles) {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06;
        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        glow.addColorStop(0, `hsla(${p.hue}, 80%, 70%, ${alpha})`);
        glow.addColorStop(1, `hsla(${p.hue}, 60%, 50%, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 30%, 95%, ${alpha})`;
        ctx.fill();
      }
      frame++;
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, []);

  return (
    <section className="space-y-5 pt-2">
      <div>
        <p className="text-xs tracking-[0.4em] text-white/40">OPENCLAW</p>
        <h1 className="mt-2 text-3xl font-bold text-white glow-text">方案推荐</h1>
        <p className="mt-2 max-w-lg text-sm leading-6 text-white/50">
          左滑跳过 · 右滑采纳并播放揭晓动画 · 上滑优先 · 下滑撤销 · 滚轮浏览方案
        </p>
      </div>

      {offline && (
        <div className="relative overflow-hidden rounded-2xl glass p-4">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
          <div className="flex items-center gap-2">
            <span className="text-amber-400">⚠</span>
            <span className="text-sm text-amber-200">离线模式 — 使用本地方案数据</span>
          </div>
        </div>
      )}

      <div className="relative">
        {loading ? (
          <div className="flex h-[420px] items-center justify-center">
            <CardSkeleton />
          </div>
        ) : (
          <SwipeCardStack candidates={candidates} onSwipe={handleSwipe} />
        )}

        <canvas ref={particlesRef} className="pointer-events-none absolute inset-0 z-30" style={{ width: '100%', height: '100%' }} />
      </div>

      <AnimatePresence>
        {showUndo && history.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="text-center text-xs text-white/40">
            下滑可撤销 · 已浏览 {history.length} 个方案
          </motion.div>
        )}
      </AnimatePresence>

      {revealPayload && (
        <MatchRevealAnimation payload={revealPayload} onComplete={handleRevealComplete} />
      )}
    </section>
  );
}

export default DatingPage;