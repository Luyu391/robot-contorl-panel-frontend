/**
 * Ollama 本地 LLM 客户端
 * 用于智能解析机械臂控制指令
 */

export interface ParsedCommand {
  action: 'grab' | 'release' | 'rotate' | 'move' | 'stop';
  target: string;
  params: Record<string, unknown>;
}

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeout: number;
}

const DEFAULT_CONFIG: OllamaConfig = {
  baseUrl: 'http://localhost:11434',
  model: 'qwen2.5:7b',
  timeout: 5000,
};

/**
 * 检查 Ollama 服务是否可用
 */
export async function checkOllamaAvailable(config: OllamaConfig = DEFAULT_CONFIG): Promise<boolean> {
  try {
    const res = await fetch(`${config.baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(config.timeout),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 调用 Ollama 生成响应
 */
export async function generateWithOllama(
  prompt: string,
  config: OllamaConfig = DEFAULT_CONFIG
): Promise<string> {
  const res = await fetch(`${config.baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      prompt,
      stream: false,
    }),
    signal: AbortSignal.timeout(config.timeout),
  });

  if (!res.ok) {
    throw new Error(`Ollama request failed: ${res.status}`);
  }

  const data = await res.json();
  return data.response;
}

/**
 * 使用 LLM 解析机械臂控制指令
 */
export async function parseCommandWithLLM(
  text: string,
  config: OllamaConfig = DEFAULT_CONFIG
): Promise<ParsedCommand> {
  const prompt = `你是机械臂控制系统的指令解析器。解析用户指令并返回JSON。

用户指令: "${text}"

可能的动作: grab(抓取), release(释放), rotate(旋转), move(移动), stop(停止)
可能的目标: table_a(实验台A), table_b(实验台B), sample_rack(样本架), current(当前位置)

返回JSON格式(只返回JSON，不要其他文字):
{"action": "...", "target": "...", "params": {...}}`;

  try {
    const response = await generateWithOllama(prompt, config);
    
    // 提取 JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return fallbackParse(text);
    }
    
    return JSON.parse(jsonMatch[0]) as ParsedCommand;
  } catch (error) {
    console.error('LLM parse error:', error);
    return fallbackParse(text);
  }
}

/**
 * 关键词匹配 fallback
 */
function fallbackParse(text: string): ParsedCommand {
  const actionMap: Record<string, ParsedCommand['action']> = {
    '抓': 'grab', '拿': 'grab', '取': 'grab',
    '放': 'release', '松': 'release', '置': 'release',
    '旋转': 'rotate', '转': 'rotate', '转动': 'rotate',
    '移动': 'move', '到': 'move', '去': 'move',
    '停止': 'stop', '停': 'stop', '暂停': 'stop',
  };

  const targetMap: Record<string, string> = {
    '实验台a': 'table_a', '实验台A': 'table_a', 'A台': 'table_a',
    '实验台b': 'table_b', '实验台B': 'table_b', 'B台': 'table_b',
    '样本架': 'sample_rack', '架子': 'sample_rack',
  };

  let action: ParsedCommand['action'] = 'move';
  let target = 'current';

  for (const [keyword, a] of Object.entries(actionMap)) {
    if (text.includes(keyword)) {
      action = a;
      break;
    }
  }

  for (const [keyword, t] of Object.entries(targetMap)) {
    if (text.includes(keyword)) {
      target = t;
      break;
    }
  }

  return { action, target, params: {} };
}