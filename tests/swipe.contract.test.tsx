import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SwipeCardStack } from '../src/features/dating/SwipeCardStack';
import type { SwipeCardCandidate, SwipeDirection } from '../src/types';

const ANIMATION_DELAY = 700;

function fixture(): SwipeCardCandidate[] {
  return [
    { id: 'c1', name: '精密抓取方案', campus: 'A3实验室', academy: '装配组', grade: '高优先级', intro: '适用于精密零件的抓取与放置操作。', hobbies: ['precision', 'assembly'], score: 86 },
    { id: 'c2', name: '快速分拣方案', campus: 'B1实验室', academy: '物流组', grade: '中优先级', intro: '适用于流水线快速分拣场景。', hobbies: ['sorting'], score: 81 },
    { id: 'c3', name: '柔性操作方案', campus: 'C2实验室', academy: '研发组', grade: '高优先级', intro: '适用于不规则物体的柔性夹取。', hobbies: ['flexible'], score: 78 },
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

  it('renders the top candidate with data-card-position=0', () => {
    render(<SwipeCardStack candidates={fixture()} />);
    const cards = screen.getAllByTestId('swipe-card');
    expect(cards.length).toBeGreaterThan(0);
    const top = cards.find((c) => c.getAttribute('data-card-position') === '0');
    expect(top).toBeTruthy();
    expect(top?.getAttribute('data-card-index')).toBe('0');
  });

  it('exposes pass/like/super action buttons with aria-labels', () => {
    render(<SwipeCardStack candidates={fixture()} />);
    expect(screen.getByTestId('action-pass')).toHaveAttribute('aria-label');
    expect(screen.getByTestId('action-like')).toHaveAttribute('aria-label');
    expect(screen.getByTestId('action-super')).toHaveAttribute('aria-label');
  });

  it('calls onSwipe with direction "right" when the like button is clicked', async () => {
    const onSwipe = vi.fn();
    render(<SwipeCardStack candidates={fixture()} onSwipe={onSwipe} />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('action-like'));
    await waitFor(() => expect(onSwipe).toHaveBeenCalledTimes(1), { timeout: ANIMATION_DELAY + 100 });
    const [direction, candidate] = onSwipe.mock.calls[0] as [SwipeDirection, SwipeCardCandidate];
    expect(direction).toBe('right');
    expect(candidate.id).toBe('c1');
  });

  it('calls onSwipe with direction "left" when the pass button is clicked', async () => {
    const onSwipe = vi.fn();
    render(<SwipeCardStack candidates={fixture()} onSwipe={onSwipe} />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('action-pass'));
    await waitFor(() => expect(onSwipe).toHaveBeenCalledWith('left', expect.objectContaining({ id: 'c1' })), { timeout: ANIMATION_DELAY + 100 });
  });

  it('calls onSwipe with direction "up" when the super-like button is clicked', async () => {
    const onSwipe = vi.fn();
    render(<SwipeCardStack candidates={fixture()} onSwipe={onSwipe} />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('action-super'));
    await waitFor(() => expect(onSwipe).toHaveBeenCalledWith('up', expect.objectContaining({ id: 'c1' })), { timeout: ANIMATION_DELAY + 100 });
  });

  it('advances the stack: after the first commit, the second candidate becomes top', async () => {
    const onSwipe = vi.fn();
    render(<SwipeCardStack candidates={fixture()} onSwipe={onSwipe} />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('action-like'));
    await waitFor(() => expect(onSwipe).toHaveBeenCalledTimes(1), { timeout: ANIMATION_DELAY + 100 });
    await waitFor(() => {
      const cards = screen.getAllByTestId('swipe-card');
      const top = cards.find((c) => c.getAttribute('data-card-position') === '0' && parseFloat(c.style.opacity) === 1);
      expect(top?.getAttribute('data-card-index')).toBe('1');
    }, { timeout: ANIMATION_DELAY + 200 });
  });

  it('responds to ArrowRight on the focused stack', async () => {
    const onSwipe = vi.fn();
    render(<SwipeCardStack candidates={fixture()} onSwipe={onSwipe} />);
    const top = screen
      .getAllByTestId('swipe-card')
      .find((c) => c.getAttribute('data-card-position') === '0') as HTMLElement;
    top.focus();
    act(() => {
      fireEvent.keyDown(top, { key: 'ArrowRight' });
    });
    await waitFor(() => expect(onSwipe).toHaveBeenCalledWith('right', expect.objectContaining({ id: 'c1' })), { timeout: ANIMATION_DELAY + 100 });
  });

  it('disables actions when all candidates are exhausted', async () => {
    const onSwipe = vi.fn();
    render(<SwipeCardStack candidates={fixture()} onSwipe={onSwipe} />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('action-like'));
    await waitFor(() => expect(onSwipe).toHaveBeenCalledTimes(1), { timeout: ANIMATION_DELAY + 100 });
    await user.click(screen.getByTestId('action-like'));
    await waitFor(() => expect(onSwipe).toHaveBeenCalledTimes(2), { timeout: ANIMATION_DELAY + 100 });
    await user.click(screen.getByTestId('action-like'));
    await waitFor(() => expect(onSwipe).toHaveBeenCalledTimes(3), { timeout: ANIMATION_DELAY + 100 });
    expect(screen.getByTestId('action-like')).toBeDisabled();
    expect(screen.getByText(/方案都看完啦/)).toBeInTheDocument();
  });

  it('respects prefers-reduced-motion: still commits swipes synchronously', async () => {
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
    const onSwipe = vi.fn();
    render(<SwipeCardStack candidates={fixture()} onSwipe={onSwipe} />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId('action-like'));
    await waitFor(() => expect(onSwipe).toHaveBeenCalledTimes(1), { timeout: ANIMATION_DELAY + 100 });
  });
});

describe('a11y contract: SwipeCardStack', () => {
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

  it('every visible card has aria-label', () => {
    render(<SwipeCardStack candidates={fixture()} />);
    const cards = screen.getAllByTestId('swipe-card');
    for (const card of cards) {
      const label = card.getAttribute('aria-label');
      expect(label, 'card aria-label').toBeTruthy();
      expect(label!.length).toBeGreaterThan(4);
    }
  });

  it('top card is tabbable (tabindex=0); back cards are not (tabindex=-1)', () => {
    render(<SwipeCardStack candidates={fixture()} />);
    const cards = screen.getAllByTestId('swipe-card');
    const top = cards.find((c) => c.getAttribute('data-card-position') === '0');
    const back = cards.find((c) => c.getAttribute('data-card-position') !== '0');
    expect(top?.getAttribute('tabindex')).toBe('0');
    if (back) {
      expect(back.getAttribute('tabindex')).toBe('-1');
    }
  });

  it('action buttons all expose aria-label', () => {
    render(<SwipeCardStack candidates={fixture()} />);
    for (const id of ['action-pass', 'action-like', 'action-super']) {
      const btn = screen.getByTestId(id);
      expect(btn.getAttribute('aria-label'), `${id} aria-label`).toBeTruthy();
    }
  });

  it('region wrapper announces purpose', () => {
    render(<SwipeCardStack candidates={fixture()} />);
    const stack = screen.getByTestId('swipe-card-stack');
    expect(stack).toHaveAttribute('role', 'region');
    expect(stack.getAttribute('aria-label')).toBeTruthy();
  });
});
