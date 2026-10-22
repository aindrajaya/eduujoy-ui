import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/test/axe';
import WelcomeSplash from './WelcomeSplash';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('WelcomeSplash', () => {
  it('continues on its own after 3 s plus the exit animation', () => {
    const onDone = vi.fn();
    render(<WelcomeSplash onDone={onDone} />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('Get Started skips the wait', async () => {
    const onDone = vi.fn();
    const { container } = render(<WelcomeSplash onDone={onDone} />);
    act(() => {
      screen.getByRole('button', { name: /get started/i }).click();
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onDone).toHaveBeenCalledOnce();
    vi.useRealTimers();
    await expectNoAxeViolations(container);
  });
});
