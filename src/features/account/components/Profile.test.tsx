import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { demoProfile, demoUser } from '@/fixtures/demo';
import { expectNoAxeViolations } from '@/test/axe';
import Profile from './Profile';

describe('Profile', () => {
  it('shows the user and every profile field', async () => {
    const { container } = render(<Profile profile={demoProfile} user={demoUser} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Jane Doe' })).toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument();
    expect(screen.getAllByRole('term')).toHaveLength(6);
    expect(screen.getByText(demoProfile.goal)).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('falls back when the name is empty', () => {
    render(<Profile profile={demoProfile} user={{ name: '', email: 'x@y.z' }} />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
