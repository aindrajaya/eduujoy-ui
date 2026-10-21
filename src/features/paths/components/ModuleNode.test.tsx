import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { demoModules } from '@/fixtures/demo';
import { expectNoAxeViolations } from '@/test/axe';
import ModuleNode from './ModuleNode';

describe('ModuleNode', () => {
  it('links the module card to its step', async () => {
    const module = demoModules[0]!;
    const { container } = render(
      <MemoryRouter>
        <ul>
          <ModuleNode module={module} to="/steps/1" />
        </ul>
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: new RegExp(module.title) });
    expect(link).toHaveAttribute('href', '/steps/1');
    expect(link).toHaveTextContent('Module 1');
    await expectNoAxeViolations(container);
  });
});
