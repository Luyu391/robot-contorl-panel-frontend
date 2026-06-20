/**
 * robotArm3D.ts — 参考 robot-arm-sim 架构重构
 * 
 * 核心设计：
 * - RobotArm 类：管理 GLB 模型加载、关节配置、GSAP 动画、轨迹可视化
 * - SceneBuilder：场景环境、光照、阴影、桌面
 * - 保留特色功能：物品抓取/放置、碰撞检测、演示模式
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';

// ==================== 类型定义 ====================

type JointAxis = 'X' | 'Y' | 'Z';

export interface JointConfig {
  name: string;
  axis: JointAxis;
  minAngle: number;    // 度
  maxAngle: number;    // 度
  defaultAngle: number;
  currentAngle: number;
}

export interface Keyframe {
  angles: number[];    // 弧度
  gripper: number;     // 0=夹紧, 1=张开
  duration: number;    // 毫秒
}

// ==================== 关节名称映射 ====================

export const JOINT_NAMES = ['base1', 'shoulder', 'elbow1', 'elbow2', 'wrist1'] as const;
export type JointName = (typeof JOINT_NAMES)[number];

const jointAxisMap: Record<string, JointAxis> = {
  base1: 'Y',
  shoulder: 'X',
  elbow1: 'X',
  elbow2: 'X',
  wrist1: 'Z',
};

const gripperNames = ['gripper1', 'gripper2'];
const gripperAxisMap: Record<string, JointAxis> = {
  gripper1: 'Y',
  gripper2: 'Y',
};

// 关节角度限制（度）- 参考真实工业机器人参数
const JOINT_LIMITS_DEG: Record<string, { min: number; max: number }> = {
  base1: { min: -180, max: 180 },
  shoulder: { min: -130, max: 130 },
  elbow1: { min: -150, max: 150 },
  elbow2: { min: -150, max: 150 },
  wrist1: { min: -180, max: 180 },
  gripper1: { min: -23, max: 30 },
  gripper2: { min: -30, max: 23 },
};

// ==================== 防穿模安全约束 ====================

/** 安全模式下的收紧关节限制 */
const SAFE_JOINT_LIMITS: Record<string, { min: number; max: number }> = {
  base1: { min: -180, max: 180 },
  shoulder: { min: -110, max: 110 },
  elbow1: { min: -120, max: 120 },
  elbow2: { min: -120, max: 120 },
  wrist1: { min: -180, max: 180 },
};

/** 关节间依赖规则：下游关节的安全范围取决于上游关节当前角度 */
const INTER_JOINT_RULES: {
  target: string;
  dependsOn: string;
  /** 当上游关节角度 <= threshold 时，target 的 min 限制 */
  whenBelow: { threshold: number; targetMin: number };
  /** 当上游关节角度 >= threshold 时，target 的 max 限制 */
  whenAbove: { threshold: number; targetMax: number };
}[] = [
  {
    // elbow2 与 elbow1 不能同时朝同一方向大幅折叠
    target: 'elbow2',
    dependsOn: 'elbow1',
    whenBelow: { threshold: -80, targetMin: -10 },
    whenAbove: { threshold: 80, targetMax: 10 },
  },
  {
    // elbow1 与 shoulder 避免同时大幅同向
    target: 'elbow1',
    dependsOn: 'shoulder',
    whenBelow: { threshold: -80, targetMin: -60 },
    whenAbove: { threshold: 80, targetMax: 60 },
  },
  {
    // elbow2 与 shoulder 间接约束
    target: 'elbow2',
    dependsOn: 'shoulder',
    whenBelow: { threshold: -90, targetMin: -20 },
    whenAbove: { threshold: 90, targetMax: 20 },
  },
];

/** 安全角度历史快照 */
export interface SafetySnapshot {
  angles: number[];
  timestamp: number;
}

// ==================== 轨迹可视化器 ====================

export interface TrajectoryPoint {
  position: THREE.Vector3;
  time: number;
  frameId: number;
}

export class TrajectoryVisualizer {
  private scene: THREE.Scene;
  private points: TrajectoryPoint[] = [];
  private line: THREE.Line | null = null;
  private startNode: THREE.Mesh | null = null;
  private endNode: THREE.Mesh | null = null;
  private visible = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  startNewTrajectory(): void {
    this.clear();
  }

