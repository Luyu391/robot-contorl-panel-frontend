/**
 * Contract: SafetyGuard must...
 *   1. Render when open
 *   2. Show warnings when present
 *   3. Have confirm and cancel buttons
 *   4. Hide when closed
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SafetyGuard } from '../src/components/SafetyGuard';

describe('SafetyGuard contract', () => {
  it('renders title when open', () => {
    render(
      <SafetyGuard
        open={true}
        title="安全确认"
        message=""
        warnings={[]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    
    expect(screen.getByText('安全确认')).toBeInTheDocument();
  });

  it('shows warnings when present', () => {
    const warnings = ['检测到紧急停止关键词'];
    render(
      <SafetyGuard
        open={true}
        title="安全确认"
        message=""
        warnings={warnings}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    
    expect(screen.getByText('检测到紧急停止关键词')).toBeInTheDocument();
  });

  it('has confirm button', () => {
    render(
      <SafetyGuard
        open={true}
        title="安全确认"
        message=""
        warnings={[]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    
    expect(screen.getByRole('button', { name: /确认|check/i })).toBeInTheDocument();
  });

  it('has cancel button', () => {
    render(
      <SafetyGuard
        open={true}
        title="安全确认"
        message=""
        warnings={[]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    
    expect(screen.getByRole('button', { name: /取消|close/i })).toBeInTheDocument();
  });

  it('does not render content when not open', () => {
    render(
      <SafetyGuard
        open={false}
        title="安全确认"
        message=""
        warnings={[]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    
    expect(screen.queryByText('安全确认')).not.toBeInTheDocument();
  });
});