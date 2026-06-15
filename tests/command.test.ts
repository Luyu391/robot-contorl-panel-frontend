import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommandHistory } from '../src/hooks/useCommandHistory';

describe('useCommandHistory', () => {
  it('starts with empty history', () => {
    const { result } = renderHook(() => useCommandHistory());
    expect(result.current.history).toHaveLength(0);
    expect(result.current.current).toBeNull();
  });

  it('adds command to history', () => {
    const { result } = renderHook(() => useCommandHistory());
    const record = {
      id: 'test-1',
      rawText: '移动到实验台',
      status: 'pending' as const,
      source: 'typed' as const,
      createdAt: new Date().toISOString(),
    };
    act(() => { result.current.addCommand(record); });
    expect(result.current.history).toHaveLength(1);
    expect(result.current.current?.id).toBe('test-1');
  });

  it('updates command status', () => {
    const { result } = renderHook(() => useCommandHistory());
    const record = {
      id: 'test-2',
      rawText: '抓取试剂瓶',
      status: 'executing' as const,
      source: 'typed' as const,
      createdAt: new Date().toISOString(),
    };
    act(() => { result.current.addCommand(record); });
    act(() => { result.current.updateStatus('test-2', 'completed', { duration: 1500 }); });
    expect(result.current.history[0].status).toBe('completed');
    expect(result.current.history[0].duration).toBe(1500);
  });
});