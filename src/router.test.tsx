import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { routes } from './router';
import { renderRoute } from './test/render';

describe('router', () => {
  it('declares every route as lazy', () => {
    const walk = (list: typeof routes): boolean =>
      list.every((r) => Boolean(r.lazy) && !r.Component && !r.element && walk(r.children ?? []));
    expect(walk(routes)).toBe(true);
  });

  it('renders the not-found screen for unknown paths', async () => {
    renderRoute('/nope');
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});