  addPoint(point: TrajectoryPoint): void {
    this.points.push(point);
    this.updateLine();
    this.updateNodes();
  }

  private updateLine(): void {
    if (this.line) {
      this.scene.remove(this.line);
      this.line.geometry?.dispose();
      (this.line.material as THREE.Material)?.dispose();
    }
    if (this.points.length < 2) return;

    const positions = this.points.map((p) => p.position);
    const geo = new THREE.BufferGeometry().setFromPoints(positions);
    const mat = new THREE.LineDashedMaterial({
      color: 0x3b82f6,
      dashSize: 0.03,
      gapSize: 0.02,
    });
    this.line = new THREE.Line(geo, mat);
    this.line.computeLineDistances();
    this.line.visible = this.visible;
    this.scene.add(this.line);
  }

  private updateNodes(): void {
    if (this.startNode) {
      this.scene.remove(this.startNode);
      this.startNode.geometry?.dispose();
      (this.startNode.material as THREE.Material)?.dispose();
    }
    if (this.endNode) {
      this.scene.remove(this.endNode);
      this.endNode.geometry?.dispose();
      (this.endNode.material as THREE.Material)?.dispose();
    }
    if (this.points.length === 0) return;

    const startGeo = new THREE.SphereGeometry(0.012, 16, 16);
    this.startNode = new THREE.Mesh(startGeo, new THREE.MeshBasicMaterial({ color: 0x60a5fa }));
    this.startNode.position.copy(this.points[0].position);
    this.startNode.visible = this.visible;
    this.scene.add(this.startNode);

    if (this.points.length > 1) {
      const endGeo = new THREE.SphereGeometry(0.012, 16, 16);
      this.endNode = new THREE.Mesh(endGeo, new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
      this.endNode.position.copy(this.points[this.points.length - 1].position);
      this.endNode.visible = this.visible;
      this.scene.add(this.endNode);
    }
  }

  setVisible(v: boolean): void {
    this.visible = v;
    if (this.line) this.line.visible = v;
    if (this.startNode) this.startNode.visible = v;
    if (this.endNode) this.endNode.visible = v;
  }

  clear(): void {
    if (this.line) {
      this.scene.remove(this.line);
      this.line.geometry?.dispose();
      (this.line.material as THREE.Material)?.dispose();
      this.line = null;
    }
    if (this.startNode) {
      this.scene.remove(this.startNode);
      this.startNode.geometry?.dispose();
      (this.startNode.material as THREE.Material)?.dispose();
      this.startNode = null;
    }
    if (this.endNode) {
      this.scene.remove(this.endNode);
      this.endNode.geometry?.dispose();
      (this.endNode.material as THREE.Material)?.dispose();
      this.endNode = null;
    }
    this.points = [];
  }

  dispose(): void {
    this.clear();
  }

  /** 从机械臂模型获取末端执行器世界坐标 */
  static getEndEffectorPosition(model: THREE.Group | null): THREE.Vector3 | null {
    if (!model) return null;
    const dummy = new THREE.Object3D();
    model.traverse((child) => {
      if (child.name === 'gripper_base') {
        dummy.position.set(0.15, 0, 0);
        child.add(dummy);
      }
    });
    const pos = new THREE.Vector3();
    dummy.getWorldPosition(pos);
    return pos;
  }
}

// ==================== RobotArm 类 ====================

export class RobotArm {
  private scene: THREE.Scene;
  public model: THREE.Group | null = null;
  private joints: Map<string, THREE.Object3D> = new Map();
  private jointConfigs: JointConfig[] = [];
  private grippers: Map<string, THREE.Object3D> = new Map();
  private gripperConfigs: JointConfig[] = [];
  private allConfigs: JointConfig[] = [];
  private loader: GLTFLoader;
  private animTimeline: gsap.core.Timeline | null = null;
  private gripperTimeline: gsap.core.Timeline | null = null;
  private gripperOpenness = 0;
  public trajectoryVisualizer: TrajectoryVisualizer;
  private trajectoryInterval: number | null = null;
  private trajectoryFrameId = 0;
  private isRecording = false;
  private constantVelocity = 360 / 4.8; // 度/秒

