import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockPath } from '@/api/mocks/data';
import type { Resource } from '@/api/types';
import { expectNoAxeViolations } from '@/test/axe';
import ResourceCard from './ResourceCard';

const [video, article] = mockPath.steps[1]!.resources as [Resource, Resource];

function card(resource: Resource, props: Partial<Parameters<typeof ResourceCard>[0]> = {}) {
  const handlers = { onThumb: vi.fn(), onSwap: vi.fn() };
  const utils = render(<ResourceCard resource={resource} thumb={null} {...handlers} {...props} />);
  return { ...handlers, ...utils };
}

describe('ResourceCard (US-04)', () => {
  it('video: type, source, length, tags, why, takeaways and the segment facade (no iframe)', async () => {
    const { container } = card(video);
    expect(screen.getByText('Video')).toBeInTheDocument();
    expect(screen.getByText('Nielsen Norman Group · 10 min video')).toBeInTheDocument();
    expect(screen.getByText('Advanced beginner')).toBeInTheDocument();
    expect(screen.getByText('C3 · Apply')).toBeInTheDocument();
    expect(screen.getByText(/matches your preferred format/)).toBeInTheDocument();
    expect(screen.getByText('Five users surface most usability problems')).toBeInTheDocument();
    expect(screen.getByText('Watch 04:10–07:45')).toBeInTheDocument();
    expect(container.querySelector('iframe')).toBeNull();
    await expectNoAxeViolations(container);
  });

  it('article: safe external link, reading length, no takeaways section when none', async () => {
    const { container } = card(article);
    expect(screen.getByRole('link', { name: /Open on nngroup.com/ })).toHaveAttribute('target', '_blank');
    expect(screen.getByText('nngroup.com · 12 min read')).toBeInTheDocument();
    expect(screen.queryByText('Key takeaways')).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('shows at most five takeaways and drops unsafe links', () => {
    card({ ...article, url: 'javascript:alert(1)', keyTakeaways: ['1', '2', '3', '4', '5', '6'] });
    expect(screen.getAllByRole('listitem').filter((li) => /^\d$/.test(li.textContent))).toHaveLength(5);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('thumbs and swap', async () => {
    const { onThumb, onSwap } = card(video, { thumb: 'down' });
    expect(screen.getByRole('button', { name: 'Not helpful' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Helpful' }));
    expect(onThumb).toHaveBeenCalledWith('up');
    await userEvent.click(screen.getByRole('button', { name: 'Swap' }));
    await userEvent.click(screen.getByRole('button', { name: 'Video unavailable? Swap it' }));
    expect(onSwap).toHaveBeenCalledTimes(2);
  });

  it('shows the swapping state and labels other resource types', () => {
    card({ ...article, type: 'paper', durationMin: null, readingMin: null }, { swapping: true });
    expect(screen.getByText('Paper')).toBeInTheDocument();
    expect(screen.getByText('nngroup.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Swapping…' })).toBeDisabled();
  });
});
