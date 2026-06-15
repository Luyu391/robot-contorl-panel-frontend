import type { SafetyCheck } from '../types';

export function quickSafetyCheck(text: string): SafetyCheck {
  const warnings: string[] = [];
  const errors: string[] = [];

  const lowerText = text.toLowerCase();

  if (lowerText.includes('急停') || lowerText.includes('emergency')) {
    warnings.push('检测到紧急停止关键词，执行后将立即停止所有运动');
  }

  if (lowerText.includes('全速') || lowerText.includes('快速') || lowerText.includes('fast')) {
    warnings.push('速度设置较高，建议确认运动范围无障碍物');
  }

  if (lowerText.includes('碰撞') || lowerText.includes('撞') || lowerText.includes('hit')) {
    errors.push('检测到碰撞相关关键词，请确认指令意图');
  }

  if (text.trim().length === 0) {
    errors.push('指令不能为空');
  }

  if (text.length > 500) {
    warnings.push('指令较长，可能包含多个操作步骤，建议拆分执行');
  }

  return {
    passed: errors.length === 0,
    warnings,
    errors,
  };
}