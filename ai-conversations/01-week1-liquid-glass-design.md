# Week 1 — 设计液态玻璃风格

> 工具：Trae AI 辅助设计，记录于 2026-06

## 我问

我想做一个机械臂控制面板，想采用类似 Apple Vision Pro 的液态玻璃风格设计。具体来说，我想实现：
1. backdrop-filter 模糊效果
2. 动态渐变背景
3. 浮动光球动画
4. 暗色主题优化

我应该如何组织 CSS 结构，如何处理 Safari 的兼容性问题？

## AI 答

液态玻璃效果的核心是 CSS 的 `backdrop-filter` 属性。建议按以下结构组织：

```css
/* 基础玻璃效果 */
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* 暗色主题下的玻璃 */
.dark .glass {
  background: rgba(0, 0, 0, 0.3);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
```

Safari 兼容性需要 `-webkit-backdrop-filter` 前缀。同时注意 `backdrop-filter` 性能开销较大，建议在低端设备上降级处理。

## 我后来做了什么

采用了 AI 建议的 CSS 结构，并封装成 `LiquidGlass.tsx` 组件。添加了 `useReducedMotion` hook 来检测用户偏好，在减少动画模式下关闭光球动画和渐变背景动画，提升性能。同时实现了根据背景复杂度自适应模糊半径的逻辑。
