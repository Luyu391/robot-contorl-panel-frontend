# Week 3 — GSAP 动画与 Three.js 集成问题

> 工具：Trae AI 调试协助，记录于 2026-06

## 我问

我在使用 GSAP 对 Three.js 机械臂模型进行动画时遇到了问题：当多个关节同时运动时，动画不同步。我用的是这样的代码：

```typescript
targets.forEach(({ name, deg }) => {
  gsap.to(config, {
    currentAngle: deg,
    duration: duration / 1000,
    onUpdate: () => this.setJointAngle(name, config.currentAngle),
  });
});
```

问题是每个动画各自独立，无法保证同时开始和结束。

## AI 答

这是 GSAP timeline 的典型应用场景。你需要使用 `gsap.timeline()` 来同步多个动画：

```typescript
const tl = gsap.timeline();

targets.forEach(({ name, deg }) => {
  tl.to(config, {
    currentAngle: deg,
    duration: duration / 1000,
    ease: 'none',
    onUpdate: () => this.setJointAngle(name, config.currentAngle),
  }, 0);  // 第三个参数 0 表示从 timeline 起始点开始
});

tl.eventCallback('onComplete', () => { /* ... */ });
```

关键点：`timeline()` 创建的是一个时间轴，所有添加到它的 tweens 都会相对于这个时间轴开始，而不是立即开始。

## 我后来做了什么

重构了 `animateJoints` 方法，使用 `gsap.timeline()` 同步多关节动画。同时发现一个问题：timeline 的 `onComplete` 回调在最后一个 tween 结束时触发，但如果某个 tween 被 kill 掉，timeline 需要手动置 null。

另外，夹爪动画需要独立的 timeline，因为夹爪操作通常是独立于主关节运动的。
