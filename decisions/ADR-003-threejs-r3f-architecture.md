# ADR-003: 采用 Three.js + React Three Fiber 构建 3D 操控台

## 背景

机械臂控制面板需要提供直观的 3D 可视化界面，让用户实时观察机械臂状态并进行操控。传统的 2D 界面难以表达六轴机械臂的空间运动关系。

## 候选方案

1. **纯 Three.js**：底层 API，灵活性高，但需要手动管理场景、渲染循环
2. **React Three Fiber (R3F)**：Three.js 的 React 绑定，可以使用 React 组件方式构建 3D 场景
3. **Babylon.js**：功能强大，但学习曲线较陡，生态系统不如 Three.js 丰富

## 决策

采用 React Three Fiber (R3F) 作为 3D 渲染框架。

### 理由

1. **与现有技术栈一致**：项目已是 React 技术栈，R3F 可以无缝集成
2. **声明式编程**：可以使用 React 组件的方式描述 3D 场景，降低学习成本
3. **状态管理集成**：可以复用 React 的状态管理机制管理 3D 场景状态
4. **社区生态**：R3F 有活跃的社区和丰富的插件生态

### 技术架构

```typescript
// RobotArmScene.tsx
export function RobotArmScene() {
  return (
    <Canvas>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <RobotArmModel />
      <OrbitControls />
    </Canvas>
  );
}

// RobotArmModel.tsx
function RobotArmModel() {
  const { joints } = useRobotContext();
  
  useFrame(() => {
    // 每帧更新关节角度
    joints.forEach(({ name, angle }) => {
      // 应用到 Three.js 对象
    });
  });
  
  return (
    <group>
      <ArmSegment name="base1" />
      <ArmSegment name="shoulder" />
      {/* ... */}
    </group>
  );
}
```

### 缺点

1. 性能开销比纯 Three.js 略高
2. 调试相对困难
3. 需要额外学习 R3F 的 API

## 状态

已实施，但在部分场景（如 Playground 页面）采用纯 Three.js 类实现以获得更好的控制。

## 替代方案记录

如果未来发现 R3F 性能不足，可以考虑：
1. 仅在需要交互的场景使用 R3F
2. 将复杂的 3D 逻辑移至纯 Three.js 类中
3. 使用 Web Worker 进行物理计算
