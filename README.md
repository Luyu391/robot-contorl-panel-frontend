# OpenCLaw 机械臂控制面板

基于 React 18 + Vite 5 的智能机械臂前端控制面板，集成自然语言指令、实时监控、3D 操控和方案推荐功能。

## 快速开始

```bash
npm install
npm run dev            # Vite 起在 http://localhost:5174
npm run test           # vitest 跑全部测试
npm run build          # tsc + vite build
```

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18 | UI 框架 |
| Vite | 5 | 构建工具，端口 5174 |
| TypeScript | 5 | 类型安全 |
| Tailwind CSS | 3 | 样式，PostCSS + CJS 配置 |
| Framer Motion | 11 | 动画、拖拽、转场 |
| MSW | 2 | Mock Service Worker，模拟后端 API |
| Vitest | 2 | 测试框架 |
| Testing Library | 16 | React 组件测试 |
| Three.js + R3F | 8/9 | 3D 机械臂渲染 |

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
│   └── ExecutionTimeline.tsx # 执行时间线
├── features/
│   ├── dashboard/            # 仪表盘
│   ├── command/              # 指令面板
│   ├── monitor/              # 实时监控
│   ├── playground/           # 3D 操控台（六轴机械臂 + 碰撞检测 + 手柄）
│   ├── dating/               # 方案推荐（卡片栈 + 揭晓动画）
│   ├── reveal/               # 执行揭晓动画
│   ├── settings/             # 设置
│   └── help/                 # 帮助中心
├── hooks/
│   ├── useRobotContext.tsx    # 全局 Robot 状态 Context
│   ├── useReducedMotion.ts   # prefers-reduced-motion 检测
│   ├── useCommandHistory.ts  # 指令历史
│   ├── useSafetyConfirm.ts   # 安全确认
│   └── useFavorites.ts       # 收藏管理
├── lib/
│   ├── robot-api.ts          # API 封装
│   ├── safety-validator.ts   # 客户端安全预检
│   ├── llm-command-suggest.ts # LLM 微文案
│   ├── animation-presets.tsx  # Stagger 动画变体
│   └── animation-helper.ts   # 动画工具函数
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
└── index.css                 # Tailwind + 自定义动画

tests/
├── safety.test.ts            # 安全校验测试
├── command.test.ts           # 指令历史测试
├── swipe.contract.test.tsx   # 卡片栈契约测试（13 tests）
└── reveal.contract.test.tsx  # 揭晓动画契约测试（4 tests）
```

## 功能模块

### 1. 仪表盘
系统状态总览、快捷操作、系统健康指标、执行时间线。

### 2. 指令面板
自然语言输入、AI 建议卡片、指令历史、收藏管理、分类筛选。

### 3. 实时监控
六关节角度可视化、坐标位置、系统健康、状态指示灯。

### 4. 3D 操控台
- 六轴机械臂（J1-J6）纯白建模，关节球体+装饰环+圆角夹爪
- 键盘/按钮/手柄三重操控
- 碰撞检测 + 安全位恢复
- 物品抓取放置小游戏
- 送达时绿色粒子爆发

### 5. 方案推荐
- 卡片栈拖拽浏览（offset+velocity 双判飞出）
- 采纳/跳过/优先执行/撤销
- Parallax tilt 3D 倾斜效果
- 方案确认揭晓动画（跳过按钮全程可点）
- 离线模式 fallback

### 6. 页面转场
四条语义转场：enter（首次进入）、push（深一层）、pop（回退）、fade（同级切换）。

## API 接口

所有接口由 MSW 模拟，可无缝替换为真实后端：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/robot/status | 机械臂状态 |
| POST | /api/robot/command | 发送指令 |
| GET | /api/dating/profiles | 方案列表 |
| POST | /api/dating/swipe | 方案选择 |
| GET | /api/dating/matches/next-reveal | 方案确认数据 |

## 测试

```bash
npm run test              # 全部测试（24 tests）
npm run test:contract     # 契约测试（17 tests）
npm run test:watch        # 监听模式
```

## 无障碍

- 所有交互元素有 aria-label
- 键盘完整可操作（卡片栈方向键、3D操控快捷键）
- prefers-reduced-motion 适配（动画退化为瞬时切换）
- 骨架屏加载状态
- 焦点陷阱（安全确认弹窗）

## 架构图

```
┌─────────────────────────────────────────────────┐
│                   App.tsx                        │
│  ┌─────────┐  ┌──────────┐  ┌────────────────┐ │
│  │ Router   │  │ Robot    │  │ Toast          │ │
│  │ +Lazy    │  │ Provider │  │ Provider       │ │
│  └────┬─────┘  └────┬─────┘  └────────────────┘ │
│       │              │                            │
│  ┌────▼──────────────────────────────────────┐   │
│  │           PageTransition                   │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐ │   │
│  │  │Dash  │ │Cmd   │ │Monitor│ │Playground│ │   │
│  │  │board │ │Panel │ │       │ │  3D Arm  │ │   │
│  │  └──────┘ └──────┘ └──────┘ └──────────┘ │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐               │   │
│  │  │Dating│ │Sett- │ │Help  │               │   │
│  │  │Cards │ │ings  │ │      │               │   │
│  │  └──────┘ └──────┘ └──────┘               │   │
│  └───────────────────────────────────────────┘   │
│                     │                             │
│              ┌──────▼──────┐                      │
│              │  MSW Layer  │                      │
│              │ /api/robot  │                      │
│              │ /api/dating │                      │
│              └─────────────┘                      │
└─────────────────────────────────────────────────┘
```
