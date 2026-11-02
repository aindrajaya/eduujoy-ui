import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SketchGridCell from './SketchGridCell';
import { roughSeed } from './useRough';

const drawRough = vi.hoisted(() => vi.fn());
vi.mock('./rough/draw', () => ({ drawRough }));

function renderCell(here: boolean) {
  return render(
    <table>
      <tbody>
        <tr>
          <SketchGridCell stage="competent" bloom="C3" here={here}>
            {here && <span className="sr-only">You are here</span>}
          </SketchGridCell>
        </tr>
      </tbody>
    </table>,
  );
}

/** Past the first-paint delay, then lets the lazy import resolve. */
async function afterPaint() {
  await act(async () => {
    vi.advanceTimersByTime(1000);
    await vi.dynamicImportSettled();
  });
}

describe('roughSeed', () => {
  it('is stable per key, differs between cells and is never 0', () => {
    expect(roughSeed('competent:C3')).toBe(roughSeed('competent:C3'));
    expect(roughSeed('competent:C3')).not.toBe(roughSeed('competent:C4'));
    expect(roughSeed('')).not.toBe(0);
  });
});

describe('SketchGridCell (U12b rough hatching)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestIdleCallback', (task: () => void) => {
      task();
      return 1;
    });
    vi.stubGlobal('cancelIdleCallback', () => undefined);
    vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 48, height: 40 } as DOMRect);
  });
  afterEach(() => {
    // Unmount while the idle stubs still exist: the cleanup cancels the idle callback.
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    drawRough.mockReset();
  });

  it('the "now" cell keeps its CSS hatching until the first paint, then draws once with its own seed', async () => {
    const { container } = renderCell(true);
    const cell = container.querySelector('td');
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(cell).not.toHaveAttribute('data-rough');
    expect(drawRough).not.toHaveBeenCalled();

    await afterPaint();
    expect(drawRough).toHaveBeenCalledTimes(1);
    expect(drawRough).toHaveBeenCalledWith(svg, 'hatch', roughSeed('competent:C3'), 48, 40);
    expect(cell).toHaveAttribute('data-rough');
  });

  it('other cells load and draw nothing', async () => {
    const { container } = renderCell(false);
    await afterPaint();
    expect(container.querySelector('svg')).toBeNull();
    expect(drawRough).not.toHaveBeenCalled();
  });

  it('nothing draws after unmount', async () => {
    const { unmount } = renderCell(true);
    unmount();
    await afterPaint();
    expect(drawRough).not.toHaveBeenCalled();
  });

  it('a failed chunk keeps the CSS hatching', async () => {
    drawRough.mockImplementation(() => {
      throw new Error('chunk failed');
    });
    const { container } = renderCell(true);
    await afterPaint();
    expect(container.querySelector('td')).not.toHaveAttribute('data-rough');
  });
});