  // ─── 碰撞检测回调 (由外部设置) ───
  public onCollisionDetected?: (collided: boolean) => void;

  // ─── 防穿模安全系统 ───
  public safetyEnabled = true;
  private lastSafeSnapshot: SafetySnapshot | null = null;
  private safetyWarningTimeout: ReturnType<typeof setTimeout> | null = null;
  public onSafetyWarning?: (message: string) => void;
  public onSafetyViolation?: (jointName: string, requested: number, clamped: number) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();
    this.trajectoryVisualizer = new TrajectoryVisualizer(scene);
  }

  // ==================== 模型加载 ====================

  async loadModel(): Promise<void> {
    const gltf = await this.loader.loadAsync('/models/arm.glb');
    this.model = gltf.scene;
    this.model.scale.setScalar(1);
    this.model.position.set(0, 0, 0);

    // 设置阴影
    this.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.receiveShadow = false;
        child.castShadow = true;
      }
    });

    this.scene.add(this.model);
    this.initializeJoints();
    console.log('[RobotArm] 模型加载完成，关节数:', this.joints.size);
  }

  private initializeJoints(): void {
    if (!this.model) return;

    this.model.traverse((child) => {
      // 关节
      if (JOINT_NAMES.includes(child.name as JointName)) {
        const helper = new THREE.AxesHelper(0.1);
        child.add(helper);
        this.joints.set(child.name, child);

        const axis = jointAxisMap[child.name];
        const limits = JOINT_LIMITS_DEG[child.name];
        const currentDeg = THREE.MathUtils.radToDeg(
          child.rotation[axis.toLowerCase() as keyof THREE.Euler] as number
        );

        this.jointConfigs.push({
          name: child.name,
          axis,
          minAngle: limits.min,
          maxAngle: limits.max,
          defaultAngle: 0,
          currentAngle: currentDeg,
        });
      }

      // 夹爪
      if (gripperNames.includes(child.name)) {
        const helper = new THREE.AxesHelper(0.05);
        child.add(helper);
        this.grippers.set(child.name, child);

        const axis = gripperAxisMap[child.name];
        const limits = JOINT_LIMITS_DEG[child.name];
        const currentDeg = THREE.MathUtils.radToDeg(
          child.rotation[axis.toLowerCase() as keyof THREE.Euler] as number
        );

        this.gripperConfigs.push({
          name: child.name,
          axis,
          minAngle: limits.min,
          maxAngle: limits.max,
          defaultAngle: 0,
          currentAngle: currentDeg,
        });
      }
    });

    this.allConfigs = [...this.jointConfigs, ...this.gripperConfigs];
  }

  // ==================== 关节角度设置 ====================

  setJointAngle(name: string, angleDeg: number): void {
    const joint = this.joints.get(name);
    const config = this.jointConfigs.find((c) => c.name === name);
    if (!joint || !config) return;

    const clamped = Math.max(config.minAngle, Math.min(config.maxAngle, angleDeg));
    config.currentAngle = clamped;

    const rad = THREE.MathUtils.degToRad(clamped);
    switch (config.axis) {
      case 'X': joint.rotation.x = rad; break;
      case 'Y': joint.rotation.y = rad; break;
      case 'Z': joint.rotation.z = rad; break;
    }
  }

  setGripperAngle(name: string, angleDeg: number): void {
    const gripper = this.grippers.get(name);
    const config = this.gripperConfigs.find((c) => c.name === name);
    if (!gripper || !config) return;

    const clamped = Math.max(config.minAngle, Math.min(config.maxAngle, angleDeg));
    config.currentAngle = clamped;

    const rad = THREE.MathUtils.degToRad(clamped);
    switch (config.axis) {
      case 'X': gripper.rotation.x = rad; break;
      case 'Y': gripper.rotation.y = rad; break;
      case 'Z': gripper.rotation.z = rad; break;
    }
  }

  setGripperOpenness(openness: number): void {
    const o = Math.max(0, Math.min(1, openness));
    this.gripperOpenness = o;

    const g1 = this.gripperConfigs.find((c) => c.name === 'gripper1');
    const g2 = this.gripperConfigs.find((c) => c.name === 'gripper2');
    if (!g1 || !g2) return;

    const a1 = g1.minAngle + o * (g1.maxAngle - g1.minAngle);
    const a2 = g2.maxAngle + o * (g2.minAngle - g2.maxAngle);

    this.setGripperAngle('gripper1', a1);
    this.setGripperAngle('gripper2', a2);
  }

  getJointAngle(name: string): number {
    return this.jointConfigs.find((c) => c.name === name)?.currentAngle ?? 0;
  }

  getJointConfigs(): JointConfig[] {
    return [...this.jointConfigs];
  }

  getGripperConfigs(): JointConfig[] {
    return [...this.gripperConfigs];
  }

  getJointRadians(): number[] {
    return this.jointConfigs.map((c) => THREE.MathUtils.degToRad(c.currentAngle));
  }

  setAllJointRadians(radians: number[]): void {
    radians.forEach((rad, i) => {
      if (i < this.jointConfigs.length) {
        const deg = THREE.MathUtils.radToDeg(rad);
        this.setJointAngle(this.jointConfigs[i].name, deg);
      }
    });
  }

  // ==================== GSAP 动画 ====================

  /** 动画单个关节到目标角度(度) */
  animateJoint(
    name: string,
    targetDeg: number,
    duration: number,
    onUpdate?: () => void,
    onComplete?: () => void
  ): void {
    const config = this.jointConfigs.find((c) => c.name === name);
    if (!config) return;

    const clamped = Math.max(config.minAngle, Math.min(config.maxAngle, targetDeg));

    gsap.killTweensOf(config, 'currentAngle');
    gsap.to(config, {
      currentAngle: clamped,
      duration: duration / 1000,
      ease: 'none',
      onUpdate: () => {
        this.setJointAngle(name, config.currentAngle);
        onUpdate?.();
      },
      onComplete: () => onComplete?.(),
    });
  }

  /** 同时动画多个关节 */
  animateJoints(
    targets: { name: string; deg: number }[],
    duration: number,
    onUpdate?: () => void,
    onComplete?: () => void
  ): void {
    if (this.animTimeline) {
      this.animTimeline.kill();
      this.animTimeline = null;
    }

    this.animTimeline = gsap.timeline({
      onComplete: () => {
        this.animTimeline = null;
        onComplete?.();
      },
    });

    targets.forEach(({ name, deg }) => {
      const config = this.jointConfigs.find((c) => c.name === name);
      if (!config) return;
      const clamped = Math.max(config.minAngle, Math.min(config.maxAngle, deg));
      this.animTimeline!.to(
        config,
        {
          currentAngle: clamped,
          duration: duration / 1000,
          ease: 'none',
          onUpdate: () => {
            this.setJointAngle(name, config.currentAngle);
            onUpdate?.();
          },
        },
        0
      );
    });
  }

  /** 动画设置夹爪开合 */
  animateGripper(openness: number, duration: number, onComplete?: () => void): void {
    if (this.gripperTimeline) this.gripperTimeline.kill();
    this.gripperTimeline = gsap.timeline({
      onComplete: () => {
        this.gripperTimeline = null;
        onComplete?.();
      },
    });
    this.gripperTimeline.to(this, {
      gripperOpenness: openness,
      duration: duration / 1000,
      ease: 'none',
      onUpdate: () => this.setGripperOpenness(this.gripperOpenness),
    });
  }

  /** 停止所有关节动画 */
  stopAllAnimations(): void {
    this.jointConfigs.forEach((c) => gsap.killTweensOf(c, 'currentAngle'));
    this.gripperConfigs.forEach((c) => gsap.killTweensOf(c, 'currentAngle'));
    if (this.animTimeline) {
      this.animTimeline.kill();
      this.animTimeline = null;
    }
    if (this.gripperTimeline) {
      this.gripperTimeline.kill();
      this.gripperTimeline = null;
    }
    this.stopTrajectory();
  }

  /** 停止所有正在进行的动画 */
  stopAllAnimations(): void {
    // 停止 GSAP 全局时间线
    gsap.globalTimeline.pause();
    gsap.globalTimeline.clear();

    // 停止关节动画
    this.allConfigs.forEach((config) => {
      gsap.killTweensOf(config);
    });

    // 停止关节时间线
    if (this.animTimeline) {
      this.animTimeline.kill();
      this.animTimeline = null;
    }

    // 停止夹爪时间线
    if (this.gripperTimeline) {
      this.gripperTimeline.kill();
      this.gripperTimeline = null;
    }
  }

  /** 重置所有关节到0度 (匀速) */
  resetAll(onComplete?: () => void): void {
    this.stopAllAnimations();

    let remaining = this.allConfigs.length;
    if (remaining === 0) { onComplete?.(); return; }

    this.allConfigs.forEach((config) => {
      gsap.killTweensOf(config, 'currentAngle');
      const dur = Math.abs(config.currentAngle - 0) / this.constantVelocity;
      gsap.to(config, {
        currentAngle: 0,
        duration: dur,
        ease: 'none',
        onUpdate: () => {
          config.name.includes('gripper')
            ? this.setGripperAngle(config.name, config.currentAngle)
            : this.setJointAngle(config.name, config.currentAngle);
        },
        onComplete: () => {
          remaining--;
          if (remaining <= 0) onComplete?.();
        },
      });
    });
  }

  // ==================== 轨迹记录 ====================

  startTrajectory(): void {
    this.trajectoryVisualizer.startNewTrajectory();
    this.trajectoryFrameId = 0;
    this.isRecording = true;
    this.trajectoryInterval = window.setInterval(() => {
      const pos = TrajectoryVisualizer.getEndEffectorPosition(this.model);
      if (pos) {
        this.trajectoryVisualizer.addPoint({
          position: pos.clone(),
          time: Date.now(),
          frameId: this.trajectoryFrameId++,
        });
      }
    }, 50);
  }

  stopTrajectory(): void {
    this.isRecording = false;
    if (this.trajectoryInterval !== null) {
      clearInterval(this.trajectoryInterval);
      this.trajectoryInterval = null;
    }
  }

  showTrajectory(v: boolean): void {
    this.trajectoryVisualizer.setVisible(v);
  }

  clearTrajectory(): void {
    this.trajectoryVisualizer.clear();
  }

  // ==================== 正向运动学 ====================

  /** 获取末端执行器世界坐标 */
  getEndEffectorPosition(): THREE.Vector3 {
    const pos = new THREE.Vector3();
    if (!this.model) return pos;

    const dummy = new THREE.Object3D();
    let attached = false;
    this.model.traverse((child) => {
      if (child.name === 'gripper_base') {
        dummy.position.set(0.15, 0, 0);
        child.add(dummy);
        attached = true;
      }
    });
    dummy.getWorldPosition(pos);
    return pos;
  }

  /** 获取当前关节角度 (度) */
  getJointDegrees(): number[] {
    return this.jointConfigs.map((c) => c.currentAngle);
  }

  // ==================== 防穿模安全系统 ====================

  /** 获取关节在安全模式下的有效角度范围，考虑相邻关节依赖 */
  getSafeAngleRange(name: string): { min: number; max: number } {
    const base = this.safetyEnabled
      ? (SAFE_JOINT_LIMITS[name] || JOINT_LIMITS_DEG[name])
      : JOINT_LIMITS_DEG[name];
    const result = { min: base.min, max: base.max };

    if (!this.safetyEnabled) return result;

    // 应用关节间依赖规则
    for (const rule of INTER_JOINT_RULES) {
      if (rule.target !== name) continue;
      const depConfig = this.jointConfigs.find((c) => c.name === rule.dependsOn);
      if (!depConfig) continue;
      const depAngle = depConfig.currentAngle;

      if (depAngle <= rule.whenBelow.threshold) {
        result.min = Math.max(result.min, rule.whenBelow.targetMin);
      }
      if (depAngle >= rule.whenAbove.threshold) {
        result.max = Math.min(result.max, rule.whenAbove.targetMax);
      }
    }

    return result;
  }

  /** 检查当前姿态是否安全 */
  checkSafety(): boolean {
    if (!this.safetyEnabled) return true;
    for (const config of this.jointConfigs) {
      const safeRange = this.getSafeAngleRange(config.name);
      if (config.currentAngle < safeRange.min || config.currentAngle > safeRange.max) {
        return false;
      }
    }
    return true;
  }

  /** 保存当前角度作为安全快照 */
  saveSafeSnapshot(): void {
    this.lastSafeSnapshot = {
      angles: this.jointConfigs.map((c) => c.currentAngle),
      timestamp: Date.now(),
    };
  }

  /** 设置关节角度（带安全约束） */
  setJointAngleSafe(name: string, angleDeg: number): number {
    const joint = this.joints.get(name);
    const config = this.jointConfigs.find((c) => c.name === name);
    if (!joint || !config) return 0;

    let clamped = Math.max(config.minAngle, Math.min(config.maxAngle, angleDeg));

    if (this.safetyEnabled) {
      const safeRange = this.getSafeAngleRange(name);
      const requested = clamped;
      clamped = Math.max(safeRange.min, Math.min(safeRange.max, clamped));

      if (clamped !== requested && this.onSafetyViolation) {
        this.onSafetyViolation(name, requested, clamped);
      }
    }

    config.currentAngle = clamped;
    const rad = THREE.MathUtils.degToRad(clamped);
    switch (config.axis) {
      case 'X': joint.rotation.x = rad; break;
      case 'Y': joint.rotation.y = rad; break;
      case 'Z': joint.rotation.z = rad; break;
    }

    // 连锁更新：此关节变化可能影响下游关节的安全范围
    if (this.safetyEnabled) {
      for (const rule of INTER_JOINT_RULES) {
        if (rule.dependsOn === name) {
          const targetConfig = this.jointConfigs.find((c) => c.name === rule.target);
          if (targetConfig) {
            const targetSafeRange = this.getSafeAngleRange(rule.target);
            if (targetConfig.currentAngle < targetSafeRange.min) {
              this.setJointAngleSafe(rule.target, targetSafeRange.min);
            } else if (targetConfig.currentAngle > targetSafeRange.max) {
              this.setJointAngleSafe(rule.target, targetSafeRange.max);
            }
          }
        }
      }
    }

    // 如果当前状态安全，更新快照
    if (this.checkSafety()) {
      this.saveSafeSnapshot();
    }

    return clamped;
  }

  /** 回归到最近的安全姿态 */
  restoreSafe(onComplete?: () => void): void {
    const snapshot = this.lastSafeSnapshot;
    if (!snapshot) {
      // 没有安全快照，回归到全零
      this.resetAll(onComplete);
      return;
    }

    this.stopAllAnimations();
    let remaining = this.jointConfigs.length;
    if (remaining === 0) { onComplete?.(); return; }

    this.jointConfigs.forEach((config, i) => {
      const targetDeg = snapshot.angles[i] ?? 0;
      gsap.killTweensOf(config, 'currentAngle');
      const dur = Math.abs(config.currentAngle - targetDeg) / this.constantVelocity;
      gsap.to(config, {
        currentAngle: targetDeg,
        duration: dur,
        ease: 'power2.out',
        onUpdate: () => this.setJointAngle(config.name, config.currentAngle),
        onComplete: () => {
          remaining--;
          if (remaining <= 0) {
            this.onSafetyWarning?.('已回归安全姿态');
            onComplete?.();
          }
        },
      });
    });
  }

  /** 更新所有关节的 min/max 限制（根据安全模式） */
  updateSafetyLimits(): void {
    this.jointConfigs.forEach((config) => {
      if (this.safetyEnabled) {
        const safe = SAFE_JOINT_LIMITS[config.name];
        if (safe) {
          config.minAngle = safe.min;
          config.maxAngle = safe.max;
        }
      } else {
        const orig = JOINT_LIMITS_DEG[config.name];
        if (orig) {
          config.minAngle = orig.min;
          config.maxAngle = orig.max;
        }
      }
    });
  }

  /** 获取安全状态摘要 */
  getSafetyStatus(): { isSafe: boolean; warnings: string[] } {
    const warnings: string[] = [];
    if (!this.safetyEnabled) return { isSafe: true, warnings: ['安全模式已关闭'] };

    for (const config of this.jointConfigs) {
      const safeRange = this.getSafeAngleRange(config.name);
      if (config.currentAngle < safeRange.min) {
        warnings.push(`${config.name} 角度过低 (${config.currentAngle.toFixed(0)}° < ${safeRange.min}°)`);
      } else if (config.currentAngle > safeRange.max) {
        warnings.push(`${config.name} 角度过高 (${config.currentAngle.toFixed(0)}° > ${safeRange.max}°)`);
      }
    }

    return { isSafe: warnings.length === 0, warnings };
  }

  // ==================== 销毁 ====================

  dispose(): void {
    this.stopAllAnimations();
    this.stopTrajectory();
    this.trajectoryVisualizer.dispose();
    if (this.model) {
      this.scene.remove(this.model);
      this.model.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
    }
  }
}

