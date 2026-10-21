import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { mockCheckpointFailed, mockCheckpointResult, mockPath } from '@/api/mocks/data';
import type { CheckpointResult, PathStep } from '@/api/types';
import { expectNoAxeViolations } from '@/test/axe';
import CheckpointResultView from './CheckpointResultView';

const step2 = mockPath.steps[1];
if (!step2) throw new Error('mockPath needs step 2');
const step: PathStep = step2;

function renderResult(result: CheckpointResult, onRetry = vi.fn()) {
  const utils = render(
    <MemoryRouter>
      <CheckpointResultView path={mockPath} step={step} result={result} onRetry={onRetry} />
    </MemoryRouter>,
  );
  return { onRetry, ...utils };
}

describe('CheckpointResultView (US-05)', () => {
  it('a pass shows the score against the pass mark, the feedback, and leads to the next step', async () => {
    const { container } = renderResult(mockCheckpointResult);
    const heading = screen.getByRole('heading', { name: 'You passed this checkpoint' });
    expect(heading).toHaveFocus();
    expect(screen.getByText(/pass mark 80%/)).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Your score' })).toHaveAttribute('aria-valuenow', '87');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText(/Say what you would ask/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Next: Step 3/ })).toHaveAttribute('href', '/steps/step-3?path=path-1');
    await expectNoAxeViolations(container);
  });

  it('a first fail shows the mix-up and offers a retry on this screen', async () => {
    const { onRetry, container } = renderResult(mockCheckpointFailed);
    expect(screen.getByRole('heading', { name: 'Not passed yet' })).toBeInTheDocument();
    expect(screen.getByText('Surveys explain motivation')).toBeInTheDocument();
    expect(screen.getByText(/If you miss it twice/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Try again/ }));
    expect(onRetry).toHaveBeenCalledOnce();
    await expectNoAxeViolations(container);
  });

  it('a second fail points to the inserted review step', () => {
    renderResult({ ...mockCheckpointFailed, remedialStepId: 'step-2r' });
    expect(screen.getByRole('note')).toHaveTextContent('We added a review step one level lower');
    expect(screen.getByRole('link', { name: /Go to the review step/ })).toHaveAttribute('href', '/steps/step-2r?path=path-1');
    expect(screen.queryByRole('button', { name: /Try again/ })).not.toBeInTheDocument();
  });

  it('passing the top of the band says the next stage is being built', () => {
    renderResult({ ...mockCheckpointResult, stageAdvanced: true, nextStepId: null });
    expect(screen.getByRole('note')).toHaveTextContent('You reached the next stage');
    expect(screen.getByRole('link', { name: /Back to Today/ })).toHaveAttribute('href', '/today');
  });

  it('a pass without a next step leads back to the path; an unknown next step still links', () => {
    const { unmount } = renderResult({ ...mockCheckpointResult, nextStepId: null });
    expect(screen.getByRole('link', { name: /Back to path/ })).toHaveAttribute('href', '/paths/path-1');
    unmount();
    renderResult({ ...mockCheckpointResult, nextStepId: 'step-9' });
    expect(screen.getByRole('link', { name: /Next step/ })).toHaveAttribute('href', '/steps/step-9?path=path-1');
  });
});
