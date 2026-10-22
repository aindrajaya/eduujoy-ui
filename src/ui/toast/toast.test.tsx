import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/test/axe';
import { dismissToast, getToasts, resetToasts, toast } from './store';
import ToastHost from './ToastHost';

afterEach(() => {
  act(() => {
    resetToasts();
  });
});

describe('toast store', () => {
  it('keeps at most three toasts, dropping the oldest', () => {
    for (const n of [1, 2, 3, 4]) toast({ title: `T${n}` });
    expect(getToasts().map((t) => t.title)).toEqual(['T2', 'T3', 'T4']);
  });

  it('dismisses by id and ignores unknown ids', () => {
    const id = toast({ title: 'Saved' });
    dismissToast('nope');
    expect(getToasts()).toHaveLength(1);
    dismissToast(id);
    expect(getToasts()).toHaveLength(0);
  });
});

describe('ToastHost', () => {
  it('renders nothing (and loads nothing) until the first toast', () => {
    const { container } = render(<ToastHost />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lazy-loads the toaster, shows the toast and runs its action', async () => {
    const onClick = vi.fn();
    const { baseElement } = render(<ToastHost />);
    act(() => {
      toast({ title: 'Could not save', description: 'Your change was undone.', tone: 'error', action: { label: 'Retry', onClick } });
    });
    expect(await screen.findByText('Could not save')).toBeInTheDocument();
    expect(screen.getByText('Your change was undone.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onClick).toHaveBeenCalledOnce();
    await expectNoAxeViolations(baseElement);
  });

  it('removes a toast when it is closed', async () => {
    render(<ToastHost />);
    act(() => {
      toast({ title: 'Step marked done', tone: 'success' });
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Dismiss' }));
    expect(getToasts()).toHaveLength(0);
  });
});
