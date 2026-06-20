import { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import {
  ArrowLeft, Play, Pause, Square, RotateCcw, Eye, EyeOff,
  Camera, Grip, Maximize2, Minimize2, Shield, AlertTriangle,
  Upload, RefreshCw, Settings2, Layers, Terminal, Sparkles,
  Send, Loader2, CheckCircle2, XCircle, Filter, ChevronRight, Zap, Bot
} from 'lucide-react';
import {
  RobotArm, createScene, setupLighting, setupGround,
  JOINT_NAMES, type JointConfig,
} from '../playground/robotArm3D';
import { SystemLog, type LogEntry } from '../playground/SystemLog';
import { quickSafetyCheck } from '../../lib/safety-validator';
import { parseCommand, executeCommand as apiExecuteCommand } from '../../lib/robot-api';
import type { SafetyCheck, CommandSuggestion } from '../../types';

type ViewMode = 'default' | 'front' | 'top' | 'side';

const SCENE_CONFIG: Record<ViewMode, { pos: readonly [number, number, number]; target: readonly [number, number, number] }> = {
  default: { pos: [1.82, 2.19, -1.57], target: [0, 1.2, 0] },
  front: { pos: [0, 1.5, 5], target: [0, 1.2, 0] },
  top: { pos: [0, 10, 0.0001], target: [0, 1.2, 0] },
  side: { pos: [5, 1.5, 0], target: [0, 1.2, 0] },
};

interface PresetAction {
  key: string;
  label: string;
  path: string;
}

const PRESET_ACTIONS: PresetAction[] = [
  { key: 'pick_and_place', label: '抓取&放置', path: '/actions/pick_and_place.json' },
  { key: 'demo_action', label: '示例动作', path: '/actions/demo_action.json' },
];

export function OperationPage() {
  const navigate = useNavigate();

  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [logExpanded, setLogExpanded] = useState(true);
  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogEntries((prev) => [
      ...prev.slice(-199),
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: new Date(), type, message },
    ]);
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const camRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const ctrlRef = useRef<OrbitControls | null>(null);
  const armRef = useRef<RobotArm | null>(null);
  const afRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const [jointConfigs, setJointConfigs] = useState<JointConfig[]>([]);
  const [gripperConfigs, setGripperConfigs] = useState<JointConfig[]>([]);
  const [gripperOpenness, setGripperOpenness] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('default');
  const [axisHelper, setAxisHelper] = useState(false);
  const [trajectoryVisible, setTrajectoryVisible] = useState(false);
  const [controlPanelOpen, setControlPanelOpen] = useState(true);

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

  const [modelColor, setModelColor] = useState('#6366f1');
  const [modelMetalness, setModelMetalness] = useState(0.3);
  const [modelRoughness, setModelRoughness] = useState(0.5);
  const [modelWireframe, setModelWireframe] = useState(false);
  const [modelOpacity, setModelOpacity] = useState(1.0);

  const [safetyEnabled, setSafetyEnabled] = useState(true);
  const [safetyStatus, setSafetyStatus] = useState<{ isSafe: boolean; warnings: string[] }>({ isSafe: true, warnings: [] });

  // 自然语言指令输入状态
  const [commandText, setCommandText] = useState('');
  const [commandSafety, setCommandSafety] = useState<SafetyCheck | null>(null);
  const [commandExecuting, setCommandExecuting] = useState(false);
  const [commandHistory, setCommandHistory] = useState<{ text: string; success: boolean; time: Date }[]>([]);

  // 方案推荐状态
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([]);
  const [suggestionFilter, setSuggestionFilter] = useState<string>('all');
  const [selectedSuggestion, setSelectedSuggestion] = useState<CommandSuggestion | null>(null);

  // 机械臂末端位置状态
  const [endEffectorPos, setEndEffectorPos] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });

  // 加载方案建议
  useEffect(() => {
    fetch('/api/robot/suggestions?context=')
      .then((r) => r.json())
      .then((data: CommandSuggestion[]) => setSuggestions(data))
      .catch(() => {});
  }, []);

  // 指令文本变化时的安全检查
  useEffect(() => {
    if (commandText.trim().length > 0) {
      const result = quickSafetyCheck(commandText);
      setCommandSafety(result);
    } else {
      setCommandSafety(null);
    }
  }, [commandText]);

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

      if (arm.model) {
        arm.model.scale.set(0.3, 0.3, 0.3);
        gsap.to(arm.model.scale, { x: 1, y: 1, z: 1, duration: 1.2, ease: 'power3.out' });
        gsap.to(arm.model.rotation, { y: Math.PI * 2, duration: 2, ease: 'power2.out' });
      }

      addLog('success', 'GLB模型加载完成 · 机械臂初始化成功');
    });

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
        // 更新末端位置
        const pos = arm.getEndEffectorPosition();
        setEndEffectorPos({ x: pos.x, y: pos.y, z: pos.z });
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

  const toggleAxis = useCallback(() => {
    const v = !axisHelper;
    setAxisHelper(v);
    const arm = armRef.current;
    if (!arm?.model) return;
    arm.model.traverse((child) => {
      if (child instanceof THREE.AxesHelper) child.visible = v;
    });
  }, [axisHelper]);

  const toggleTrajectory = useCallback(() => {
    const v = !trajectoryVisible;
    setTrajectoryVisible(v);
    armRef.current?.showTrajectory(v);
  }, [trajectoryVisible]);

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

  // 暂停播放
  const pausePlayback = useCallback(() => {
    setIsPaused(true);
    gsap.globalTimeline.pause();
  }, []);

  // 继续播放
  const resumePlayback = useCallback(() => {
    setIsPaused(false);
    gsap.globalTimeline.resume();
  }, []);

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

  // 执行自然语言指令
  const handleExecuteCommand = useCallback(async () => {
    const trimmed = commandText.trim();
    if (!trimmed || commandExecuting) return;
    if (commandSafety && commandSafety.errors.length > 0) return;

    setCommandExecuting(true);
    addLog('info', `执行指令: "${trimmed}"`);

    try {
      // 解析指令（使用 Ollama 或 fallback）
      const { parseCommandWithLLM } = await import('../../lib/ollama-client');
      const parsed = await parseCommandWithLLM(trimmed);

      addLog('debug', `解析: ${parsed.action} | 目标: ${parsed.target} | 角度: ${parsed.params.angle || '无'}`);

      // 获取速度配置
      const speedMap = { slow: 1000, medium: 600, fast: 300 };
      const duration = speedMap[parsed.params.speed || 'medium'];

      // 根据解析结果控制机械臂
      switch (parsed.action) {
        case 'grab':
          // 抓取 - 闭合夹爪
          armRef.current?.animateGripper(0, duration);
          setGripperOpenness(0);
          setGripperState(true);
          addLog('success', '夹爪已闭合，执行抓取');
          break;

        case 'release':
          // 释放 - 张开夹爪
          armRef.current?.animateGripper(1, duration);
          setGripperOpenness(1);
          setGripperState(false);
          addLog('success', '夹爪已张开，释放物品');
          break;

        case 'rotate':
          // 旋转 - 底座旋转指定角度
          {
            const currentBase = armRef.current?.getJointConfigs().find(c => c.name === 'base1');
            const angle = parsed.params.angle || 90;
            const targetAngle = (currentBase?.currentAngle || 0) + angle;
            armRef.current?.animateJoint('base1', targetAngle, duration);
            addLog('success', `底座旋转 ${angle}°`);
          }
          break;

        case 'raise':
          // 上升 - 肩关节角度增加
          {
            const shoulder = armRef.current?.getJointConfigs().find(c => c.name === 'shoulder');
            const targetAngle = Math.min((shoulder?.currentAngle || 0) + 20, shoulder?.maxAngle || 130);
            armRef.current?.animateJoint('shoulder', targetAngle, duration);
            addLog('success', '机械臂上升');
          }
          break;

        case 'lower':
          // 下降 - 肩关节角度减少
          {
            const shoulder = armRef.current?.getJointConfigs().find(c => c.name === 'shoulder');
            const targetAngle = Math.max((shoulder?.currentAngle || 0) - 20, shoulder?.minAngle || -130);
            armRef.current?.animateJoint('shoulder', targetAngle, duration);
            addLog('success', '机械臂下降');
          }
          break;

        case 'tilt':
          // 倾斜 - 腕关节调整
          {
            const wrist = armRef.current?.getJointConfigs().find(c => c.name === 'wrist1');
            const angle = parsed.params.angle || 30;
            armRef.current?.animateJoint('wrist1', angle, duration);
            addLog('success', `腕部倾斜 ${angle}°`);
          }
          break;

        case 'stop':
          // 紧急停止
          armRef.current?.stopAllAnimations();
          addLog('warning', '紧急停止！所有运动已中止');
          break;

        case 'reset':
        case 'move':
          if (parsed.target === 'home') {
            // 复位到零点
            armRef.current?.resetAll(() => {
              setJointConfigs(armRef.current?.getJointConfigs() ?? []);
              setGripperConfigs(armRef.current?.getGripperConfigs() ?? []);
              setGripperOpenness(0);
            });
            addLog('success', '机械臂已复位到零点位置');
          } else if (parsed.target === 'safe_height') {
            // 移动到安全高度
            armRef.current?.animateJoint('shoulder', 45, duration);
            armRef.current?.animateJoint('elbow1', -30, duration);
            addLog('success', '移动到安全高度');
          } else {
            // 通用移动（复位）
            armRef.current?.resetAll(() => {
              setJointConfigs(armRef.current?.getJointConfigs() ?? []);
            });
            addLog('success', `移动到 ${parsed.target}`);
          }
          break;

        case 'pause':
          // 暂停当前动作
          pausePlayback();
          addLog('info', '动作已暂停');
          break;

        case 'resume':
          // 继续执行
          if (isPaused) {
            resumePlayback();
            addLog('info', '继续执行动作');
          }
          break;

        default:
          addLog('warning', `未知动作: ${parsed.action}`);
      }

      // 更新关节配置状态
      setTimeout(() => {
        setJointConfigs(armRef.current?.getJointConfigs() ?? []);
        setGripperConfigs(armRef.current?.getGripperConfigs() ?? []);
      }, duration + 100);

      // 记录执行历史
      setCommandHistory((prev) => [
        ...prev.slice(-19),
        { text: trimmed, success: true, time: new Date() },
      ]);

    } catch (err) {
      addLog('error', `指令执行失败: ${err}`);
      setCommandHistory((prev) => [
        ...prev.slice(-19),
        { text: trimmed, success: false, time: new Date() },
      ]);
    } finally {
      setCommandExecuting(false);
    }
  }, [commandText, commandExecuting, commandSafety, addLog, isPaused]);

  // 选择方案建议
  const handleSelectSuggestion = useCallback((s: CommandSuggestion) => {
    setSelectedSuggestion(s);
    setCommandText(s.text);
    addLog('info', `选择方案: ${s.name || s.text}`);
  }, [addLog]);

  // 筛选方案
  const filteredSuggestions = suggestions.filter(
    (s) => suggestionFilter === 'all' || s.category === suggestionFilter
  );

  const suggestionCategories = ['all', '基础', '移动', '夹爪', '复合', 'LLM推荐'];

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

  const selectedActionInfo = PRESET_ACTIONS.find((a) => a.key === selectedAction);
  const jointLabels = ['J1 底座', 'J2 肩部', 'J3 肘部1', 'J4 肘部2', 'J5 腕部'];

  return (
    <div className="relative flex h-[calc(100vh-3.5rem)] overflow-hidden">
      <div ref={containerRef} className="relative flex-1">
        <canvas ref={canvasRef} className="block h-full w-full" />

        <div className="absolute right-4 top-4 flex flex-col gap-2">
          <div className="flex gap-1">
            {([
              { mode: 'default' as ViewMode, label: '默认' },
              { mode: 'front' as ViewMode, label: '前视' },
              { mode: 'top' as ViewMode, label: '俯视' },
              { mode: 'side' as ViewMode, label: '侧视' },
            ]).map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => switchView(mode)}
                className={`rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                  viewMode === mode
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                    : 'glass text-white/70 hover:bg-white/[0.1]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSafety}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                safetyEnabled
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-gradient-to-r from-rose-500/20 to-red-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              {safetyEnabled ? '安全模式' : '无保护'}
            </button>
            {!safetyStatus.isSafe && (
              <button
                onClick={restoreToSafe}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-3 py-2 text-xs font-medium text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                回归安全位
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => navigate('/playground')}
          className="absolute left-4 top-4 flex items-center gap-2 rounded-xl glass px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/[0.1] transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </button>

        {isPlaying && (
          <div className="absolute left-1/2 top-4 -translate-x-1/2 flex items-center gap-2 rounded-full glass px-4 py-2 shadow-lg">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-white/80">
              {isPaused ? '已暂停' : '执行中'}
            </span>
          </div>
        )}
      </div>

      <div className={`flex flex-col border-l border-white/[0.08] bg-slate-900/80 backdrop-blur-2xl transition-all duration-300 ${
        controlPanelOpen ? 'w-[320px]' : 'w-0 overflow-hidden border-l-0'
      }`}>
        {controlPanelOpen && (
          <div className="flex flex-1 flex-col overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                  <Settings2 className="h-4 w-4 text-indigo-300" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white/90">控制面板</h2>
                  <p className="text-[10px] text-white/40">3D 机械臂操控</p>
                </div>
              </div>
              <button
                onClick={() => setControlPanelOpen(false)}
                className="rounded-xl p-2 text-white/40 hover:bg-white/[0.06] hover:text-white/70 transition-all"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {/* 自然语言指令输入 */}
              <div className="relative overflow-hidden rounded-2xl glass p-4">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500" />
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                    <Terminal className="h-4 w-4 text-blue-300" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white/80">自然语言指令</h3>
                    <p className="text-[10px] text-white/40">输入指令控制机械臂</p>
                  </div>
                </div>
                <div className="relative">
                  <textarea
                    value={commandText}
                    onChange={(e) => setCommandText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleExecuteCommand();
                      }
                    }}
                    disabled={commandExecuting}
                    rows={2}
                    placeholder="例如：移动到实验台A上方，张开夹爪"
                    className="w-full resize-none rounded-xl border border-white/20 bg-white/[0.04] px-3 py-2 text-xs leading-5 text-white/90 placeholder:text-white/30 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    onClick={handleExecuteCommand}
                    disabled={commandExecuting || !commandText.trim() || (commandSafety?.errors.length ?? 0) > 0}
                    className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 disabled:opacity-40"
                  >
                    {commandExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
                {commandSafety && (commandSafety.errors.length > 0 || commandSafety.warnings.length > 0) && (
                  <div className="mt-2 rounded-xl bg-amber-500/10 px-3 py-2 border border-amber-500/20">
                    {commandSafety.errors.map((err, i) => (
                      <p key={i} className="flex items-center gap-1 text-[10px] text-rose-400">
                        <XCircle className="h-3 w-3" />
                        {err}
                      </p>
                    ))}
                    {commandSafety.warnings.map((warn, i) => (
                      <p key={i} className="flex items-center gap-1 text-[10px] text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        {warn}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* 方案推荐（滑动筛选） */}
              <div className="relative overflow-hidden rounded-2xl glass p-4">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                    <Sparkles className="h-4 w-4 text-purple-300" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white/80">AI 方案推荐</h3>
                    <p className="text-[10px] text-white/40">滑动筛选执行方案</p>
                  </div>
                </div>
                {/* 分类筛选 */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {suggestionCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSuggestionFilter(cat)}
                      className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-all ${
                        suggestionFilter === cat
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-white/[0.04] text-white/50 hover:bg-white/[0.08]'
                      }`}
                    >
                      {cat === 'all' ? '全部' : cat}
                    </button>
                  ))}
                </div>
                {/* 方案列表 */}
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                  {filteredSuggestions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSuggestion(s)}
                      className={`w-full rounded-xl px-3 py-2 text-left transition-all ${
                        selectedSuggestion?.id === s.id
                          ? 'bg-purple-500/20 border border-purple-500/30'
                          : 'bg-white/[0.04] hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white/80">{s.text}</span>
                        <span className="text-[10px] text-white/40">{s.confidence}%</span>
                      </div>
                      <p className="text-[10px] text-white/50 mt-0.5">{s.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 机械臂状态面板 */}
              <div className="relative overflow-hidden rounded-2xl glass p-4">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                    <Bot className="h-4 w-4 text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white/80">机械臂状态</h3>
                    <p className="text-[10px] text-white/40">实时数据反馈</p>
                  </div>
                </div>
                {/* 末端位置 */}
                <div className="mb-2">
                  <p className="text-[10px] text-white/40 mb-1">末端位置 (mm)</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="rounded-lg bg-white/[0.04] px-2 py-1.5 text-center">
                      <p className="text-[9px] text-white/40">X</p>
                      <p className="font-mono text-[10px] text-white/80">{endEffectorPos.x.toFixed(1)}</p>
                    </div>
                    <div className="rounded-lg bg-white/[0.04] px-2 py-1.5 text-center">
                      <p className="text-[9px] text-white/40">Y</p>
                      <p className="font-mono text-[10px] text-white/80">{endEffectorPos.y.toFixed(1)}</p>
                    </div>
                    <div className="rounded-lg bg-white/[0.04] px-2 py-1.5 text-center">
                      <p className="text-[9px] text-white/40">Z</p>
                      <p className="font-mono text-[10px] text-white/80">{endEffectorPos.z.toFixed(1)}</p>
                    </div>
                  </div>
                </div>
                {/* 指令历史 */}
                {commandHistory.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/40 mb-1">最近指令</p>
                    <div className="space-y-1 max-h-[60px] overflow-y-auto">
                      {commandHistory.slice(-5).map((h, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[10px]">
                          {h.success ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <XCircle className="h-3 w-3 text-rose-400" />
                          )}
                          <span className="text-white/70 truncate">{h.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative overflow-hidden rounded-2xl glass p-4">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-white/40" />
                    <h3 className="text-xs font-semibold text-white/80">关节控制</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-[10px] text-white/40 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={safetyEnabled}
                        onChange={toggleSafety}
                        className="h-3 w-3 rounded accent-emerald-500"
                      />
                      <span className={safetyEnabled ? 'text-emerald-400' : 'text-rose-400'}>安全</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] text-white/40 cursor-pointer">
                      <input type="checkbox" checked={axisHelper} onChange={toggleAxis} className="h-3 w-3 rounded accent-indigo-500" />
                      轴辅助
                    </label>
                  </div>
                </div>
                {!safetyStatus.isSafe && safetyEnabled && (
                  <div className="mb-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-3 py-2 border border-amber-500/20">
                    <button onClick={restoreToSafe} className="flex items-center gap-1 text-[10px] font-medium text-amber-300 hover:text-amber-200 transition-colors">
                      <AlertTriangle className="h-3 w-3" />
                      点击回归安全位
                    </button>
                  </div>
                )}
                <div className="space-y-2.5">
                  {jointConfigs.map((cfg, i) => (
                    <div key={cfg.name} className="flex items-center gap-2">
                      <span className="w-16 text-[10px] font-medium text-white/50">{jointLabels[i]}</span>
                      <input
                        type="range"
                        min={cfg.minAngle}
                        max={cfg.maxAngle}
                        step={1}
                        value={cfg.currentAngle}
                        disabled={isPlaying}
                        onChange={(e) => setJoint(cfg.name, parseFloat(e.target.value))}
                        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-indigo-500"
                      />
                      <span className="w-10 text-right font-mono text-[10px] text-white/70">{cfg.currentAngle.toFixed(0)}°</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl glass p-4">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
                <div className="flex items-center gap-2">
                  <Grip className="h-4 w-4 text-amber-400" />
                  <h3 className="text-xs font-semibold text-white/80">夹爪控制</h3>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={gripperOpenness}
                    disabled={isPlaying}
                    onChange={(e) => setGripperOpen(parseFloat(e.target.value))}
                    className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-amber-500"
                  />
                  <span className="w-12 text-right font-mono text-[10px] text-white/70">
                    {gripperOpenness === 0 ? '闭合' : gripperOpenness === 1 ? '张开' : `${(gripperOpenness * 100).toFixed(0)}%`}
                  </span>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl glass p-4">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-semibold text-white/80">预设动作</h3>
                </div>

                {!uploadedFile ? (
                  <div className="mt-3 flex gap-2">
                    {PRESET_ACTIONS.map((a) => (
                      <button
                        key={a.key}
                        onClick={() => loadAction(a.key)}
                        disabled={isPlaying}
                        className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                          selectedAction === a.key
                            ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.1]'
                        } ${isPlaying ? 'opacity-40' : ''}`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-indigo-300">已上传自定义动作</span>
                    <button onClick={resetUpload} className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors">
                      <RefreshCw className="h-3 w-3" />
                      重置
                    </button>
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={isPlaying ? pausePlayback : playAction}
                    disabled={!loadedSequence}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                      isPlaying && !isPaused
                        ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30'
                    } ${!loadedSequence ? 'opacity-40' : ''}`}
                  >
                    {isPlaying && !isPaused ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {isPlaying && !isPaused ? '暂停' : '执行'}
                  </button>
                  <button
                    onClick={stopAction}
                    disabled={!isPlaying && !isPaused}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                      isPlaying || isPaused
                        ? 'bg-gradient-to-r from-rose-500/20 to-red-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-white/[0.06] text-white/40'
                    }`}
                  >
                    <Square className="h-3.5 w-3.5" />
                    停止
                  </button>
                  <button
                    onClick={resetToIdle}
                    disabled={isPlaying}
                    className={`flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-all ${
                      isPlaying ? 'bg-white/[0.06] text-white/40' : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.1]'
                    }`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] text-white/40">进度</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={actionProgress}
                    disabled={isPlaying}
                    onChange={handleProgressDrag}
                    className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-indigo-500"
                  />
                  <span className="font-mono text-[10px] text-white/60">{(actionProgress * 100).toFixed(0)}%</span>
                </div>

                <div className="mt-2 flex items-center gap-4 text-[10px] text-white/40">
                  <span>帧: <span className="text-white/60 font-mono">{currentFrameId}</span></span>
                  <span>夹爪: <span className={gripperState ? 'text-rose-400' : 'text-emerald-400'}>{gripperState ? '闭合' : '张开'}</span></span>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl glass p-4">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-violet-400" />
                    <h3 className="text-xs font-semibold text-white/80">轨迹可视化</h3>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={toggleTrajectory}
                      className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] font-medium transition-all ${
                        trajectoryVisible ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300' : 'bg-white/[0.06] text-white/50'
                      }`}
                    >
                      {trajectoryVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {trajectoryVisible ? '显示' : '隐藏'}
                    </button>
                    <button
                      onClick={() => { armRef.current?.clearTrajectory(); addLog('debug', '轨迹已清除'); }}
                      className="rounded-xl bg-white/[0.06] px-2.5 py-1.5 text-[10px] text-white/50 hover:bg-white/[0.1] transition-all"
                    >
                      清除
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl glass p-4">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500" />
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-blue-400" />
                  <h3 className="text-xs font-semibold text-white/80">上传动作文件</h3>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 w-full rounded-xl bg-white/[0.06] px-4 py-2.5 text-xs font-medium text-white/60 hover:bg-white/[0.1] transition-all"
                >
                  选择 JSON 文件
                </button>
              </div>

              <div className="relative overflow-hidden rounded-2xl glass p-4">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-pink-400" />
                    <h3 className="text-xs font-semibold text-white/80">模型外观</h3>
                  </div>
                  <button
                    onClick={resetModelAppearance}
                    className="flex items-center gap-1 rounded-xl px-2 py-1 text-[10px] text-white/40 hover:bg-white/[0.06] hover:text-white/70 transition-all"
                  >
                    <RefreshCw className="h-3 w-3" />
                    重置
                  </button>
                </div>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-[10px] text-white/50">颜色</span>
                    <input
                      type="color"
                      value={modelColor}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="h-6 w-8 cursor-pointer rounded-lg border-0 p-0"
                    />
                    <span className="font-mono text-[10px] text-white/40">{modelColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-[10px] text-white/50">金属度</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={modelMetalness}
                      onChange={(e) => handleMetalnessChange(parseFloat(e.target.value))}
                      className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-amber-500"
                    />
                    <span className="w-8 text-right font-mono text-[10px] text-white/50">{modelMetalness.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-[10px] text-white/50">粗糙度</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={modelRoughness}
                      onChange={(e) => handleRoughnessChange(parseFloat(e.target.value))}
                      className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-amber-500"
                    />
                    <span className="w-8 text-right font-mono text-[10px] text-white/50">{modelRoughness.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-[10px] text-white/50">透明度</span>
                    <input
                      type="range"
                      min={0.2}
                      max={1}
                      step={0.01}
                      value={modelOpacity}
                      onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                      className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-amber-500"
                    />
                    <span className="w-8 text-right font-mono text-[10px] text-white/50">{modelOpacity.toFixed(2)}</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modelWireframe}
                      onChange={handleWireframeToggle}
                      className="h-3 w-3 rounded accent-indigo-500"
                    />
                    <span className="text-[10px] text-white/50">线框模式</span>
                  </label>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl glass p-4">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500" />
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-xs font-semibold text-white/80">实时角度 (°)</h3>
                </div>
                <div className="mt-3 grid grid-cols-5 gap-1.5">
                  {jointDegrees.map((v, i) => (
                    <div key={i} className="rounded-xl bg-white/[0.06] px-2 py-1.5 text-center">
                      <p className="text-[9px] text-white/40">{jointLabels[i].split(' ')[0]}</p>
                      <p className="font-mono text-[10px] font-semibold text-white/80">{v.toFixed(1)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {!controlPanelOpen && (
        <button
          onClick={() => setControlPanelOpen(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 rounded-l-xl glass px-2 py-6 text-white/40 hover:text-white/70 transition-all"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      )}

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