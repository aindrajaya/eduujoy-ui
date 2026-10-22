import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BloomChip from './BloomChip';
import { preloadSketchFont } from './preloadFont';
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

  it('preloads Nunito once', () => {
    preloadSketchFont();
    preloadSketchFont();
    const links = document.head.querySelectorAll('link[rel="preload"][as="font"]');
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute('href')).toMatch(/Nunito-latin-wght/);
    expect(links[0]?.getAttribute('crossorigin')).toBe('anonymous');
  });
});
