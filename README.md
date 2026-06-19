# OpenRobot 机械臂控制面板

基于 React 18 + Vite 5 的智能机械臂前端控制面板，采用**类 Apple 液态玻璃（Liquid Glass）设计风格**，集成自然语言指令、实时监控、3D 操控、动作序列执行和方案推荐功能。

---

## 设计特色

### 液态玻璃设计语言
- **通透感**：backdrop-filter 模糊效果，营造玻璃质感
- **流动感**：动态渐变背景、浮动光球、流动光效动画
- **柔和光晕**：精心设计的阴影和高光层次
- **暗色主题**：专为深色模式优化的玻璃效果

---

## 快速开始

```bash
npm install
npm run dev            # Vite 起在 http://localhost:5174
npm run test           # vitest 跑全部测试
npm run build          # tsc + vite build
```

---

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18 | UI 框架 |
| Vite | 5 | 构建工具，端口 5174 |
| TypeScript | 5 | 类型安全 |
| Tailwind CSS | 3 | 样式，PostCSS + CJS 配置 |
| Framer Motion | 11 | 动画、拖拽、转场 |
| GSAP | 3.15 | 复杂动画序列控制 |
| MSW | 2 | Mock Service Worker，模拟后端 API |
| Vitest | 2 | 测试框架 |
| Testing Library | 16 | React 组件测试 |
| Three.js | 0.160 | 3D 机械臂渲染 |
| Lucide React | 0.453 | 图标库 |
| React Router | 6.27 | 路由管理 |

---

## 项目结构

```
src/
├── components/          # 通用组件
│   ├── PageTransition.tsx    # 四条语义转场（enter/push/pop/fade）
│   ├── Skeleton.tsx          # 骨架屏
│   ├── StatusIndicator.tsx   # 状态指示灯
│   ├── SafetyGuard.tsx       # 安全确认弹窗
│   ├── CommandInput.tsx      # 自然语言输入
│   ├── JointVisualizer.tsx   # 关节角度可视化
│   ├── Toast.tsx             # 全局通知
│   ├── CoordinateViewer.tsx  # SVG 坐标系
│   ├── SystemHealth.tsx      # 系统健康指标
│   ├── StatsPanel.tsx        # 环形进度图
│   ├── ParticleBackground.tsx # Canvas 粒子背景
│   ├── ExecutionTimeline.tsx # 执行时间线
│   ├── SplashScreen.tsx      # 启动欢迎界面（液态玻璃风格）
│   └── LiquidGlass.tsx       # 液态玻璃组件库
├── pages/               # 页面组件
│   └── LoginPage.tsx         # 登录页面（液态玻璃风格）
├── features/
│   ├── dashboard/            # 仪表盘
│   ├── command/              # 指令面板
│   ├── playground/           # 3D 操控台（六轴机械臂 + 碰撞检测 + 手柄）
│   ├── operation/            # 动作序列执行页面
│   ├── dating/               # 方案推荐（卡片栈 + 揭晓动画）
│   ├── reveal/               # 执行揭晓动画
│   ├── settings/             # 设置
│   └── help/                 # 帮助中心
├── hooks/
│   ├── useRobotContext.tsx    # 全局 Robot 状态 Context
│   ├── useReducedMotion.ts   # prefers-reduced-motion 检测
│   ├── useCommandHistory.ts  # 指令历史
│   ├── useSafetyConfirm.ts   # 安全确认
│   ├── useFavorites.ts       # 收藏管理
│   ├── useRobotStatus.ts     # 机械臂状态管理
│   └── useNetworkStatus.ts   # 网络状态检测（离线模式支持）
├── contexts/
│   └── OfflineContext.tsx    # 离线模式上下文
├── lib/
│   ├── robot-api.ts          # API 封装
│   ├── safety-validator.ts   # 客户端安全预检
│   ├── llm-command-suggest.ts # LLM 微文案
│   ├── animation-presets.tsx  # Stagger 动画变体
│   ├── animation-helper.ts   # 动画工具函数
│   └── liquidGlass.ts        # 液态玻璃设计配置
├── mocks/
│   ├── handlers.ts           # MSW mock 接口
│   ├── browser.ts            # MSW 浏览器初始化
│   └── server.ts             # MSW Node 初始化
├── types/
│   ├── robot.ts              # 机械臂类型
│   ├── command.ts            # 指令类型
│   ├── dating.ts             # 方案推荐类型
│   └── index.ts              # 统一导出
├── App.tsx                   # 路由 + 导航 + 全局 Provider
├── main.tsx                  # 入口 + MSW 启动
└── index.css                 # Tailwind + 自定义动画 + 液态玻璃暗色模式

tests/
├── safety.test.ts            # 安全校验测试
├── command.test.ts           # 指令历史测试
├── swipe.contract.test.tsx   # 卡片栈契约测试
└── reveal.contract.test.tsx  # 揭晓动画契约测试

contracts/
├── swipe.contract.test.tsx   # 卡片栈滑动契约
├── safety.contract.test.tsx  # 安全确认契约
├── reveal.contract.test.tsx  # 方案揭晓契约
├── transition.contract.test.tsx # 页面转场契约

public/
├── actions/                  # 预设动作序列
│   ├── pick_and_place.json   # 抓取放置动作
│   └── demo_action.json      # 示例动作
├── models/
│   └── arm.glb               # 机械臂 3D 模型
├── texture/
│   └── envmap/room.png       # 环境贴图
└── mockServiceWorker.js      # MSW Service Worker
```

