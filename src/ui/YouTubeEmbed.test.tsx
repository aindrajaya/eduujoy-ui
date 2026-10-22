import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/test/axe';
import YouTubeEmbed from './YouTubeEmbed';

describe('YouTubeEmbed', () => {
  it('shows only the thumbnail and title until tapped (no iframe)', async () => {
    const { container } = render(<YouTubeEmbed videoId="Fj-2tVw0d1g" title="User research methods" start="4:10" end="7:45" />);
    expect(container.querySelector('iframe')).toBeNull();
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://i.ytimg.com/vi/Fj-2tVw0d1g/hqdefault.jpg');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img?.getAttribute('srcset')).toContain('mqdefault.jpg 320w');
    expect(screen.getByText('Watch 04:10–07:45')).toBeInTheDocument();
    expect(screen.getByText('User research methods')).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('a tap loads the nocookie player at the segment with a limited allow list', async () => {
    const { container } = render(<YouTubeEmbed videoId="Fj-2tVw0d1g" title="User research methods" start="4:10" end="7:45" />);
    await userEvent.click(screen.getByRole('button', { name: 'Play video: User research methods' }));
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    const src = new URL(iframe?.getAttribute('src') ?? '');
    expect(src.origin).toBe('https://www.youtube-nocookie.com');
    expect(src.pathname).toBe('/embed/Fj-2tVw0d1g');
    expect(Object.fromEntries(src.searchParams)).toMatchObject({ autoplay: '1', start: '250', end: '465', rel: '0' });
    expect(iframe).toHaveAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    expect(iframe).toHaveAttribute('title', 'User research methods');
  });

  it('handles open-ended or missing segments, and ignores an end before the start', async () => {
    const { container, rerender } = render(<YouTubeEmbed videoId="Fj-2tVw0d1g" title="t" start="4:10" />);
    expect(screen.getByText('Watch 04:10 onwards')).toBeInTheDocument();
    rerender(<YouTubeEmbed videoId="Fj-2tVw0d1g" title="t" start="7:45" end="4:10" />);
    await userEvent.click(screen.getByRole('button'));
    expect(new URL(container.querySelector('iframe')?.getAttribute('src') ?? '').searchParams.has('end')).toBe(false);
    rerender(<YouTubeEmbed videoId="Fj-2tVw0d1g" title="t" />);
    expect(screen.queryByText(/^Watch/)).not.toBeInTheDocument();
  });

  it('renders nothing for an invalid video id', () => {
    const { container } = render(<YouTubeEmbed videoId="javascript:alert(1)" title="t" />);
    expect(container).toBeEmptyDOMElement();
  });
});
