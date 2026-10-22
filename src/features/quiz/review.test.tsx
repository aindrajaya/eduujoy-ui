import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/errors';
import { expectNoAxeViolations } from '@/test/axe';
import { useQuizDispatch, useQuizState } from './context';
import QuizProvider from './QuizProvider';
import type { QuizAction } from './reducer';
import ReviewScreen from './ReviewScreen';
import { answerSummary } from './summary';
import type { QuizQuestion } from './types';

const questions: QuizQuestion[] = Array.from({ length: 50 }, (_, i) => ({
  id: `q${i + 1}`,
  kind: i % 2 ? 'short_answer' : 'single_choice',
  prompt: `Question number ${i + 1}: a longer prompt that a learner reads carefully before answering.`,
  ...(i % 2 ? {} : { options: [{ id: 'a', label: 'Option A' }, { id: 'b', label: 'Option B' }] }),
}));

// jsdom has no layout; give elements a phone-sized box so the virtualiser renders a window of rows.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
    { x: 0, y: 0, top: 0, left: 0, bottom: 600, right: 360, width: 360, height: 600, toJSON: () => ({}) },
  );
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(600);
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(360);
});

let dispatchRef: ((a: QuizAction) => void) | undefined;
function Spy() {
  const dispatch = useQuizDispatch();
  useEffect(() => {
    dispatchRef = dispatch;
  }, [dispatch]);
  const { index, status } = useQuizState();
  return <p data-testid="spy">{`${status}:${index}`}</p>;
}

function renderReview(onSubmit = vi.fn(), waitingForNetwork = false, describeError?: (error: ApiError) => string | undefined) {
  const utils = render(
    <QuizProvider quizId="q" questions={questions}>
      <Spy />
      <ReviewScreen onSubmit={onSubmit} waitingForNetwork={waitingForNetwork} describeError={describeError} />
    </QuizProvider>,
  );
  act(() => {
    dispatchRef?.({ type: 'COMMIT', questionId: 'q1', answer: { optionIds: ['b'] } });
    dispatchRef?.({ type: 'TOGGLE_FLAG', questionId: 'q2' });
    dispatchRef?.({ type: 'REVIEW' });
  });
  return { onSubmit, ...utils };
}

describe('ReviewScreen', () => {
  it('lists answers in a virtualised list (only a window of 50 rows is in the DOM)', async () => {
    const { container } = renderReview();
    const list = await screen.findByRole('list', { name: 'Your answers' });
    const rows = list.querySelectorAll('li');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(50);
    expect(screen.getByText('Option B')).toBeInTheDocument();
    expect(screen.getByText('Flagged')).toBeInTheDocument();
    expect(screen.getByText('49 of 50 not answered yet. Tap a question to answer it.')).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('tapping a row goes back to that question', async () => {
    renderReview();
    await userEvent.click(await screen.findByRole('button', { name: /Question number 2:/ }));
    expect(screen.getByTestId('spy')).toHaveTextContent('answering:1');
  });

  it('submits, then disables while submitting and explains an offline queue', async () => {
    const { onSubmit } = renderReview(vi.fn(), true);
    await userEvent.click(screen.getByRole('button', { name: 'Submit answers' }));
    expect(onSubmit).toHaveBeenCalledOnce();
    act(() => {
      dispatchRef?.({ type: 'SUBMIT' });
    });
    expect(screen.getByRole('button', { name: 'Submitting…' })).toBeDisabled();
    expect(screen.getByText(/You are offline/)).toBeInTheDocument();
  });

  it('shows a retry after a failed submit', () => {
    renderReview();
    act(() => {
      dispatchRef?.({ type: 'SUBMIT' });
      dispatchRef?.({ type: 'FAILED', error: new ApiError({ status: 0, code: 'NETWORK_ERROR', title: 'x' }) });
    });
    expect(screen.getByRole('alert')).toHaveTextContent('saved on this device');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
    act(() => {
      dispatchRef?.({ type: 'SUBMIT' });
      dispatchRef?.({ type: 'FAILED', error: new ApiError({ status: 500, code: 'INTERNAL', title: 'x' }) });
    });
    expect(screen.getByRole('alert')).toHaveTextContent('We could not submit your answers.');
  });

  it('uses the screen’s copy for errors it knows, and the generic copy for the rest', () => {
    renderReview(vi.fn(), false, (error) => (error.code === 'AI_BUDGET_EXCEEDED' ? 'Grading is paused.' : undefined));
    act(() => {
      dispatchRef?.({ type: 'SUBMIT' });
      dispatchRef?.({ type: 'FAILED', error: new ApiError({ status: 503, code: 'AI_BUDGET_EXCEEDED', title: 'x' }) });
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Grading is paused.');
    act(() => {
      dispatchRef?.({ type: 'SUBMIT' });
      dispatchRef?.({ type: 'FAILED', error: new ApiError({ status: 500, code: 'INTERNAL', title: 'x' }) });
    });
    expect(screen.getByRole('alert')).toHaveTextContent('We could not submit your answers.');
  });

  it('says when everything is answered', () => {
    render(
      <QuizProvider quizId="q" questions={questions.slice(0, 1)}>
        <Spy />
        <ReviewScreen onSubmit={vi.fn()} />
      </QuizProvider>,
    );
    act(() => {
      dispatchRef?.({ type: 'COMMIT', questionId: 'q1', answer: { optionIds: ['a'] } });
    });
    expect(screen.getByText(/Everything is answered/)).toBeInTheDocument();
  });
});

describe('answerSummary', () => {
  const q = questions[0]!;
  it.each([
    [undefined, 'Not answered'],
    [{ skipped: true }, 'Skipped'],
    [{ optionIds: ['a', 'zz'] }, 'Option A, zz'],
    [{ text: 'free text' }, 'free text'],
    [{}, 'Not answered'],
  ])('%j → %s', (answer, expected) => {
    expect(answerSummary(q, answer)).toBe(expected);
  });
});
