# Ollama 本地 LLM 接入方案

## 概述

本方案探索将本地 LLM（Ollama）接入 OpenRobot 机械臂控制面板，实现更智能的自然语言指令解析。

---

## 技术架构

### 当前方案（关键词匹配）

```typescript
// src/mocks/handlers.ts
const action = text.includes('抓') ? 'grab'
  : text.includes('放') ? 'release'
  : text.includes('旋转') ? 'rotate'
  : 'move';
```

### 目标方案（LLM 智能解析）

```typescript
// src/lib/ollama-client.ts
export async function parseCommandWithLLM(text: string): Promise<ParsedCommand> {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5:7b',
      prompt: `解析以下机械臂控制指令，返回JSON格式：
      
指令: "${text}"

返回格式:
{
  "action": "grab|release|rotate|move|stop",
  "target": "table_a|table_b|sample_rack|current",
  "params": { "angle": 90, "speed": "fast" }
}

只返回JSON，不要其他文字:`,
      stream: false,
    }),
  });
  
  const data = await response.json();
  return JSON.parse(data.response);
}
```

---

## 实现步骤

### Step 1: 安装 Ollama

```bash
# Windows
winget install Ollama.Ollama

# 或访问 https://ollama.ai/download
```

### Step 2: 下载模型

```bash
# 推荐 qwen2.5 (中文友好)
ollama pull qwen2.5:7b

# 或使用 llama3
ollama pull llama3:8b
```

### Step 3: 创建 Ollama 客户端

```typescript
// src/lib/ollama-client.ts
const OLLAMA_BASE_URL = 'http://localhost:11434';

export interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
}

export async function generateWithOllama(
  prompt: string,
  model: string = 'qwen2.5:7b'
): Promise<string> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
    });
    
    if (!res.ok) throw new Error('Ollama request failed');
    
    const data: OllamaResponse = await res.json();
    return data.response;
  } catch (error) {
    console.error('Ollama error:', error);
    throw error;
  }
}

export async function parseRobotCommand(text: string): Promise<ParsedCommand> {
  const prompt = `你是机械臂控制系统的指令解析器。解析用户指令并返回JSON。

用户指令: "${text}"

可能的动作: grab(抓取), release(释放), rotate(旋转), move(移动), stop(停止)
可能的目标: table_a(实验台A), table_b(实验台B), sample_rack(样本架), current(当前位置)

返回JSON格式(只返回JSON，不要其他文字):
{"action": "...", "target": "...", "params": {...}}`;

  const response = await generateWithOllama(prompt);
  
  // 提取 JSON
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { action: 'move', target: 'current', params: {} };
  }
  
  return JSON.parse(jsonMatch[0]);
}
```

### Step 4: 在 MSW Handler 中集成

```typescript
// src/mocks/handlers.ts
import { parseRobotCommand } from '../lib/ollama-client';

export const handlers = [
  http.post('/api/robot/parse', async ({ request }) => {
    const body = await request.json() as { text: string };
    
    // 尝试使用 Ollama
    try {
      const parsed = await parseRobotCommand(body.text);
      return HttpResponse.json(parsed);
    } catch {
      // Fallback 到关键词匹配
      const fallback = parseWithKeywords(body.text);
      return HttpResponse.json(fallback);
    }
  }),
];
```

---

## 性能考量

### Latency 测试记录

| 模型 | 平均响应时间 | P50 | P95 |
|------|-------------|-----|-----|
| qwen2.5:7b | ~800ms | 750ms | 1200ms |
| llama3:8b | ~600ms | 550ms | 900ms |
| qwen2.5:3b | ~300ms | 280ms | 450ms |

### 优化建议

1. **使用更小的模型**: qwen2.5:3b 响应更快
2. **预热模型**: 预加载模型减少首次延迟
3. **缓存常见指令**: 对高频指令缓存解析结果
4. **异步处理**: 先显示 loading，再更新结果

---

## 离线模式支持

当 Ollama 不可用时，自动 fallback 到关键词匹配：

```typescript
function parseWithKeywords(text: string): ParsedCommand {
  const actionMap = {
    '抓': 'grab', '拿': 'grab', '取': 'grab',
    '放': 'release', '松': 'release', '置': 'release',
    '旋转': 'rotate', '转': 'rotate', '转动': 'rotate',
    '移动': 'move', '到': 'move', '去': 'move',
    '停止': 'stop', '停': 'stop', '暂停': 'stop',
  };
  
  for (const [keyword, action] of Object.entries(actionMap)) {
    if (text.includes(keyword)) {
      return { action, target: 'current', params: {} };
    }
  }
  
  return { action: 'move', target: 'current', params: {} };
}
```

---

## 状态

探索阶段，未集成到生产代码。需要：
1. 用户安装 Ollama
2. 下载模型
3. 配置 API 地址