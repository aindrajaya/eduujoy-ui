import { describe, expect, it } from 'vitest';
import { drawRough } from './draw';

const svg = () => document.createElementNS('http://www.w3.org/2000/svg', 'svg');

function drawn(kind: 'hatch' | 'ring', seed: number) {
  const el = svg();
  drawRough(el, kind, seed, 48, 40);
  return el.innerHTML;
}

describe('drawRough (real roughjs)', () => {
  it('the same seed draws the same shape, so screenshots are stable', () => {
    expect(drawn('hatch', 7)).toBe(drawn('hatch', 7));
    expect(drawn('ring', 7)).toBe(drawn('ring', 7));
    expect(drawn('hatch', 7)).not.toBe(drawn('hatch', 8));
  });

  it('draws in currentColor only, and a redraw replaces the shape', () => {
    const el = svg();
    drawRough(el, 'hatch', 3, 48, 40);
    drawRough(el, 'hatch', 3, 60, 40);
    expect(el.children).toHaveLength(1);
    const colours = new Set([...el.querySelectorAll('path')].flatMap((p) => [p.getAttribute('stroke'), p.getAttribute('fill')]));
    colours.delete('none');
    colours.delete(null);
    expect([...colours]).toEqual(['currentColor']);
  });
});