---

## 功能模块

### 1. 启动界面
- 动态渐变背景与浮动玻璃球体动画
- 粒子网格背景效果
- Logo 标记旋转动画与发光环效果
- 会话记忆（首次进入后跳过欢迎界面）
- 液态玻璃视觉效果

### 2. 登录页面
- 液态玻璃风格登录界面
- 用户名/密码输入框
- 流动光效动画
- 快捷登录选项（访客/扫码/注册）
- 特性介绍（智能控制、安全可靠、实时响应）

### 3. 仪表盘
系统状态总览、快捷操作、系统健康指标、执行时间线。

### 4. 指令面板
自然语言输入、AI 建议卡片、指令历史、收藏管理、分类筛选。

### 5. 3D 操控台
- 六轴机械臂（J1-J6）纯白建模，关节球体+装饰环+圆角夹爪
- 键盘/按钮/手柄三重操控
- 碰撞检测 + 安全位恢复
- 物品抓取放置小游戏
- 送达时绿色粒子爆发

### 6. 动作序列执行
- 预设动作加载（抓取放置、示例动作）
- GSAP 动画序列控制
- 播放/暂停/停止/进度拖拽
- 实时系统日志显示
- 多视角切换（默认/前视/顶视/侧视）
- 模型外观自定义（颜色、金属度、粗糙度、线框模式、透明度）
- 轴辅助显示/隐藏
- 轨迹可视化
- 安全系统（防穿模约束、关节间依赖规则、安全快照恢复）

### 7. 方案推荐
- 卡片栈拖拽浏览（offset+velocity 双判飞出）
- 采纳/跳过/优先执行/撤销
- Parallax tilt 3D 倾斜效果
- 方案确认揭晓动画（跳过按钮全程可点）
- 离线模式 fallback
- 手势识别控制（MediaPipe Hands）

### 8. 页面转场
四条语义转场：enter（首次进入）、push（深一层）、pop（回退）、fade（同级切换）。

---

## API 接口

所有接口由 MSW 模拟，可无缝替换为真实后端：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/robot/status | 机械臂状态 |
| POST | /api/robot/command | 发送指令 |
| POST | /api/robot/parse | 自然语言解析 |
| GET | /api/robot/suggestions | AI 指令建议 |
| GET | /api/dating/profiles | 方案列表 |
| POST | /api/dating/swipe | 方案选择 |
| GET | /api/dating/matches/next-reveal | 方案确认数据 |

---

## 测试

```bash
npm run test              # 全部测试（24 tests）
npm run test:contract     # 契约测试（17 tests）
npm run test:watch        # 监听模式
```

---

## 无障碍

- 所有交互元素有 aria-label
- 键盘完整可操作（卡片栈方向键、3D操控快捷键）
- prefers-reduced-motion 适配（动画退化为瞬时切换）
- 骨架屏加载状态
- 焦点陷阱（安全确认弹窗）

---

