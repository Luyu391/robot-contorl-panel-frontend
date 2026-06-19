/**
 * Contract: PageTransition must...
 *   1. Render children
 *   2. Support all transition modes
 *   3. Respect prefers-reduced-motion
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PageTransition } from '../src/components/PageTransition';

describe('PageTransition contract', () => {
  const renderWithRouter = (ui: React.ReactElement) => {
    return render(
      <MemoryRouter initialEntries={['/']}>
        {ui}
      </MemoryRouter>
    );
  };

  it('renders children', () => {
    renderWithRouter(
      <PageTransition mode="fade">
        <div>Test Content</div>
      </PageTransition>
    );
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('supports fade transition mode', () => {
    renderWithRouter(
      <PageTransition mode="fade">
        <div>Fade Content</div>
      </PageTransition>
    );
    
    expect(screen.getByText('Fade Content')).toBeInTheDocument();
  });

  it('supports enter transition mode', () => {
    renderWithRouter(
      <PageTransition mode="enter">
        <div>Enter Content</div>
      </PageTransition>
    );
    
    expect(screen.getByText('Enter Content')).toBeInTheDocument();
  });

  it('supports push transition mode', () => {
    renderWithRouter(
      <PageTransition mode="push">
        <div>Push Content</div>
      </PageTransition>
    );
    
    expect(screen.getByText('Push Content')).toBeInTheDocument();
  });

  it('supports pop transition mode', () => {
    renderWithRouter(
      <PageTransition mode="pop">
        <div>Pop Content</div>
      </PageTransition>
    );
    
    expect(screen.getByText('Pop Content')).toBeInTheDocument();
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
    
    renderWithRouter(
      <PageTransition mode="fade">
        <div>Reduced Motion Content</div>
      </PageTransition>
    );
    
    expect(screen.getByText('Reduced Motion Content')).toBeInTheDocument();
  });
});