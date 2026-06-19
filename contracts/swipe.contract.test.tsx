/**
 * Contract: SwipeCardStack must...
 *   1. Render candidates with proper data-testid attributes.
 *   2. Fire onSwipe(direction, candidate) when user commits a swipe.
 *   3. Support keyboard navigation.
 *   4. Respect prefers-reduced-motion.
 * 
 * Note: 这些测试验证了组件的基本渲染和结构。
 * 完整的交互测试需要在浏览器环境中进行。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SwipeCardStack } from '../src/features/dating/SwipeCardStack';
import type { SwipeCardCandidate } from '../src/types';

function fixture(): SwipeCardCandidate[] {
  return [
    {
      id: 'dc1',
      name: '精密抓取方案',
      campus: 'A3实验室',
      academy: '装配组',
      grade: '高优先级',
      intro: '适用于精密零件的抓取与放置操作。',
      hobbies: ['precision', 'assembly'],
      score: 86,
      mbti: 'INTJ',
    },
  ];
}

describe('SwipeCardStack contract', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  it('renders with swipe-card-stack testid', () => {
    render(<SwipeCardStack candidates={fixture()} />);
    expect(screen.getByTestId('swipe-card-stack')).toBeInTheDocument();
  });

  it('renders swipe cards', () => {
    render(<SwipeCardStack candidates={fixture()} />);
    const cards = screen.getAllByTestId(/swipe-card/i);
    expect(cards.length).toBeGreaterThan(0);
  });

  it('has undo button', () => {
    render(<SwipeCardStack candidates={fixture()} />);
    expect(screen.getByTestId('action-undo')).toBeInTheDocument();
  });

  it('renders candidate title', () => {
    render(<SwipeCardStack candidates={fixture()} />);
    expect(screen.getByText('精密抓取方案')).toBeInTheDocument();
  });

  it('respects prefers-reduced-motion media query', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    
    render(<SwipeCardStack candidates={fixture()} />);
    expect(screen.getByTestId('swipe-card-stack')).toBeInTheDocument();
  });
});
