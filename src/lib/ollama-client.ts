/**
 * Ollama 本地 LLM 客户端
 * 用于智能解析机械臂控制指令
 */

// 扩展的动作类型
export type RobotAction =
  | 'grab'           // 抓取
  | 'release'        // 释放/张开
  | 'rotate'         // 旋转
  | 'move'           // 移动
  | 'raise'          // 上升
  | 'lower'          // 下降
  | 'tilt'           // 倾斜
  | 'stop'           // 停止
  | 'reset'          // 复位/归零
  | 'pause'          // 暂停
  | 'resume';        // 继续

// 扩展的目标位置
export type RobotTarget =
  | 'table_a'        // 实验台A
  | 'table_b'        // 实验台B
  | 'sample_rack'    // 样本架
  | 'home'           // 零点位置
  | 'current'         // 当前位置
  | 'safe_height'    // 安全高度
  | 'drop_zone';     // 放置区域

// 关节名称
export type JointName = 'base1' | 'shoulder' | 'elbow1' | 'elbow2' | 'wrist1';

export interface ParsedCommand {
  action: RobotAction;
  target: RobotTarget;
  params: {
    // 旋转参数
    angle?: number;        // 旋转角度（度）
    axis?: JointName;      // 旋转轴

    // 移动参数
    joint?: JointName;    // 关节名称
    jointAngle?: number;   // 关节目标角度

    // 速度参数
    speed?: 'slow' | 'medium' | 'fast';

    // 其他
    duration?: number;     // 持续时间（毫秒）
  };
  // 原始解析的可信度
  confidence: number;
  // 解析的原始文本描述
  description?: string;
}

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeout: number;
}

export interface OllamaStatus {
  available: boolean;
  model: string | null;
  error?: string;
}

const DEFAULT_CONFIG: OllamaConfig = {
  baseUrl: 'http://localhost:11434',
  model: 'qwen2.5:7b',
  timeout: 30000,
};

/**
 * 检查 Ollama 服务是否可用
 */
