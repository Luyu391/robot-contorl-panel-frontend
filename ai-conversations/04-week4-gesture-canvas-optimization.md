# Week 4 — 卡片栈手势识别与 Canvas 粒子效果

> 工具：Trae AI 技术调研，记录于 2026-06

## 我问

我在方案推荐页面实现了类似 Tinder 的卡片栈交互，支持手势滑动和键盘控制。我遇到了两个问题：
1. 快速短滑（位移小但速度快）的手势无法触发飞出
2. 卡片飞出时的粒子效果使用了 Canvas，但动画帧率不稳定

## AI 答

问题1的解决方案：同时判断 `offset` 和 `velocity`，两个条件满足其一即可触发：

```typescript
const SWIPE_THRESHOLD_OFFSET = 80;
const SWIPE_THRESHOLD_VELOCITY = 500;

function determineDirection(ox, oy, vx, vy) {
  const vOk = Math.abs(oy) > SWIPE_THRESHOLD_OFFSET || Math.abs(vy) > SWIPE_THRESHOLD_VELOCITY;
  const hOk = Math.abs(ox) > SWIPE_THRESHOLD_OFFSET || Math.abs(vx) > SWIPE_THRESHOLD_VELOCITY;
  // ...
}
```

问题2的解决方案：使用 `requestAnimationFrame` 并添加帧率控制：

```typescript
const tick = () => {
  if (frame >= maxFrames) return;
  ctx.clearRect(0, 0, width, height);
  // 绘制逻辑
  frame++;
  requestAnimationFrame(tick);
};
```

同时注意在组件卸载时清理 RAF 和 Canvas 资源。

## 我后来做了什么

1. 实现了 offset + velocity 双重判定逻辑
2. 添加了 `spawnFirework` 函数产生双层粒子效果
3. 粒子颜色根据滑动方向变化（左=红，右=绿，上=紫，下=黄）
4. 动画在 55 帧后自动清理，避免内存泄漏
5. 添加了手势识别功能（MediaPipe Hands），用户可以通过摄像头手势控制卡片
