/**
 * Contract: MatchRevealAnimation must...
 *   1. Render match information
 *   2. Have skip button
 *   3. Respect prefers-reduced-motion
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MatchRevealAnimation } from '../src/features/dating/MatchRevealAnimation';

describe('MatchRevealAnimation contract', () => {
  const mockPayload = {
    matchId: 'mr1',
    selfName: '当前任务',
    partnerName: '精密抓取方案',
    score: 86,
    highlights: ['操作参数匹配', '执行环境兼容'],
  };

  it('renders with match-reveal testid', () => {
    render(
      <MatchRevealAnimation
        payload={mockPayload}
        onComplete={vi.fn()}
      />
    );
    
    expect(screen.getByTestId('match-reveal')).toBeInTheDocument();
  });

  it('has skip button', () => {
    render(
      <MatchRevealAnimation
        payload={mockPayload}
        onComplete={vi.fn()}
      />
    );
    
    expect(screen.getByTestId('match-reveal-skip')).toBeInTheDocument();
  });

  it('respects prefers-reduced-motion', () => {
    const matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    window.matchMedia = matchMedia as unknown as typeof window.matchMedia;
    
    render(
      <MatchRevealAnimation
        payload={mockPayload}
        onComplete={vi.fn()}
      />
    );
    
    expect(screen.getByTestId('match-reveal')).toBeInTheDocument();
  });
});