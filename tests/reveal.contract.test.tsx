import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MatchRevealAnimation from '../src/features/dating/MatchRevealAnimation';
import type { MatchRevealPayload } from '../src/types';

const payload: MatchRevealPayload = {
  matchId: 'm1',
  selfName: '当前任务',
  partnerName: '精密抓取方案',
  score: 86,
  highlights: ['操作参数匹配', '执行环境兼容'],
};

describe('a11y contract: MatchRevealAnimation', () => {
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

  it('renders a dialog role with aria-label', () => {
    render(<MatchRevealAnimation payload={payload} onComplete={vi.fn()} autoCompleteMs={9999} />);
    const dialog = screen.getByTestId('match-reveal');
    expect(dialog).toHaveAttribute('role', 'dialog');
    expect(dialog.getAttribute('aria-label')).toMatch(/精密抓取方案/);
  });

  it('always renders a focusable skip button', () => {
    render(<MatchRevealAnimation payload={payload} onComplete={vi.fn()} autoCompleteMs={9999} />);
    const skip = screen.getByTestId('match-reveal-skip');
    expect(skip).toHaveAttribute('aria-label');
    expect(skip).not.toBeDisabled();
  });

  it('calls onComplete with skipped=true when skip is clicked', async () => {
    const onComplete = vi.fn();
    render(<MatchRevealAnimation payload={payload} onComplete={onComplete} autoCompleteMs={9999} />);
    const skip = screen.getByTestId('match-reveal-skip');
    skip.click();
    expect(onComplete).toHaveBeenCalledWith(true);
  });

  it('calls onComplete with skipped=false on auto-complete', async () => {
    const onComplete = vi.fn();
    render(<MatchRevealAnimation payload={payload} onComplete={onComplete} autoCompleteMs={100} />);
    await new Promise((r) => setTimeout(r, 200));
    expect(onComplete).toHaveBeenCalledWith(false);
  });
});
