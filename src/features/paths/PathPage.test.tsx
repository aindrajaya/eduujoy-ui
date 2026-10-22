import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockPath } from '@/api/mocks/data';
import { http } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { expectNoAxeViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';

describe('/paths/:id (US-03 SOP overview)', () => {
  it('lists every step with Bloom tag, time and a spelled-out status', async () => {
    const { container } = renderRoute('/paths/path-1');
    expect(await screen.findByRole('heading', { level: 1, name: 'Product Design (UI/UX)' })).toBeInTheDocument();
    expect(screen.getByText('From Advanced beginner to Competent · about 4.5 h in total')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Path progress' })).toHaveAttribute('aria-valuenow', '1');
    const steps = within(screen.getByRole('region', { name: 'Steps' })).getAllByRole('listitem');
    expect(steps).toHaveLength(6);
    expect(steps[0]).toHaveTextContent('Done');
    expect(steps[1]).toHaveTextContent('In progress');
    expect(steps[1]).toHaveTextContent('C3 · Apply');
    expect(within(steps[1]!).getByRole('link')).toHaveAttribute('href', '/steps/step-2?path=path-1');
    expect(screen.getByRole('link', { name: /Continue: Step 2/ })).toHaveAttribute('href', '/steps/step-2?path=path-1');
    await expectNoAxeViolations(container);
  });

  it('explains a path that is still being built', async () => {
    server.use(http.get('/v1/paths/{id}', ({ response }) => response(200).json({ ...mockPath, status: 'generating', steps: [] })));
    renderRoute('/paths/path-1');
    expect(await screen.findByText('This path is still being built')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Continue/ })).not.toBeInTheDocument();
  });

  it('explains an unknown path', async () => {
    renderRoute('/paths/missing');
    expect(await screen.findByText('Path not found')).toBeInTheDocument();
  });
});
