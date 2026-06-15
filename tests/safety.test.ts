import { describe, it, expect } from 'vitest';
import { quickSafetyCheck } from '../src/lib/safety-validator';

describe('quickSafetyCheck', () => {
  it('passes normal commands', () => {
    const result = quickSafetyCheck('移动到实验台A上方');
    expect(result.passed).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects empty command', () => {
    const result = quickSafetyCheck('');
    expect(result.passed).toBe(false);
    expect(result.errors).toContain('指令不能为空');
  });

  it('warns on speed keywords', () => {
    const result = quickSafetyCheck('全速移动到实验台');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.passed).toBe(true);
  });

  it('errors on collision keywords', () => {
    const result = quickSafetyCheck('撞一下试试');
    expect(result.passed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});