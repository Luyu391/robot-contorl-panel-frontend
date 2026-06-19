# OpenRobot Control Panel · 迭代优化计划 v2

> 基于项目全量遍历与 Module D 参考项目对比，制定本优化计划。
> 每一项优化均标注优先级、影响范围和预期效果。

---

## 一、性能优化（P0）

### 1.1 全局 RobotContext 替代多实例 useRobotStatus
- **问题**：DashboardPage 和 MonitorPage 各自调用 `useRobotStatus()`，导致同一 API 被轮询两次（2s×2 = 每2秒2次请求）
- **方案**：创建 `RobotContext`，在 App 层单次轮询，子组件通过 `useContext` 读取
- **预期**：API 请求量减半，状态一致性保证

### 1.2 React.memo 包裹纯展示组件
- **问题**：StatusIndicator、JointVisualizer、StatsPanel、SystemHealth、CoordinateViewer 等组件在父组件重渲染时都会不必要地重渲染
- **方案**：用 `React.memo()` 包裹所有纯展示组件
- **预期**：减少 30-50% 不必要的子组件渲染

### 1.3 useMemo / useCallback 补全
- **问题**：DashboardPage 的 `successRate` 每次渲染都重新计算；App.tsx 的 `makeDashboardExecute` 未用 useCallback
- **方案**：补全所有缺失的 memoization

### 1.4 路由懒加载
- **问题**：MonitorPage/SettingsPage/HelpPage 用了 Suspense 但没用 lazy，首屏加载了全部代码
- **方案**：`React.lazy(() => import(...))` 实现代码分割

### 1.5 请求取消（AbortController + cancelled flag）
- **问题**：useRobotStatus、CommandPanel 的 fetch 没有取消机制，组件卸载后可能 setState
- **方案**：useEffect cleanup 中 abort 请求

---

## 二、动画增强（P0）

### 2.1 入场 Stagger 动画系统
- **方案**：创建 `staggerContainer` + `staggerItem` 变体，统一管理所有列表/卡片的逐项入场动画
- **预期**：视觉节奏感大幅提升

### 2.2 粒子背景
- **方案**：用 Canvas + requestAnimationFrame 绘制浮动粒子，增加科技感
- **预期**：页面不再"静态"，有呼吸感

### 2.3 StatusIndicator reduced-motion 适配
- **问题**：framer-motion 的 animate 不受 CSS prefers-reduced-motion 控制
- **方案**：在 StatusIndicator 中使用 useReducedMotion hook，reduced 时禁用动画

### 2.4 微交互增强
- **方案**：按钮 hover 时添加 scale + shadow 变化；卡片 hover 时添加边框发光；输入框 focus 时添加脉冲光环

---

## 三、视觉华丽度（P1）

### 3.1 渐变卡片升级
- **方案**：统计卡片使用渐变背景（primary-600→primary-400）；快捷操作按钮使用微渐变

### 3.2 玻璃拟态升级
- **方案**：面板卡片增加 `backdrop-blur-xl` + 半透明边框 + 内发光

### 3.3 动态光晕
- **方案**：背景光晕跟随鼠标位置微移（CSS transform），增加空间感

### 3.4 暗色模式
- **方案**：添加 `dark:` Tailwind 变体，通过 Settings 页面切换

---

## 四、过渡与交互（P1）

### 4.1 SafetyGuard 焦点陷阱
- **问题**：Tab 键可以跳出安全确认弹窗
- **方案**：参考 ExecutionReveal 的焦点陷阱实现

### 4.2 LLM 缓存 source 追踪
- **方案**：缓存条目增加 `source: 'llm' | 'cache' | 'fallback'` 和 `latencyMs` 字段

### 4.3 缓存清理 API
- **方案**：导出 `clearLlmCache()` 函数

### 4.4 sr-only 辅助文本
- **方案**：为图标按钮和装饰性元素添加 sr-only 文本

---

## 五、执行顺序

1. ✅ 全局 RobotContext（1.1）
2. ✅ React.memo + useMemo/useCallback（1.2 + 1.3）
3. ✅ 路由懒加载（1.4）
4. ✅ 请求取消（1.5）
5. ✅ 入场 Stagger 系统（2.1）
6. ✅ 粒子背景（2.2）
7. ✅ StatusIndicator 适配（2.3）
8. ✅ 微交互增强（2.4）
9. ✅ 渐变卡片 + 玻璃拟态（3.1 + 3.2）
10. ✅ 动态光晕（3.3）
11. ✅ 暗色模式（3.4）
12. ✅ SafetyGuard 焦点陷阱（4.1）
13. ✅ LLM 缓存增强（4.2 + 4.3）
