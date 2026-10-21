import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestFinished, requestStarted } from '@/api/activity';
import BootSplash from '@/app/BootSplash';
import { expectNoAxeViolations } from '@/test/axe';
import WakeUpNotice from './WakeUpNotice';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('WakeUpNotice', () => {
  it('stays an empty live region for fast requests', () => {
    render(<WakeUpNotice />);
    act(() => {
      requestStarted();
    });
    act(() => {
      vi.advanceTimersByTime(1400);
    });
    act(() => {
      requestFinished();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('says the server is waking up after 1.5 s, and hides when the request lands', async () => {
    const { container } = render(<WakeUpNotice />);
    // Separate acts: the hook schedules its timer in an effect that runs when the first act ends.
    act(() => {
      requestStarted();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Waking up the server…');
    vi.useRealTimers();
    await expectNoAxeViolations(container);
    act(() => {
      requestFinished();
    });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});

describe('BootSplash', () => {
  it('switches from loading to waking up after 1.5 s', () => {
    render(<BootSplash />);
    expect(screen.getByRole('status', { name: 'Loading Eduujoy' })).toBeInTheDocument();
    // Separate acts: the hook schedules its timer in an effect that runs when the first act ends.
    act(() => {
      requestStarted();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByRole('status', { name: 'Waking up the server' })).toHaveTextContent(
      'Waking up the server…',
    );
    act(() => {
      requestFinished();
    });
  });
});
