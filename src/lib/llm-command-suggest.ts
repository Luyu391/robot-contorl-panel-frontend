import type { CommandSuggestion, CommandRecord } from '../types';

interface SuggestInput {
  recentCommands: CommandRecord[];
  currentContext: string;
}

interface RevealInput {
  rawText: string;
  success: boolean;
  duration: number;
}

interface SafetyEnhanceInput {
  errorCode: string;
  rawMessage: string;
}

const CACHE_KEY_PREFIX = 'robot:llm:v1:';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const FALLBACK_SUGGESTIONS: CommandSuggestion[] = [
  { id: 's1', text: '回零位待命', confidence: 100, category: '基础', description: '机械臂回到预设零点位置' },
  { id: 's2', text: '移动到实验台A上方', confidence: 95, category: '移动', description: '移动到实验台A的安全高度' },
  { id: 's3', text: '张开夹爪', confidence: 100, category: '夹爪', description: '完全打开夹爪，准备抓取' },
  { id: 's4', text: '抓取当前位置物品', confidence: 92, category: '夹爪', description: '闭合夹爪抓取物品' },
  { id: 's5', text: '回到安全高度后旋转180度', confidence: 88, category: '复合', description: '先上升到安全高度，再旋转半圈' },
];

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function hashKey(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  return CACHE_KEY_PREFIX + (h >>> 0).toString(16);
}

async function callLlm(prompt: string, signal: AbortSignal): Promise<unknown> {
  const res = await fetch('/api/llm/microcopy', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal,
  });
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
  return res.json();
}

export async function suggestCommands(input: SuggestInput): Promise<CommandSuggestion[]> {
  const cacheKey = hashKey(`suggest:${input.currentContext}`);
  const store = safeStorage();
  if (store) {
    try {
      const cached = store.getItem(cacheKey);
      if (cached) {
        const entry = JSON.parse(cached);
        if (Date.now() < entry.expiresAt) return entry.value;
        store.removeItem(cacheKey);
      }
    } catch { /* ignore */ }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const data = (await callLlm('command-suggest', controller.signal)) as { suggestions?: CommandSuggestion[] };
    clearTimeout(timer);
    if (data.suggestions?.length) {
      if (store) {
        store.setItem(cacheKey, JSON.stringify({ expiresAt: Date.now() + CACHE_TTL_MS, value: data.suggestions }));
      }
      return data.suggestions;
    }
    return FALLBACK_SUGGESTIONS;
  } catch {
    clearTimeout(timer);
    return FALLBACK_SUGGESTIONS;
  }
}

export async function generateExecutionSummary(input: RevealInput): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const data = (await callLlm('reveal-summary', controller.signal)) as { line?: string };
    clearTimeout(timer);
    if (data.line) return data.line;
    return input.success
      ? `指令"${input.rawText.slice(0, 30)}"执行成功，耗时${(input.duration / 1000).toFixed(1)}秒`
      : `指令"${input.rawText.slice(0, 30)}"执行失败`;
  } catch {
    clearTimeout(timer);
    return input.success
      ? `指令执行完成，耗时${(input.duration / 1000).toFixed(1)}秒`
      : '指令执行异常，请检查机械臂状态';
  }
}

export async function enhanceSafetyMessage(input: SafetyEnhanceInput): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const data = (await callLlm('safety-enhance', controller.signal)) as { line?: string };
    clearTimeout(timer);
    if (data.line) return data.line;
    return `⚠️ ${input.rawMessage}（错误码: ${input.errorCode}）`;
  } catch {
    clearTimeout(timer);
    return `⚠️ ${input.rawMessage}`;
  }
}