export async function checkOllamaStatus(): Promise<OllamaStatus> {
  try {
    const res = await fetch(`${DEFAULT_CONFIG.baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return { available: false, model: null, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const models = data.models || [];

    return {
      available: true,
      model: models.length > 0 ? models[0].name : null,
    };
  } catch (error) {
    return {
      available: false,
      model: null,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
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
 * 解析旋转角度
 * 例如："旋转90度"、"转45度"、"rotate 60"
 */
function parseAngle(text: string): number | undefined {
  const patterns = [
    /(\d+)\s*度/,
    /rotate\s*(\d+)/i,
    /转\s*(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  return undefined;
}

/**
 * 解析关节名称
 */
function parseJoint(text: string): JointName | undefined {
  const jointPatterns: Record<JointName, string[]> = {
    base1: ['底座', 'base', 'j1'],
    shoulder: ['肩', 'shoulder', 'j2'],
    elbow1: ['肘1', 'elbow1', 'j3'],
    elbow2: ['肘2', 'elbow2', 'j4'],
    wrist1: ['腕', 'wrist', 'j5'],
  };

  for (const [joint, patterns] of Object.entries(jointPatterns)) {
    for (const pattern of patterns) {
      if (text.includes(pattern)) {
        return joint as JointName;
      }
    }
  }
  return undefined;
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

动作类型:
- grab: 抓取（闭合夹爪）
- release: 释放（张开夹爪）
- rotate: 旋转（指定角度）
- move: 移动到目标位置
- raise: 上升
- lower: 下降
- tilt: 倾斜
- stop: 紧急停止
- reset: 复位归零
- pause: 暂停
- resume: 继续

目标位置:
- table_a: 实验台A
- table_b: 实验台B
- sample_rack: 样本架
- home: 零点位置
- current: 当前位置
- safe_height: 安全高度

关节:
- base1: 底座
- shoulder: 肩关节
- elbow1: 肘关节1
- elbow2: 肘关节2
- wrist1: 腕关节

返回JSON格式(只返回JSON，不要其他文字):
{"action": "动作", "target": "目标", "params": {"angle": 角度, "joint": "关节"}, "confidence": 0.9, "description": "解析描述"}`;

  try {
    const response = await generateWithOllama(prompt, config);

    // 提取 JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('LLM response did not contain JSON, using fallback');
      return fallbackParse(text);
    }

    const parsed = JSON.parse(jsonMatch[0]) as Partial<ParsedCommand>;

    // 补充参数解析
    const angle = parseAngle(text) || parsed.params?.angle;
    const joint = parseJoint(text) || parsed.params?.joint;

    return {
      action: parsed.action || 'move',
      target: parsed.target || 'current',
      params: {
        ...parsed.params,
        angle,
        joint,
      },
      confidence: parsed.confidence || 0.8,
      description: parsed.description || response,
    };
  } catch (error) {
    console.error('LLM parse error:', error);
    return fallbackParse(text);
  }
}

/**
 * 关键词匹配 fallback（当 LLM 不可用时）
 */
function fallbackParse(text: string): ParsedCommand {
  const lower = text.toLowerCase();

  // 动作映射
  const actionMap: Record<string, RobotAction> = {
    // 抓取
    '抓': 'grab', '拿': 'grab', '取': 'grab', '夹': 'grab',
    'grab': 'grab', 'grip': 'grab',

    // 释放
    '放': 'release', '松': 'release', '张开': 'release', '打开': 'release',
    'release': 'release', 'open': 'release',

    // 旋转
    '旋转': 'rotate', '转': 'rotate', '转动': 'rotate', '旋': 'rotate',
    'rotate': 'rotate', 'turn': 'rotate',

    // 上升
    '上升': 'raise', '升高': 'raise', '提高': 'raise', '抬': 'raise', 'up': 'raise',

    // 下降
    '下降': 'lower', '降低': 'lower', '降': 'lower', '落': 'lower', 'down': 'lower',

    // 倾斜
    '倾斜': 'tilt', '歪': 'tilt', '斜': 'tilt', '倾': 'tilt',
    'tilt': 'tilt',

    // 停止
    '停止': 'stop', '停': 'stop', '急停': 'stop',
    'stop': 'stop', 'emergency': 'stop',

    // 复位
    '复位': 'reset', '归零': 'reset', '回零': 'reset', '重置': 'reset', '初始': 'reset',
    'reset': 'reset', 'home': 'reset',

    // 暂停
    '暂停': 'pause', 'pause': 'pause',

    // 继续
    '继续': 'resume', '恢复': 'resume', 'resume': 'resume',
  };

  // 目标映射
  const targetMap: Record<string, RobotTarget> = {
    '实验台a': 'table_a', '实验台A': 'table_a', 'A台': 'table_a', 'a台': 'table_a',
    '实验台b': 'table_b', '实验台B': 'table_b', 'B台': 'table_b', 'b台': 'table_b',
    '样本架': 'sample_rack', '架子': 'sample_rack', 'rack': 'sample_rack',
    '零点': 'home', '归零位': 'home', '初始位': 'home', 'home': 'home',
    '当前位置': 'current', '现在': 'current',
    '安全高度': 'safe_height', '安全位': 'safe_height',
    '放置区': 'drop_zone', '放置': 'drop_zone', 'drop': 'drop_zone',
  };

  let action: RobotAction = 'move';
  let target: RobotTarget = 'current';
  const params: ParsedCommand['params'] = {};

  // 解析动作
  for (const [keyword, a] of Object.entries(actionMap)) {
    if (text.includes(keyword)) {
      action = a;
      break;
    }
  }

  // 解析目标
  for (const [keyword, t] of Object.entries(targetMap)) {
    if (text.includes(keyword)) {
      target = t;
      break;
    }
  }

  // 解析角度
  const angle = parseAngle(text);
  if (angle !== undefined) {
    params.angle = angle;
  }

  // 解析关节
  const joint = parseJoint(text);
  if (joint !== undefined) {
    params.joint = joint;
  }

  // 解析速度
  if (text.includes('快速') || text.includes('高速') || text.includes('fast')) {
    params.speed = 'fast';
  } else if (text.includes('慢速') || text.includes('低速') || text.includes('slow')) {
    params.speed = 'slow';
  } else {
    params.speed = 'medium';
  }

  return {
    action,
    target,
    params,
    confidence: 0.7,
    description: `关键词解析: ${action} → ${target}`,
  };
}

/**
 * 根据解析结果生成自然语言描述
 */
export function describeParsedCommand(parsed: ParsedCommand): string {
  const { action, target, params } = parsed;

  const actionDesc: Record<RobotAction, string> = {
    grab: '抓取物品',
    release: '释放夹爪',
    rotate: `旋转${params.angle || ''}度`,
    move: '移动到目标位置',
    raise: '上升',
    lower: '下降',
    tilt: '倾斜调整',
    stop: '紧急停止',
    reset: '复位归零',
    pause: '暂停',
    resume: '继续执行',
  };

  const targetDesc: Record<RobotTarget, string> = {
    table_a: '实验台A',
    table_b: '实验台B',
    sample_rack: '样本架',
    home: '零点位置',
    current: '当前位置',
    safe_height: '安全高度',
    drop_zone: '放置区域',
  };

  return `${actionDesc[action]}${target !== 'current' ? `（${targetDesc[target]}）` : ''}`;
}
