import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BloomChip from './BloomChip';
import { loadSketchFonts } from './loadFonts';
import StageBadge from './StageBadge';

describe('sketch primitives (PRD-UI §4b)', () => {
  it('writes the stage name in text beside its colour mark', () => {
    render(<StageBadge stage="advanced_beginner" />);
    const badge = screen.getByText('Advanced beginner');
    expect(badge).toHaveAttribute('data-stage', 'advanced_beginner');
    expect(badge.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('labels a Bloom level with its verb', () => {
    render(<BloomChip bloom="C3" />);
    expect(screen.getByText('C3 Apply')).toBeInTheDocument();
  });

  it('declares the fonts only after first paint, and can be cancelled', () => {
    vi.useFakeTimers();
    const cancel = loadSketchFonts(50);
    cancel();
    vi.runAllTimers();
    vi.useRealTimers();
    expect(document.head.querySelector('link[rel="preload"]')).toBeNull();
  });
});
