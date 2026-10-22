import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { mockPath } from '@/api/mocks/data';
import { http } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import type { FeedbackRequest, StepPatchRequest } from '@/api/types';
import { expectNoAxeViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';
import { resetToasts } from '@/ui/toast/store';

afterEach(() => {
  act(() => {
    resetToasts();
  });
});

const step2 = mockPath.steps[1]!;

describe('/steps/:id (US-04, US-07, US-08)', () => {
  it('shows the step: objective, Bloom tag, done-when, actions and resources (no iframe yet)', async () => {
    const { container } = renderRoute('/steps/step-2?path=path-1');
    expect(await screen.findByRole('heading', { level: 1, name: step2.objective })).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 6')).toBeInTheDocument();
    expect(screen.getByText('C3 · Apply', { selector: 'header span' })).toBeInTheDocument();
    expect(screen.getByText(step2.doneWhen)).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Actions' })).getAllByRole('checkbox')).toHaveLength(2);
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('link', { name: /Start checkpoint/ })).toHaveAttribute('href', '/checkpoints/step-2?path=path-1');
    await expectNoAxeViolations(container);
  });

  it('a finished step shows its checkpoint score and moves on; a review step says why it is there', async () => {
    server.use(
      http.get('/v1/paths/{id}', ({ response }) =>
        response(200).json({
          ...mockPath,
          steps: mockPath.steps.map((s) =>
            s.n === 1
              ? { ...s, checkpoint: { ...s.checkpoint, lastScore: 90 } }
              : s.n === 2
                ? { ...s, remedial: true, checkpoint: { ...s.checkpoint, lastScore: 40, attempts: 2 } }
                : s,
          ),
        }),
      ),
    );
    const { unmount } = renderRoute('/steps/step-1?path=path-1');
    expect(await screen.findByText('Checkpoint passed: 90%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Next: Step 2/ })).toHaveAttribute('href', '/steps/step-2?path=path-1');
    unmount();
    renderRoute('/steps/step-2?path=path-1');
    expect(await screen.findByText('Last checkpoint score: 40%')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('after two missed checkpoints');
  });

  it('ticks an action at once and saves it', async () => {
    let patch: StepPatchRequest | undefined;
    server.use(
      http.patch('/v1/steps/{id}', async ({ request, response }) => {
        patch = await request.json();
        return response(200).json({ ...step2, actions: step2.actions.map((a) => (a.n === 2 ? { ...a, done: true } : a)) });
      }),
    );
    renderRoute('/steps/step-2?path=path-1');
    const box = await screen.findByRole('checkbox', { name: /Write a one-page plan/ });
    await userEvent.click(box);
    expect(box).toBeChecked();
    await waitFor(() => {
      expect(patch).toEqual({ actionsDone: [{ n: 2, done: true }] });
    });
  });

  it('records difficulty (US-08) with a confirmation', async () => {
    let patch: StepPatchRequest | undefined;
    server.use(
      http.patch('/v1/steps/{id}', async ({ request, response }) => {
        patch = await request.json();
        return response(200).json({ ...step2, difficulty: 'too_hard' });
      }),
    );
    renderRoute('/steps/step-2?path=path-1');
    await userEvent.click(await screen.findByRole('radio', { name: 'Too hard' }));
    expect(screen.getByRole('radio', { name: 'Too hard' })).toHaveAttribute('aria-checked', 'true');
    expect(await screen.findByText('Thanks. We’ll adjust your next steps.')).toBeInTheDocument();
    expect(patch).toEqual({ difficulty: 'too_hard' });
  });

  it('thumbs a resource down and swaps it (US-07)', async () => {
    let feedback: FeedbackRequest | undefined;
    const swapped = {
      ...step2,
      resources: [{ ...step2.resources[0]!, id: 'res-new', title: 'A fresh explainer' }, step2.resources[1]!],
    };
    server.use(
      http.post('/v1/feedback', async ({ request, response }) => {
        feedback = await request.json();
        return response(204).empty();
      }),
      http.post('/v1/resources/{id}/swap', ({ response }) => response(200).json(swapped)),
    );
    renderRoute('/steps/step-2?path=path-1');
    const card = (await screen.findAllByRole('article'))[0]!;
    await userEvent.click(within(card).getByRole('button', { name: 'Not helpful' }));
    expect(within(card).getByRole('button', { name: 'Not helpful' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => {
      expect(feedback).toEqual({ targetType: 'resource', targetId: 'res-2-yt', kind: 'down' });
    });
    await userEvent.click(within(card).getByRole('button', { name: 'Swap' }));
    expect(await screen.findByRole('heading', { name: 'A fresh explainer' })).toBeInTheDocument();
    expect(await screen.findByText('Swapped for another resource')).toBeInTheDocument();
  });

  it('without ?path, uses the active path', async () => {
    renderRoute('/steps/step-3');
    expect(await screen.findByRole('heading', { level: 1, name: mockPath.steps[2]!.objective })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('opens after the ones before it');
  });

  it('explains an unknown step', async () => {
    renderRoute('/steps/nope?path=path-1');
    expect(await screen.findByText('Step not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to path' })).toHaveAttribute('href', '/paths/path-1');
  });

  it('the last step leads back to the path', async () => {
    renderRoute('/steps/step-6?path=path-1');
    await screen.findByRole('heading', { level: 1, name: mockPath.steps[5]!.objective });
    const links = screen.getAllByRole('link', { name: /Back to path/ });
    expect(links.at(-1)).toHaveAttribute('href', '/paths/path-1');
  });
});