## 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                               │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ Router      │  │ Robot        │  │ Toast              │  │
│  │ +Lazy       │  │ Provider     │  │ Provider           │  │
│  └──────┬──────┘  └──────┬───────┘  └────────────────────┘  │
│         │                │                                    │
│  ┌──────▼─────────────────────────────────────────────────┐ │
│  │                    PageTransition                       │ │
│  │  ┌────────┐ ┌────────┐ ┌──────────┐ ┌────────────────┐ │ │
│  │  │Dashboard│ │Command │ │Playground│ │Dating Cards   │ │ │
│  │  │        │ │Panel   │ │  3D Arm  │ │                │ │ │
│  │  └────────┘ └────────┘ └──────────┘ └────────────────┘ │ │
│  │  ┌────────┐ ┌────────┐ ┌──────────┐ ┌────────────────┐ │ │
│  │  │Settings│ │Help    │ │Operation │ │Reveal          │ │ │
│  │  │        │ │        │ │ Sequence │ │                │ │ │
│  │  └────────┘ └────────┘ └──────────┘ └────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
│                           │                                   │
│                    ┌──────▼──────┐                            │
│                    │  MSW Layer  │                            │
│                    │ /api/robot  │                            │
│                    │ /api/dating │                            │
│                    └─────────────┘                            │
└─────────────────────────────────────────────────────────────┘

启动流程：
┌──────────────────────┐
│  SplashScreen.tsx    │
│  - 动态背景动画      │
│  - Logo 旋转         │
│  - 会话记忆          │
└──────────┬───────────┘
           │ onEnter
           ▼
┌──────────────────────┐
│    AppRoutes.tsx     │
│    - 路由懒加载      │
│    - 页面转场        │
└──────────────────────┘
```

---

## 项目完成状态

### 已完成功能 ✅
- [x] 启动欢迎界面（动态背景、粒子效果、Logo 动画、会话记忆）
- [x] 仪表盘系统状态总览
- [x] 自然语言指令输入与解析
- [x] 指令历史记录与收藏管理
- [x] 实时监控（关节角度、坐标、系统健康）
- [x] 3D 机械臂操控台（键盘/按钮/手柄）
- [x] 动作序列执行（播放/暂停/停止/进度控制）
- [x] 预设动作加载（抓取放置、示例动作）
- [x] 多视角切换与模型外观自定义
- [x] 安全系统（防穿模约束、关节依赖规则）
- [x] 实时系统日志显示
- [x] 方案推荐卡片栈（拖拽、倾斜效果、手势控制）
- [x] 执行揭晓动画
- [x] 页面语义转场
- [x] 全局通知系统
- [x] MSW 模拟后端 API（带延迟模拟）
- [x] 离线模式支持（fallback 数据、用户提示）
- [x] 单元测试与契约测试（24 个测试全部通过）
- [x] 无障碍审计报告（A11Y.md）
- [x] 架构决策记录（decisions/ADR-001~003）
- [x] AI 对话记录（ai-conversations/）
- [x] 学习笔记（LEARNINGS.md）
- [x] 自我评估（SELF-EVAL.md）

### 技术亮点 🌟
- **3D 渲染**：基于 Three.js 的六轴机械臂实时渲染，支持 PBR 材质
- **动画控制**：GSAP 动画序列与 Framer Motion 转场动画
- **安全系统**：多层防穿模约束与关节间依赖规则
- **用户体验**：启动界面、页面转场、实时反馈、骨架屏加载状态
- **液态玻璃设计**：类 Apple 风格，通透与流动感，暗色主题优化
- **无障碍支持**：完整的键盘操作、aria-label 属性、prefers-reduced-motion 适配
- **离线模式**：断网时自动切换到 fallback 数据，提供友好提示
- **代码质量**：TypeScript 类型安全、组件化设计、测试覆盖（24/24 测试通过）

---

## 开发说明

### 环境要求
- Node.js 18+
- npm 或 yarn

### 本地开发
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm run test

# 构建生产版本
npm run build
```

### 添加新的动作序列
1. 在 `public/actions/` 目录下创建新的 JSON 文件
2. 参考现有 `pick_and_place.json` 的格式
3. 在 `src/features/operation/OperationPage.tsx` 的 `PRESET_ACTIONS` 中添加配置

### 自定义机械臂模型
1. 将 GLB 模型文件放置在 `public/models/` 目录
2. 更新 `src/features/playground/robotArm3D.ts` 中的模型加载逻辑
3. 调整关节名称映射和角度限制

---

## 提交物清单

按照 Module D 要求，本项目包含以下提交物：

| 文件/目录 | 说明 |
|-----------|------|
| `ai-conversations/` | AI 对话记录（4个关键讨论） |
| `decisions/` | ADR 架构决策记录（3条） |
| `LEARNINGS.md` | 踩坑笔记与迭代日志 |
| `A11Y.md` | 无障碍审计报告 |
| `SELF-EVAL.md` | 自我评估（42/50） |
| `contracts/` | 契约测试（4个组件） |
| `tests/` | 单元测试（24个用例） |

---

## 许可证

MIT License