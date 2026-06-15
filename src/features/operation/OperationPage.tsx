import { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import {
  ArrowLeft, Play, Pause, Square, RotateCcw, Eye, EyeOff,
  Camera, Grip, Maximize2, Minimize2,
} from 'lucide-react';
import {
  RobotArm, createScene, setupLighting, setupGround,
  JOINT_NAMES, type JointConfig,
} from '../playground/robotArm3D';
import { SystemLog, type LogEntry } from '../playground/SystemLog';

// ==================== 类型定义 ====================
type ViewMode = 'default' | 'front' | 'top' | 'side';

// ==================== 场景配置 ====================
const SCENE_CONFIG: Record<ViewMode, { pos: readonly [number, number, number]; target: readonly [number, number, number] }> = {
  default: { pos: [1.82, 2.19, -1.57], target: [0, 1.2, 0] },
  front: { pos: [0, 1.5, 5], target: [0, 1.2, 0] },
  top: { pos: [0, 10, 0.0001], target: [0, 1.2, 0] },
  side: { pos: [5, 1.5, 0], target: [0, 1.2, 0] },
};

// ==================== 预设动作 ====================
interface PresetAction {
  key: string;
  label: string;
  path: string;
}

const PRESET_ACTIONS: PresetAction[] = [
  { key: 'pick_and_place', label: '抓取&放置', path: '/actions/pick_and_place.json' },
  { key: 'demo_action', label: '示例动作', path: '/actions/demo_action.json' },
];

// ==================== 页面 ====================
export function OperationPage() {
  const navigate = useNavigate();

  // ─── 日志 ───
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [logExpanded, setLogExpanded] = useState(true);
  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogEntries((prev) => [
      ...prev.slice(-199),
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: new Date(), type, message },
    ]);
  }, []);

  // ─── 3D Refs ───
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const camRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const ctrlRef = useRef<OrbitControls | null>(null);
  const armRef = useRef<RobotArm | null>(null);
  const afRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // ─── 状态 ───
  const [jointConfigs, setJointConfigs] = useState<JointConfig[]>([]);
  const [gripperConfigs, setGripperConfigs] = useState<JointConfig[]>([]);
  const [gripperOpenness, setGripperOpenness] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('default');
  const [axisHelper, setAxisHelper] = useState(false);
  const [trajectoryVisible, setTrajectoryVisible] = useState(false);
  const [controlPanelOpen, setControlPanelOpen] = useState(true);

  // ─── 动画状态 ───
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [actionProgress, setActionProgress] = useState(0);
  const [currentFrameId, setCurrentFrameId] = useState(0);
  const [gripperState, setGripperState] = useState(false);
  const [selectedAction, setSelectedAction] = useState('pick_and_place');
  const [loadedSequence, setLoadedSequence] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState(false);
  const isDraggingRef = useRef(false);
  const [jointDegrees, setJointDegrees] = useState<number[]>([0, 0, 0, 0, 0]);

  // ─── 模型外观 ───
  const [modelColor, setModelColor] = useState('#6366f1');
  const [modelMetalness, setModelMetalness] = useState(0.3);
  const [modelRoughness, setModelRoughness] = useState(0.5);
  const [modelWireframe, setModelWireframe] = useState(false);
  const [modelOpacity, setModelOpacity] = useState(1.0);

  // ─── 安全系统 ───
  const [safetyEnabled, setSafetyEnabled] = useState(true);
  const [safetyStatus, setSafetyStatus] = useState<{ isSafe: boolean; warnings: string[] }>({ isSafe: true, warnings: [] });

  // ─── 初始化 3D 场景 ───
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;

    const { scene, camera, renderer } = createScene(canvas, w, h);
    sceneRef.current = scene;
    camRef.current = camera;
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...SCENE_CONFIG.default.target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.8;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 2;
    controls.update();
    ctrlRef.current = controls;

    const tl = new THREE.TextureLoader();
    setupLighting(scene, tl);
    setupGround(scene);

    const arm = new RobotArm(scene);
    armRef.current = arm;
    arm.loadModel().then(() => {
      setJointConfigs(arm.getJointConfigs());
      setGripperConfigs(arm.getGripperConfigs());
      applyModelAppearance(modelColor, modelMetalness, modelRoughness, modelWireframe, modelOpacity);
      arm.saveSafeSnapshot();
      addLog('success', 'GLB模型加载完成 · 机械臂初始化成功');
    });

    // 安全回调
    arm.onSafetyWarning = (msg) => addLog('warning', msg);
    arm.onSafetyViolation = (jointName, req, clamped) => {
      setJointConfigs(arm.getJointConfigs());
      setSafetyStatus(arm.getSafetyStatus());
    };

    addLog('info', '3D仿真场景初始化完成');

    const animate = () => {
      afRef.current = requestAnimationFrame(animate);
      controls.update();
      if (arm.model) {
        setJointDegrees(arm.getJointDegrees());
      }
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
        if (o instanceof THREE.Mesh) { o.geometry?.dispose(); const m = o.material as THREE.Material; m?.dispose?.(); }
      });
    };
  }, []);

  // ─── 视角切换 ───
  const switchView = useCallback((mode: ViewMode) => {
    const cam = camRef.current;
    const ctrl = ctrlRef.current;
    if (!cam || !ctrl) return;
    const cfg = SCENE_CONFIG[mode];
    const pos = new THREE.Vector3(...cfg.pos);
    const target = new THREE.Vector3(...cfg.target);

    gsap.killTweensOf(cam.position);
    gsap.killTweensOf(ctrl.target);
    ctrl.enabled = false;
    gsap.to(cam.position, { x: pos.x, y: pos.y, z: pos.z, duration: 1, ease: 'power2.inOut' });
    gsap.to(ctrl.target, { x: target.x, y: target.y, z: target.z, duration: 1, ease: 'power2.inOut', onComplete: () => { ctrl.enabled = true; } });
    setViewMode(mode);
    addLog('debug', `视角切换: ${mode}`);
  }, []);

  // ─── 关节手动控制 ───
  const setJoint = useCallback((name: string, deg: number) => {
    if (isPlaying) return;
    armRef.current?.setJointAngleSafe(name, deg);
    setJointConfigs(armRef.current?.getJointConfigs() ?? []);
    setSafetyStatus(armRef.current?.getSafetyStatus() ?? { isSafe: true, warnings: [] });
  }, [isPlaying]);

  const setGripper = useCallback((name: string, deg: number) => {
    if (isPlaying) return;
    armRef.current?.setGripperAngle(name, deg);
    setGripperConfigs(armRef.current?.getGripperConfigs() ?? []);
  }, [isPlaying]);

  const setGripperOpen = useCallback((v: number) => {
    if (isPlaying) return;
    setGripperOpenness(v);
    armRef.current?.setGripperOpenness(v);
    setGripperConfigs(armRef.current?.getGripperConfigs() ?? []);
  }, [isPlaying]);

  // ─── 轴辅助 ───
  const toggleAxis = useCallback(() => {
    const v = !axisHelper;
    setAxisHelper(v);
    const arm = armRef.current;
    if (!arm?.model) return;
    arm.model.traverse((child) => {
      if (child instanceof THREE.AxesHelper) child.visible = v;
    });
  }, [axisHelper]);

  // ─── 轨迹 ───
  const toggleTrajectory = useCallback(() => {
    const v = !trajectoryVisible;
    setTrajectoryVisible(v);
    armRef.current?.showTrajectory(v);
  }, [trajectoryVisible]);

  // ─── 模型外观 ───
  const applyModelAppearance = useCallback((color: string, metalness: number, roughness: number, wireframe: boolean, opacity: number) => {
    const arm = armRef.current;
    if (!arm?.model) return;
    arm.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((m) => {
          if (m instanceof THREE.MeshStandardMaterial) {
            m.color.set(color);
            m.metalness = metalness;
            m.roughness = roughness;
            m.wireframe = wireframe;
            m.opacity = opacity;
            m.transparent = opacity < 1.0;
            m.needsUpdate = true;
          }
        });
      }
    });
  }, []);

  const handleColorChange = useCallback((c: string) => {
    setModelColor(c);
    applyModelAppearance(c, modelMetalness, modelRoughness, modelWireframe, modelOpacity);
  }, [modelMetalness, modelRoughness, modelWireframe, modelOpacity, applyModelAppearance]);

  const handleMetalnessChange = useCallback((v: number) => {
    setModelMetalness(v);
    applyModelAppearance(modelColor, v, modelRoughness, modelWireframe, modelOpacity);
  }, [modelColor, modelRoughness, modelWireframe, modelOpacity, applyModelAppearance]);

  const handleRoughnessChange = useCallback((v: number) => {
    setModelRoughness(v);
    applyModelAppearance(modelColor, modelMetalness, v, modelWireframe, modelOpacity);
  }, [modelColor, modelMetalness, modelWireframe, modelOpacity, applyModelAppearance]);

  const handleWireframeToggle = useCallback(() => {
    const v = !modelWireframe;
    setModelWireframe(v);
    applyModelAppearance(modelColor, modelMetalness, modelRoughness, v, modelOpacity);
  }, [modelColor, modelMetalness, modelRoughness, modelWireframe, modelOpacity, applyModelAppearance]);

  const handleOpacityChange = useCallback((v: number) => {
    setModelOpacity(v);
    applyModelAppearance(modelColor, modelMetalness, modelRoughness, modelWireframe, v);
  }, [modelColor, modelMetalness, modelRoughness, modelWireframe, applyModelAppearance]);

  const resetModelAppearance = useCallback(() => {
    setModelColor('#6366f1');
    setModelMetalness(0.3);
    setModelRoughness(0.5);
    setModelWireframe(false);
    setModelOpacity(1.0);
    applyModelAppearance('#6366f1', 0.3, 0.5, false, 1.0);
    addLog('debug', '模型外观已重置');
  }, [applyModelAppearance]);

  // ─── 重置 ───
  const resetToIdle = useCallback(() => {
    armRef.current?.resetAll(() => {
      setJointConfigs(armRef.current?.getJointConfigs() ?? []);
      setGripperConfigs(armRef.current?.getGripperConfigs() ?? []);
      setGripperOpenness(0);
      setActionProgress(0);
      setCurrentFrameId(0);
    });
    addLog('info', '机械臂归零 (idle pose)');
  }, []);

  // ─── 安全系统 ───
  const toggleSafety = useCallback(() => {
    const arm = armRef.current;
    if (!arm) return;
    const newVal = !safetyEnabled;
    setSafetyEnabled(newVal);
    arm.safetyEnabled = newVal;
    arm.updateSafetyLimits();
    if (newVal) {
      arm.saveSafeSnapshot();
      addLog('info', '安全模式已开启 · 关节限制已收紧');
    } else {
      addLog('warning', '安全模式已关闭 · 注意穿模风险');
    }
    setJointConfigs(arm.getJointConfigs());
    setSafetyStatus(arm.getSafetyStatus());
  }, [safetyEnabled]);

  const restoreToSafe = useCallback(() => {
    const arm = armRef.current;
    if (!arm) return;
    arm.restoreSafe(() => {
      setJointConfigs(arm.getJointConfigs());
      setGripperConfigs(arm.getGripperConfigs());
      setSafetyStatus(arm.getSafetyStatus());
      setActionProgress(0);
      setCurrentFrameId(0);
    });
    setSafetyStatus(arm.getSafetyStatus());
  }, []);

  // ─── 预设动作加载 ───
  const loadAction = useCallback(async (key: string) => {
    const action = PRESET_ACTIONS.find((a) => a.key === key);
    if (!action) return;
    try {
      const res = await fetch(action.path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const seq = await res.json();
      if (!Array.isArray(seq.frames) || seq.frames.length === 0) {
        throw new Error('动作序列格式无效');
      }
      setLoadedSequence(seq);
      setSelectedAction(key);
      setUploadedFile(false);
      addLog('success', `加载预设动作: ${action.label} (${seq.frames.length} 帧)`);
    } catch (e) {
      addLog('error', `加载动作失败: ${e}`);
    }
  }, []);

  useEffect(() => { loadAction('pick_and_place'); }, []);

  // ─── 播放动作序列 ───
  const playAction = useCallback(async () => {
    const arm = armRef.current;
    if (!arm || !loadedSequence) return;

    if (isPaused) {
      arm.stopAllAnimations();
      resumePlayback();
      return;
    }

    setIsPlaying(true);
    setIsPaused(false);
    addLog('info', `执行动作序列 · ${loadedSequence.frames.length} 帧`);

    // 安全预检：计算所有帧的目标角度，检查是否有不安全帧
    let unsafeFrames = 0;
    if (arm.safetyEnabled) {
      const backupAngles = arm.getJointConfigs().map((c) => c.currentAngle);
      for (const frame of loadedSequence.frames) {
        for (let i = 0; i < Math.min(frame.joints.length, JOINT_NAMES.length); i++) {
          const targetDeg = THREE.MathUtils.radToDeg(frame.joints[i]);
          const safeRange = arm.getSafeAngleRange(JOINT_NAMES[i]);
          const clamped = Math.max(safeRange.min, Math.min(safeRange.max, targetDeg));
          if (clamped !== targetDeg) unsafeFrames++;
        }
      }
      if (unsafeFrames > 0) {
        addLog('warning', `安全预检: ${unsafeFrames} 个关节角度将被自动调整以防止穿模`);
      }
    }

    arm.startTrajectory();
    setTrajectoryVisible(true);

    const frames = loadedSequence.frames;
    const totalTime = frames[frames.length - 1].time;
    let timeTick = 0;

    // 使用 GSAP timeline 执行
    const tl = gsap.timeline({
      onUpdate: () => {
        const progress = tl.progress();
        setActionProgress(progress);
      },
      onComplete: () => {
        setIsPlaying(false);
        setIsPaused(false);
        setActionProgress(1);
        arm.stopTrajectory();
        setJointConfigs(arm.getJointConfigs());
        setGripperConfigs(arm.getGripperConfigs());
        addLog('success', '动作序列执行完成');
      },
    });

    frames.forEach((frame: any, idx: number) => {
      const timeSec = frame.time / 1000;
      let frameDur: number;
      if (idx === 0) {
        frameDur = Math.min(5, Math.max(timeSec, 1.5));
      } else {
        frameDur = timeSec - (frames[idx - 1].time / 1000);
      }

      frame.joints.forEach((angleRad: number, i: number) => {
        if (i < JOINT_NAMES.length) {
          const config = arm.getJointConfigs().find((c) => c.name === JOINT_NAMES[i]);
          if (config) {
            const targetDeg = THREE.MathUtils.radToDeg(angleRad);
            tl.to(config, {
              currentAngle: targetDeg,
              duration: frameDur,
              ease: 'none',
              onUpdate: () => arm.setJointAngleSafe(config.name, config.currentAngle),
            }, timeTick);
          }
        }
      });

      if (frame.io?.digital_output_0 !== undefined) {
        const openness = frame.io.digital_output_0 ? 0 : 1;
        tl.call(() => {
          arm.animateGripper(openness, 300);
          setGripperState(frame.io.digital_output_0);
          setGripperOpenness(openness);
        }, [], timeTick);
      }

      tl.call(() => {
        setCurrentFrameId(frame.id);
      }, [], timeTick);

      timeTick += frameDur;
    });
  }, [loadedSequence, isPaused]);

  const pausePlayback = useCallback(() => {
    const arm = armRef.current;
    if (!arm) return;
    arm.stopAllAnimations();
    arm.stopTrajectory();
    setIsPaused(true);
    setIsPlaying(false);
    addLog('debug', '动作暂停');
  }, []);

  const resumePlayback = useCallback(() => {
    setIsPaused(false);
    setIsPlaying(true);
    armRef.current?.startTrajectory();
    addLog('debug', '动作恢复');
    // 简单恢复：从当前位置继续执行剩余帧
    const arm = armRef.current;
    if (!arm || !loadedSequence) return;
    const frames = loadedSequence.frames;
    const currentProgress = actionProgress;
    const totalTime = frames[frames.length - 1].time;
    const targetTime = totalTime * currentProgress;

    let startIdx = 0;
    for (let i = 0; i < frames.length - 1; i++) {
      if (targetTime >= frames[i].time && targetTime <= frames[i + 1].time) {
        startIdx = i + 1;
        break;
      }
    }

    let timeTick = targetTime / 1000;
    const tl = gsap.timeline({
      onUpdate: () => {
        const p = tl.progress();
        setActionProgress(currentProgress + p * (1 - currentProgress));
      },
      onComplete: () => {
        setIsPlaying(false);
        setIsPaused(false);
        setActionProgress(1);
        arm.stopTrajectory();
        addLog('success', '动作序列执行完成');
      },
    });

    for (let idx = startIdx; idx < frames.length; idx++) {
      const frame = frames[idx];
      const timeSec = frame.time / 1000;
      let frameDur: number;
      if (idx === startIdx) {
        frameDur = timeSec - timeTick;
      } else {
        frameDur = timeSec - (frames[idx - 1].time / 1000);
      }
      if (frameDur <= 0) continue;

      frame.joints.forEach((angleRad: number, i: number) => {
        if (i < JOINT_NAMES.length) {
          const config = arm.getJointConfigs().find((c) => c.name === JOINT_NAMES[i]);
          if (config) {
            const targetDeg = THREE.MathUtils.radToDeg(angleRad);
            tl.to(config, {
              currentAngle: targetDeg,
              duration: frameDur,
              ease: 'none',
              onUpdate: () => arm.setJointAngleSafe(config.name, config.currentAngle),
            }, timeTick - targetTime / 1000);
          }
        }
      });

      if (frame.io?.digital_output_0 !== undefined) {
        const openness = frame.io.digital_output_0 ? 0 : 1;
        tl.call(() => {
          arm.animateGripper(openness, 300);
          setGripperState(frame.io.digital_output_0);
        }, [], timeTick - targetTime / 1000);
      }

      tl.call(() => setCurrentFrameId(frame.id), [], timeTick - targetTime / 1000);
      timeTick = timeSec;
    }
  }, [loadedSequence, actionProgress]);

  const stopAction = useCallback(() => {
    const arm = armRef.current;
    if (!arm) return;
    arm.stopAllAnimations();
    arm.stopTrajectory();
    arm.clearTrajectory();
    setIsPlaying(false);
    setIsPaused(false);
    setActionProgress(0);
    setCurrentFrameId(0);
    setGripperState(false);
    addLog('warning', '动作已停止');
    arm.resetAll(() => {
      setJointConfigs(arm.getJointConfigs());
      setGripperConfigs(arm.getGripperConfigs());
      setGripperOpenness(0);
    });
  }, []);

  // ─── 进度条拖拽 ───
  const handleProgressDrag = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPlaying) return;
    const v = parseFloat(e.target.value);
    setActionProgress(v);
    const arm = armRef.current;
    if (!arm || !loadedSequence) return;

    const frames = loadedSequence.frames;
    const totalTime = frames[frames.length - 1].time;
    const targetTime = totalTime * v;

    let targetIdx = 0;
    for (let i = 0; i < frames.length - 1; i++) {
      if (targetTime >= frames[i].time && targetTime <= frames[i + 1].time) {
        targetIdx = i;
        break;
      }
    }
    if (targetTime >= frames[frames.length - 1].time) targetIdx = frames.length - 1;

    const frame = frames[targetIdx];
    const nextFrame = targetIdx < frames.length - 1 ? frames[targetIdx + 1] : null;

    let interp = 0;
    if (nextFrame) {
      const frameDur = nextFrame.time - frame.time;
      const frameProg = targetTime - frame.time;
      interp = frameDur > 0 ? frameProg / frameDur : 0;
    }

    frame.joints.forEach((angleRad: number, i: number) => {
      if (i < JOINT_NAMES.length) {
        let finalDeg = THREE.MathUtils.radToDeg(angleRad);
        if (nextFrame && interp > 0) {
          const nextDeg = THREE.MathUtils.radToDeg(nextFrame.joints[i]);
          finalDeg = finalDeg + (nextDeg - finalDeg) * interp;
        }
        arm.setJointAngleSafe(JOINT_NAMES[i], finalDeg);
      }
    });

    if (frame.io?.digital_output_0 !== undefined) {
      arm.animateGripper(frame.io.digital_output_0 ? 0 : 1, 200);
      setGripperState(frame.io.digital_output_0);
      setGripperOpenness(frame.io.digital_output_0 ? 0 : 1);
    }

    setCurrentFrameId(frame.id);
    setJointConfigs(arm.getJointConfigs());
    setGripperConfigs(arm.getGripperConfigs());
  }, [isPlaying, loadedSequence]);

  // ─── 文件上传 ───
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      addLog('error', '请选择JSON格式文件');
      return;
    }
    try {
      const text = await file.text();
      const seq = JSON.parse(text);
      if (!Array.isArray(seq.frames) || seq.frames.length === 0) {
        throw new Error('格式无效');
      }
      setLoadedSequence(seq);
      setUploadedFile(true);
      addLog('success', `上传文件: ${file.name} (${seq.frames.length} 帧)`);
    } catch {
      addLog('error', '文件解析失败，请检查JSON格式');
    }
    e.target.value = '';
  }, []);

  const resetUpload = useCallback(() => {
    setUploadedFile(false);
    loadAction(selectedAction);
    addLog('info', '已重置上传，恢复预设动作');
  }, [selectedAction, loadAction]);

  // ─── 选中的动作信息 ───
  const selectedActionInfo = PRESET_ACTIONS.find((a) => a.key === selectedAction);

  // ─── 关节标签 ───
  const jointLabels = ['J1 底座', 'J2 肩部', 'J3 肘部1', 'J4 肘部2', 'J5 腕部'];

  return (
    <div className="relative flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* ========== 3D 场景 ========== */}
      <div ref={containerRef} className="relative flex-1">
        <canvas ref={canvasRef} className="block h-full w-full" />

        {/* 视角切换按钮 */}
        <div className="absolute right-4 top-4 flex gap-1">
          {([
            { mode: 'default' as ViewMode, label: '默认' },
            { mode: 'front' as ViewMode, label: '前视' },
            { mode: 'top' as ViewMode, label: '俯视' },
            { mode: 'side' as ViewMode, label: '侧视' },
          ]).map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => switchView(mode)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                viewMode === mode
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'glass text-slate-600 hover:bg-white/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 安全状态指示器 */}
        <div className="absolute right-4 top-14 flex items-center gap-2">
          <button
            onClick={toggleSafety}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all shadow-sm ${
              safetyEnabled
                ? 'bg-emerald-500/90 text-white'
                : 'bg-rose-400/90 text-white'
            }`}
          >
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${safetyEnabled ? 'bg-white animate-pulse' : 'bg-white'}`} />
            {safetyEnabled ? '安全模式' : '无保护'}
          </button>
          {!safetyStatus.isSafe && (
            <button
              onClick={restoreToSafe}
              className="rounded-lg bg-amber-500/90 px-2.5 py-1.5 text-xs font-medium text-white transition-all hover:bg-amber-600 shadow-sm"
            >
              回归安全位
            </button>
          )}
        </div>

        {/* 返回按钮 */}
        <button
          onClick={() => navigate('/playground')}
          className="absolute left-4 top-4 flex items-center gap-1.5 rounded-lg glass px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white/40 transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回
        </button>

        {/* 播放状态指示器 */}
        {isPlaying && (
          <div className="absolute left-1/2 top-4 -translate-x-1/2 flex items-center gap-2 rounded-full glass px-4 py-1.5 shadow-md">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-emerald-700">
              {isPaused ? '已暂停' : '执行中'}
            </span>
          </div>
        )}
      </div>

      {/* ========== 控制面板 ========== */}
      <div className={`flex flex-col border-l border-slate-200/60 bg-white/80 backdrop-blur-xl transition-all duration-300 ${
        controlPanelOpen ? 'w-[340px]' : 'w-0 overflow-hidden border-l-0'
      }`}>
        {controlPanelOpen && (
          <div className="flex flex-1 flex-col overflow-y-auto">
            {/* 面板头部 */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-700">控制面板</h2>
              <button
                onClick={() => setControlPanelOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {/* ─── 关节控制 ─── */}
              <div className="rounded-xl bg-slate-50/60 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-600">关节控制</h3>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={safetyEnabled}
                        onChange={toggleSafety}
                        className="h-3 w-3 rounded accent-emerald-500"
                      />
                      安全
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer">
                      <input type="checkbox" checked={axisHelper} onChange={toggleAxis} className="h-3 w-3 rounded" />
                      轴辅助
                    </label>
                  </div>
                </div>
                {/* 安全警告 */}
                {!safetyStatus.isSafe && safetyEnabled && (
                  <div className="mb-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] text-amber-700">
                    <button onClick={restoreToSafe} className="font-medium underline hover:text-amber-900">
                      点击回归安全位
                    </button>
                    {safetyStatus.warnings.slice(0, 2).map((w, i) => (
                      <p key={i} className="text-amber-500">{w}</p>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  {jointConfigs.map((cfg, i) => (
                    <div key={cfg.name} className="flex items-center gap-2">
                      <span className="w-16 text-[10px] font-medium text-slate-500">{jointLabels[i]}</span>
                      <input
                        type="range"
                        min={cfg.minAngle}
                        max={cfg.maxAngle}
                        step={1}
                        value={cfg.currentAngle}
                        disabled={isPlaying}
                        onChange={(e) => setJoint(cfg.name, parseFloat(e.target.value))}
                        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-500"
                      />
                      <span className="w-10 text-right font-mono text-[10px] text-slate-600">{cfg.currentAngle.toFixed(0)}°</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─── 夹爪控制 ─── */}
              <div className="rounded-xl bg-slate-50/60 p-3">
                <h3 className="mb-2 text-xs font-semibold text-slate-600">夹爪控制</h3>
                <div className="flex items-center gap-2">
                  <Grip className="h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={gripperOpenness}
                    disabled={isPlaying}
                    onChange={(e) => setGripperOpen(parseFloat(e.target.value))}
                    className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-amber-500"
                  />
                  <span className="w-10 text-right font-mono text-[10px] text-slate-600">
                    {gripperOpenness === 0 ? '闭合' : gripperOpenness === 1 ? '张开' : `${(gripperOpenness * 100).toFixed(0)}%`}
                  </span>
                </div>
              </div>

              {/* ─── 预设动作 ─── */}
              <div className="rounded-xl bg-slate-50/60 p-3">
                <h3 className="mb-3 text-xs font-semibold text-slate-600">预设动作</h3>

                {/* 动作选择 */}
                {!uploadedFile ? (
                  <div className="mb-3 flex gap-1">
                    {PRESET_ACTIONS.map((a) => (
                      <button
                        key={a.key}
                        onClick={() => loadAction(a.key)}
                        disabled={isPlaying}
                        className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-all ${
                          selectedAction === a.key
                            ? 'bg-indigo-500 text-white shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-100'
                        } ${isPlaying ? 'opacity-40' : ''}`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-[10px] text-indigo-600 font-medium">已上传自定义动作</span>
                    <button onClick={resetUpload} className="text-[10px] text-slate-400 hover:text-slate-600 underline">重置</button>
                  </div>
                )}

                {/* 播放/暂停/停止 */}
                <div className="mb-3 flex gap-2">
                  <button
                    onClick={isPlaying ? pausePlayback : playAction}
                    disabled={!loadedSequence}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                      isPlaying && !isPaused
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                    } ${!loadedSequence ? 'opacity-40' : ''}`}
                  >
                    {isPlaying && !isPaused ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    {isPlaying && !isPaused ? '暂停' : '执行'}
                  </button>
                  <button
                    onClick={stopAction}
                    disabled={!isPlaying && !isPaused}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                      isPlaying || isPaused
                        ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <Square className="h-3 w-3" />
                    停止
                  </button>
                  <button
                    onClick={resetToIdle}
                    disabled={isPlaying}
                    className={`flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium transition-all ${
                      isPlaying ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>

                {/* 进度条 */}
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">进度</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={actionProgress}
                    disabled={isPlaying}
                    onChange={handleProgressDrag}
                    className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-500"
                  />
                  <span className="font-mono text-[10px] text-slate-500">{(actionProgress * 100).toFixed(0)}%</span>
                </div>

                {/* 状态信息 */}
                <div className="flex items-center gap-4 text-[10px] text-slate-400">
                  <span>帧: {currentFrameId}</span>
                  <span>夹爪: {gripperState ? '闭合' : '张开'}</span>
                </div>
              </div>

              {/* ─── 轨迹可视化 ─── */}
              <div className="rounded-xl bg-slate-50/60 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-600">轨迹可视化</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={toggleTrajectory}
                      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition-all ${
                        trajectoryVisible ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-slate-500'
                      }`}
                    >
                      {trajectoryVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {trajectoryVisible ? '显示' : '隐藏'}
                    </button>
                    <button
                      onClick={() => { armRef.current?.clearTrajectory(); addLog('debug', '轨迹已清除'); }}
                      className="rounded-lg bg-white px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-100"
                    >
                      清除
                    </button>
                  </div>
                </div>
              </div>

              {/* ─── 文件上传 ─── */}
              <div className="rounded-xl bg-slate-50/60 p-3">
                <h3 className="mb-2 text-xs font-semibold text-slate-600">上传动作文件</h3>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-lg bg-white px-3 py-2 text-[10px] font-medium text-slate-600 hover:bg-slate-100 transition-all"
                >
                  选择 JSON 文件
                </button>
              </div>

              {/* ─── 模型外观 ─── */}
              <div className="rounded-xl bg-slate-50/60 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-600">模型外观</h3>
                  <button
                    onClick={resetModelAppearance}
                    className="rounded px-1.5 py-0.5 text-[10px] text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    重置
                  </button>
                </div>
                <div className="space-y-2.5">
                  {/* 颜色 */}
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-[10px] text-slate-500">颜色</span>
                    <input
                      type="color"
                      value={modelColor}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="h-5 w-7 cursor-pointer rounded border-0 p-0"
                    />
                    <span className="font-mono text-[10px] text-slate-400">{modelColor}</span>
                  </div>

                  {/* 金属度 */}
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-[10px] text-slate-500">金属度</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={modelMetalness}
                      onChange={(e) => handleMetalnessChange(parseFloat(e.target.value))}
                      className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-amber-500"
                    />
                    <span className="w-8 text-right font-mono text-[10px] text-slate-500">{modelMetalness.toFixed(2)}</span>
                  </div>

                  {/* 粗糙度 */}
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-[10px] text-slate-500">粗糙度</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={modelRoughness}
                      onChange={(e) => handleRoughnessChange(parseFloat(e.target.value))}
                      className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-amber-500"
                    />
                    <span className="w-8 text-right font-mono text-[10px] text-slate-500">{modelRoughness.toFixed(2)}</span>
                  </div>

                  {/* 透明度 */}
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-[10px] text-slate-500">透明度</span>
                    <input
                      type="range"
                      min={0.2}
                      max={1}
                      step={0.01}
                      value={modelOpacity}
                      onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                      className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-amber-500"
                    />
                    <span className="w-8 text-right font-mono text-[10px] text-slate-500">{modelOpacity.toFixed(2)}</span>
                  </div>

                  {/* 线框模式 */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modelWireframe}
                      onChange={handleWireframeToggle}
                      className="h-3 w-3 rounded accent-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500">线框模式</span>
                  </label>
                </div>
              </div>

              {/* ─── 关节角度实时显示 ─── */}
              <div className="rounded-xl bg-slate-50/60 p-3">
                <h3 className="mb-2 text-xs font-semibold text-slate-600">实时角度 (°)</h3>
                <div className="grid grid-cols-5 gap-1">
                  {jointDegrees.map((v, i) => (
                    <div key={i} className="rounded-lg bg-white px-1.5 py-1 text-center">
                      <p className="text-[9px] text-slate-400">{jointLabels[i]}</p>
                      <p className="font-mono text-[10px] font-semibold text-slate-700">{v.toFixed(1)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 控制面板开关按钮 */}
      {!controlPanelOpen && (
        <button
          onClick={() => setControlPanelOpen(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 rounded-l-lg bg-white/80 backdrop-blur-sm border border-r-0 border-slate-200/60 px-1.5 py-4 text-slate-400 hover:text-slate-600 shadow-sm"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      )}

      {/* ========== 系统日志 ========== */}
      <SystemLog
        entries={logEntries}
        expanded={logExpanded}
        onToggle={() => setLogExpanded((v) => !v)}
        onClear={() => { setLogEntries([]); addLog('debug', '日志已清空'); }}
      />
    </div>
  );
}

export default OperationPage;