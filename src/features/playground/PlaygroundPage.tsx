import { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useNavigate } from 'react-router-dom';
import { Maximize2, Terminal, Info } from 'lucide-react';
import { RobotArm, createScene, setupLighting, setupGround } from './robotArm3D';
import { SystemLog, type LogEntry } from './SystemLog';

export function PlaygroundPage() {
  const navigate = useNavigate();

  // ─── 日志 ───
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [logExpanded, setLogExpanded] = useState(false);
  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogEntries((prev) => [
      ...prev.slice(-99),
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: new Date(), type, message },
    ]);
  }, []);

  // ─── 3D Refs ───
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const armRef = useRef<RobotArm | null>(null);
  const afRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [jointDegrees, setJointDegrees] = useState<number[]>([0, 0, 0, 0, 0]);
  const [modelLoaded, setModelLoaded] = useState(false);

  // ─── 初始化迷你3D场景 ───
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;

    const { scene, camera, renderer } = createScene(canvas, w, h);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.2, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.0;
    controls.maxDistance = 6;
    controls.maxPolarAngle = Math.PI / 2;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.update();

    const tl = new THREE.TextureLoader();
    setupLighting(scene, tl);
    setupGround(scene);

    const arm = new RobotArm(scene);
    armRef.current = arm;
    arm.loadModel().then(() => {
      setModelLoaded(true);
      addLog('success', 'GLB模型加载完成');
    });

    addLog('info', '3D预览场景初始化完成');

    const animate = () => {
      afRef.current = requestAnimationFrame(animate);
      controls.update();
      if (arm.model) setJointDegrees(arm.getJointDegrees());
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const pw = container.clientWidth;
      const ph = container.clientHeight;
      if (!pw || !ph) return;
      renderer.setSize(pw, ph);
      camera.aspect = pw / ph;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(afRef.current);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      arm.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) { o.geometry?.dispose(); (o.material as THREE.Material)?.dispose?.(); }
      });
    };
  }, []);

  const jointLabels = ['J1 底座', 'J2 肩部', 'J3 肘部1', 'J4 肘部2', 'J5 腕部'];

  return (
    <section className="space-y-4 pt-2">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.4em] text-white/40 uppercase">OpenCLaw · Industrial Robot</p>
          <h1 className="mt-2 text-3xl font-bold text-white">3D 操控台</h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-white/50">
            GLB高精模型 · GSAP动画引擎 · 参考 robot-arm-sim 架构
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLogExpanded((v) => !v)}
            className={`glass-btn px-3 py-2 text-sm font-medium ${logExpanded ? 'glass-btn-indigo text-indigo-300' : 'text-white/50'}`}
          >
            <Terminal className="mr-1 inline h-3.5 w-3.5" />
            日志
            {logEntries.length > 0 && ` (${logEntries.length})`}
          </button>
        </div>
      </div>

      {/* 3D 迷你预览 */}
      <div className="relative overflow-hidden rounded-2xl glass shadow-lg" style={{ height: '380px' }}>
        <div ref={containerRef} className="h-full w-full">
          <canvas ref={canvasRef} className="block h-full w-full" />
        </div>

        {/* 进入实操按钮 */}
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none">
          <button
            onClick={() => navigate('/operation')}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-indigo-500/200/90 px-8 py-4 text-white shadow-2xl backdrop-blur-sm transition-all hover:bg-indigo-600 hover:scale-105 hover:shadow-indigo-500/30 active:scale-95"
          >
            <Maximize2 className="h-5 w-5" />
            <div className="text-left">
              <p className="text-base font-bold">进入实操</p>
              <p className="text-xs text-indigo-200">关节控制 · 预设动作 · 轨迹可视化</p>
            </div>
          </button>
        </div>

        {/* 模型加载提示 */}
        {!modelLoaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/[0.06] backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <p className="text-sm text-white/50">加载模型中...</p>
            </div>
          </div>
        )}
      </div>

      {/* 关节角度实时显示 */}
      <div className="rounded-2xl glass p-4 shadow-lg">
        <h3 className="mb-3 text-sm font-semibold text-white/80">实时关节角度 (°)</h3>
        <div className="grid grid-cols-5 gap-2">
          {jointDegrees.map((v, i) => (
            <div key={i} className="rounded-xl bg-white/[0.06] px-2 py-2 text-center">
              <p className="text-[10px] text-white/40">{jointLabels[i]}</p>
              <p className="font-mono text-sm font-bold text-white/80">{v.toFixed(1)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 功能特性介绍 */}
      <div className="rounded-2xl glass p-5 shadow-lg">
        <div className="mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-indigo-300" />
          <h3 className="text-sm font-semibold text-white/80">实操功能</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs text-white/50">
          {[
            { title: '关节控制', desc: '5轴关节独立滑块调节', icon: '🎮' },
            { title: '预设动作', desc: '内置抓取&放置、示例动作', icon: '🎬' },
            { title: '视角切换', desc: '默认/前视/俯视/侧视', icon: '📷' },
            { title: '轨迹可视化', desc: '实时显示末端执行器路径', icon: '📍' },
            { title: '文件上传', desc: '支持自定义JSON动作序列', icon: '📁' },
            { title: '系统日志', desc: '可开关的实时操作日志', icon: '📋' },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-2 rounded-lg bg-white/[0.06] p-3">
              <span className="text-base">{f.icon}</span>
              <div>
                <p className="font-medium text-white/80">{f.title}</p>
                <p className="text-[10px] text-white/40">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 技术栈 */}
      <div className="rounded-2xl glass p-4 shadow-lg">
        <h3 className="mb-2 text-sm font-semibold text-white/80">技术栈</h3>
        <div className="flex flex-wrap gap-2 text-[10px]">
          {['Three.js', 'GSAP', 'GLTF', 'React', 'TypeScript', 'OrbitControls', 'PBR'].map((t) => (
            <span key={t} className="rounded-full bg-indigo-500/20 px-2.5 py-1 font-medium text-indigo-300">{t}</span>
          ))}
        </div>
      </div>

      {/* 系统日志 */}
      <SystemLog
        entries={logEntries}
        expanded={logExpanded}
        onToggle={() => setLogExpanded((v) => !v)}
        onClear={() => { setLogEntries([]); addLog('debug', '日志已清空'); }}
      />
    </section>
  );
}

export default PlaygroundPage;