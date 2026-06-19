# LEARNINGS — 踩坑笔记与迭代日志

## Week 1: 液态玻璃设计系统

### 遇到的问题

#### 问题 1: Safari 下 backdrop-filter 不生效

**现象**：在 Chrome 下正常的玻璃效果，在 Safari 下完全透明。

**原因**：Safari 需要 `-webkit-backdrop-filter` 前缀，且在某些版本下需要特定的 `background` 属性配合。

**解决**：
```css
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px); /* Safari */
}
```

#### 问题 2: 动画导致性能下降

**现象**：粒子背景和光球动画导致页面卡顿，特别是在低端设备上。

**解决**：实现 `useReducedMotion` hook，根据系统偏好关闭动画。同时使用 CSS `will-change` 属性优化动画性能。

---

## Week 2: 安全系统设计

### 遇到的问题

#### 问题 1: 关节间依赖规则冲突

**现象**：定义了多条依赖规则后，机械臂有时会陷入"死锁"状态，无法运动到某些合法位置。

**原因**：不同规则之间可能存在冲突，当多个依赖关节都处于边界值时，约束会过度收紧。

**解决**：
1. 重新设计规则，只在极端情况下触发约束
2. 添加规则优先级机制
3. 在 UI 上显示当前的安全约束状态，让用户理解限制原因

#### 问题 2: 安全快照时机

**现象**：保存的安全快照在恢复后，机械臂会"瞬移"到快照位置，用户体验不好。

**解决**：快照恢复时使用 GSAP 动画平滑过渡，而不是瞬间切换。

---

## Week 3: Three.js 与 GSAP 集成

### 遇到的问题

#### 问题 1: 多关节动画不同步

**现象**：控制多个关节同时运动时，动画开始时间不一致，运动轨迹不流畅。

**原因**：每个 `gsap.to()` 调用都立即开始，无法保证多个动画同时开始。

**解决**：使用 `gsap.timeline()` 创建时间轴，所有动画相对于时间轴起始点对齐。

```typescript
const tl = gsap.timeline();
targets.forEach(({ name, deg }) => {
  tl.to(config, { currentAngle: deg, duration: 1 }, 0); // 第三个参数 0 表示从起始点开始
});
```

#### 问题 2: 内存泄漏

**现象**：长时间使用 3D 操控台后，浏览器内存持续增长，最终导致页面崩溃。

**原因**：
1. GSAP 动画未正确清理
2. Three.js 对象未 dispose
3. 事件监听器未移除

**解决**：
1. 在组件卸载时调用 `gsap.killTweensOf()`
2. 清理 Three.js 几何体和材质：`geometry.dispose(); material.dispose()`
3. 使用 useEffect 返回清理函数

---

## Week 4: 卡片栈交互

### 遇到的问题

#### 问题 1: 快速短滑无法触发

**现象**：用户快速短促地滑动卡片时，卡片不会飞出，而是弹回中央。

**原因**：只判断了 `offset`（位移距离），没有判断 `velocity`（速度）。

**解决**：双重判定，满足其一即可触发：
```typescript
const OFFSET_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 500;

if (Math.abs(offsetX) > OFFSET_THRESHOLD || Math.abs(velocityX) > VELOCITY_THRESHOLD) {
  // 触发飞出
}
```

#### 问题 2: Canvas 粒子效果卡顿

**现象**：卡片飞出时的粒子效果帧率不稳定，特别是粒子数量多的时候。

**原因**：每帧创建新的 Canvas 对象，没有复用；粒子更新逻辑效率低。

**解决**：
1. 复用 Canvas 对象，使用 `ctx.clearRect()` 清空而非创建新 Canvas
2. 使用对象池管理粒子，避免每帧创建销毁对象
3. 限制最大粒子数量

---

## Week 5: MSW 与离线模式

### 遇到的问题

#### 问题 1: 首次加载时 MSW 初始化延迟

**现象**：页面首次加载时，有时会短暂显示"网络错误"提示，然后才正常显示。

**原因**：MSW Service Worker 启动需要时间，在其准备好之前，fetch 请求会失败。

**解决**：在 `main.tsx` 中等待 MSW 初始化完成后再渲染应用：
```typescript
async function prepare() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser');
    await worker.start();
  }
  render(<App />);
}
prepare();
```

#### 问题 2: 离线模式下数据不更新

**现象**：启用离线模式后，数据显示的是缓存的旧数据，不会更新。

**解决**：在 OfflineContext 中维护一个"数据新鲜度"状态，当检测到网络恢复时，主动重新请求数据。

---

## 迭代记录

### v1.0 → v1.1
- 增加了液态玻璃暗色主题优化
- 修复了 Safari 兼容性问题
- 添加了 `useReducedMotion` 支持

### v1.1 → v1.2
- 实现了多层安全约束系统
- 添加了关节间依赖规则
- 增加了安全快照功能

### v1.2 → v1.3
- 重构了 3D 操控台架构
- 使用 GSAP timeline 同步多关节动画
- 优化了内存管理

### v1.3 → v1.4
- 实现了方案推荐卡片栈
- 添加了 Canvas 粒子效果
- 支持键盘和手势控制