// ==================== 场景构建器 ====================

export function createScene(canvas: HTMLCanvasElement, w: number, h: number): {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
} {
  const scene = new THREE.Scene();

  // 背景色 — 科研工业风格
  scene.background = new THREE.Color('#e8ecf1');
  scene.fog = new THREE.Fog('#e8ecf1', 6, 20);

  const camera = new THREE.PerspectiveCamera(50, w / Math.max(h, 1), 0.5, 50);
  camera.position.set(2.0, 2.4, -2.0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  return { scene, camera, renderer };
}

export function setupLighting(scene: THREE.Scene, textureLoader: THREE.TextureLoader): void {
  // 环境光
  scene.add(new THREE.AmbientLight('#404040', 0.55));

  // 环境贴图 (PBR)
  const envTexture = textureLoader.load('/texture/envmap/room.png');
  envTexture.mapping = THREE.EquirectangularReflectionMapping;
  envTexture.colorSpace = THREE.SRGBColorSpace;
  scene.environment = envTexture;
  scene.backgroundBlurriness = 0;

  // 半球光
  scene.add(new THREE.HemisphereLight('#ffffff', '#8899aa', 0.3));

  // 主方向光 + 阴影
  const key = new THREE.DirectionalLight('#ffffff', 0.9);
  key.position.set(8, 10, 4);
  key.castShadow = true;
  key.shadow.mapSize.width = 2048;
  key.shadow.mapSize.height = 2048;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.00005;
  key.shadow.normalBias = 0.02;
  scene.add(key);

  // 补光
  const fill = new THREE.DirectionalLight('#c8d6e5', 0.35);
  fill.position.set(-3, 5, -2);
  scene.add(fill);

  // 底部补光 (减少暗面)
  const rim = new THREE.DirectionalLight('#dfe6e9', 0.25);
  rim.position.set(0, -1, 0);
  scene.add(rim);
}

export function setupGround(scene: THREE.Scene): { targetZone: THREE.Group } {
  // ─── 地面阴影接收面 ───
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.ShadowMaterial({ opacity: 0.22 })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.001;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  // ─── 网格 ───
  const grid = new THREE.GridHelper(16, 32, '#cbd5e1', '#e2e8f0');
  grid.position.y = 0.002;
  scene.add(grid);

  // ─── 坐标轴 (小) ───
  const axes = new THREE.AxesHelper(1.5);
  axes.position.set(-2, 0.003, -2);
  scene.add(axes);

  // ─── 目标放置区（地面） ───
  const targetZone = new THREE.Group();
  targetZone.position.set(0.6, 0.005, -0.6);

  const ringGeo = new THREE.RingGeometry(0.18, 0.3, 48);
  const ringMat = new THREE.MeshStandardMaterial({
    color: '#3b82f6', emissive: '#3b82f6', emissiveIntensity: 0.5,
    transparent: true, opacity: 0.55, side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.receiveShadow = true;
  targetZone.add(ring);

  const glowGeo = new THREE.RingGeometry(0.13, 0.38, 48);
  const glowMat = new THREE.MeshBasicMaterial({ color: '#3b82f6', transparent: true, opacity: 0.06, side: THREE.DoubleSide });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.002;
  targetZone.add(glow);

  scene.add(targetZone);

  return { targetZone };
}