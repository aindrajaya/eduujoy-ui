import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockPath, mockProblem } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { renderRoute } from '@/test/render';

// Audit: every screen has exactly one h1, whatever state it is in.
const h1s = () => screen.queryAllByRole('heading', { level: 1 });

async function expectOneH1(name: string | RegExp) {
  await waitFor(() => {
    expect(h1s()).toHaveLength(1);
  });
  expect(h1s()[0]).toHaveAccessibleName(name);
}

const notFound = () => problemResponse(mockProblem(404, 'NOT_FOUND', 'Not Found'));
const broken = () => problemResponse(mockProblem(500, 'INTERNAL', 'Boom'));

describe('one h1 per screen', () => {
  it('Today: the path name with a path; "Today" when empty, closed or failing', async () => {
    const { unmount } = renderRoute('/today');
    await screen.findByText('Continue: Step 2');
    await expectOneH1(mockPath.topic.canonicalName);
    unmount();

    for (const response of [
      () => Response.json({ items: [], nextCursor: null }),
      notFound,
      broken,
    ]) {
      server.use(http.get('/v1/paths', ({ response: r }) => r.untyped(response())));
      const view = renderRoute('/today');
      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /Loading/ })).not.toBeInTheDocument();
      });
      await expectOneH1('Today');
      view.unmount();
    }
  });

  it('Progress and Paths: one title in every state', async () => {
    for (const handler of [undefined, () => Response.json({ items: [] }), broken]) {
      if (handler) server.use(http.get('/v1/progress', ({ response }) => response.untyped(handler())));
      const view = renderRoute('/progress');
      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /Loading/ })).not.toBeInTheDocument();
      });
      await expectOneH1('Progress');
      view.unmount();
    }
    renderRoute('/paths');
    await screen.findByRole('link', { name: /Product Design/ });
    await expectOneH1('Your paths');
  });
});
