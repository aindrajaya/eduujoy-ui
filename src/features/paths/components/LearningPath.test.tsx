import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { demoActionPlan, demoModules } from '@/fixtures/demo';
import { expectNoAxeViolations } from '@/test/axe';
import LearningPath from './LearningPath';

function renderPath(modules = demoModules) {
  return render(
    <MemoryRouter>
      <LearningPath focusArea="Product Design" actionPlan={demoActionPlan} modules={modules} />
    </MemoryRouter>,
  );
}

describe('LearningPath', () => {
  it('lists every module in order', async () => {
    const { container } = renderPath();
    expect(screen.getByRole('heading', { level: 1, name: 'Product Design' })).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(demoModules.length);
    expect(links[0]).toHaveAttribute('href', '/steps/1');
    await expectNoAxeViolations(container);
  });

  it('shows an empty state when there are no modules', async () => {
    const { container } = renderPath([]);
    expect(screen.getByText(/no modules yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
