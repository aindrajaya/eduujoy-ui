import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { PathModule } from '@/features/paths/types';
import { demoModules } from '@/fixtures/demo';
import { expectNoAxeViolations } from '@/test/axe';
import ModuleDetail from './ModuleDetail';

function renderDetail(module: PathModule) {
  return render(
    <MemoryRouter>
      <ModuleDetail module={module} backTo="/today" />
    </MemoryRouter>,
  );
}

describe('ModuleDetail', () => {
  it('renders the module and links external resources safely', async () => {
    const module = demoModules[0]!;
    const { container } = renderDetail(module);
    expect(screen.getByRole('heading', { level: 1, name: module.title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Path' })).toHaveAttribute('href', '/today');
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(module.resources.length);
    const youtube = within(items[0]!).getByRole('link');
    expect(youtube).toHaveAttribute('target', '_blank');
    expect(youtube).toHaveAttribute('rel', 'noopener noreferrer');
    expect(container.querySelector('iframe')).toBeNull();
    await expectNoAxeViolations(container);
  });

  it('renders unsafe or missing links as plain cards', () => {
    renderDetail({
      ...demoModules[0]!,
      resources: [{ type: 'Practice', name: 'Bad link', link: 'javascript:alert(1)', description: 'x' }],
    });
    expect(screen.queryByRole('link', { name: /bad link/i })).not.toBeInTheDocument();
    expect(screen.getByText('Bad link')).toBeInTheDocument();
  });

  it('shows an empty state without resources', () => {
    renderDetail({ ...demoModules[0]!, resources: [] });
    expect(screen.getByText(/no resources for this module yet/i)).toBeInTheDocument();
  });
});
