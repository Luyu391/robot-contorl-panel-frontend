import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  color: 'cyan' | 'magenta';
  flickerTimer: number;
  flickering: boolean;
}

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const particles: Particle[] = [];
    const COUNT = 35;
    const LINK_DIST = 150;
    const GRID_SIZE = 60;
    const SCAN_LINE_COUNT = 3;

    let time = 0;
    let scanLines = Array.from({ length: SCAN_LINE_COUNT }, (_, i) => ({
      y: (canvas.height / SCAN_LINE_COUNT) * i,
      speed: 0.3 + Math.random() * 0.4,
    }));

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      scanLines = Array.from({ length: SCAN_LINE_COUNT }, (_, i) => ({
        y: (canvas.height / SCAN_LINE_COUNT) * i,
        speed: 0.3 + Math.random() * 0.4,
      }));
    };
    resize();
    window.addEventListener('resize', resize);

    const CYAN = { r: 0, g: 255, b: 255 };
    const MAGENTA = { r: 255, g: 0, b: 255 };

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2.5 + 0.5,
        alpha: Math.random() * 0.15 + 0.03,
        color: Math.random() > 0.5 ? 'cyan' : 'magenta',
        flickerTimer: Math.random() * 500,
        flickering: false,
      });
    }

    const drawHexagon = (cx: number, cy: number, r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    const drawGrid = () => {
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.03)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < canvas.width; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    };

    const drawScanLines = () => {
      for (const sl of scanLines) {
        sl.y += sl.speed;
        if (sl.y > canvas.height) sl.y = -2;

        const grad = ctx.createLinearGradient(0, sl.y - 1, 0, sl.y + 1);
        grad.addColorStop(0, 'rgba(0, 255, 255, 0)');
        grad.addColorStop(0.5, 'rgba(0, 255, 255, 0.08)');
        grad.addColorStop(1, 'rgba(0, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, sl.y - 20, canvas.width, 40);
      }
    };

    const draw = () => {
      time++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 背景网格纹理
      drawGrid();

      // 扫描线
      drawScanLines();

      // 更新与绘制粒子
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // 闪烁逻辑
        p.flickerTimer--;
        if (p.flickerTimer <= 0) {
          if (!p.flickering) {
            p.flickering = true;
            p.flickerTimer = 8 + Math.floor(Math.random() * 8);
          } else {
            p.flickering = false;
            p.flickerTimer = 200 + Math.floor(Math.random() * 400);
          }
        }

        const rgb = p.color === 'cyan' ? CYAN : MAGENTA;
        const baseAlpha = p.flickering ? Math.min(p.alpha * 4, 0.8) : p.alpha;
        const glowSize = p.flickering ? 12 : 6;

        ctx.save();
        ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;
        ctx.shadowBlur = glowSize;

        drawHexagon(p.x, p.y, p.r);
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baseAlpha})`;
        ctx.fill();
        ctx.restore();
      }

      // 连线
      const pulse = Math.sin(time * 0.02) * 0.02;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            const lineAlpha = (0.08 + pulse) * (1 - dist / LINK_DIST);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 255, 255, ${Math.max(0, lineAlpha)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!mq.matches) {
      draw();
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0.7 }}
    />
  );
}
