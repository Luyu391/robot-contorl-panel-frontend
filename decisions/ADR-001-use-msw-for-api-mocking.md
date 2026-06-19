# ADR-001: 采用 MSW 模拟后端 API

## 背景

机械臂控制面板需要与后端服务通信获取状态、执行指令。但在项目初期，后端服务可能尚未开发完成，或者需要在没有网络的环境下进行演示和测试。

## 决策

使用 MSW (Mock Service Worker) 在前端模拟所有后端 API 接口。

### 技术方案

```typescript
// src/mocks/handlers.ts
export const handlers = [
  http.get('/api/robot/status', async () => {
    await delay(NETWORK_DELAY.fast);
    return HttpResponse.json(makeState());
  }),
  http.post('/api/robot/parse', async ({ request }) => {
    const body = await request.json();
    // 模拟自然语言解析逻辑
    return HttpResponse.json({ action: 'grab', target: 'current' });
  }),
];
```

### 优点

1. **无缝切换**：接口签名与真实后端一致，只需修改 base URL 即可切换
2. **离线可用**：不依赖外部服务，断网时仍可正常使用
3. **可控延迟**：可以模拟真实网络延迟，便于测试加载状态
4. **便于测试**：配合 Vitest 可以进行完整的端到端测试

### 缺点

1. 模拟逻辑需要手动维护，与真实后端可能存在差异
2. 需要处理 CORS 等跨域问题（在开发环境通过 Vite 代理解决）

## 后果

- 组件代码与 API 实现解耦，便于后续接入真实后端
- 需要在 handlers 中维护完整的模拟逻辑
- 增加了项目的复杂度和学习成本

## 状态

已实施。
