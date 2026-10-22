import { render, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { server } from '@/api/mocks/server';
import { expectNoAxeViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';
import { learningScience } from './bank';
import DemoPage from './DemoPage';
import { createLocalDiagnosticAdapter } from './localAdapter';

const fast = () => createLocalDiagnosticAdapter({ bank: learningScience, rng: () => 0, latencyMs: [0, 0] });

afterEach(() => {
  window.localStorage.clear();
});

async function startDemo(user: UserEvent) {
  await user.click(screen.getByRole('radio', { name: 'Pass an exam' }));
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.click(screen.getByRole('radio', { name: '3–5 h' }));
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.click(screen.getByRole('radio', { name: 'A mix' }));
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await user.click(screen.getByRole('radio', { name: 'Under a year' }));
  await user.click(screen.getByRole('radio', { name: 'No' }));
  await user.click(screen.getByRole('button', { name: 'Start the diagnostic' }));
  await screen.findByText(/Question 1 of 4/);
}

/** Answers every question with "I don't know yet" until the result shows. */
async function dontKnowAll(user: UserEvent) {
  while (!screen.queryByRole('heading', { level: 1, name: 'Your starting point' })) {
    await user.click(await screen.findByRole('button', { name: 'I don’t know yet' }));
  }
}

describe('/demo (PRD-UI §7b)', () => {
  it('asks goal, time and format, one screen each; every step needs a choice and Back keeps it', async () => {
    const user = userEvent.setup();
    const { container } = render(<DemoPage adapter={fast()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Find your starting point in learning science' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Step 1 of 4: Your goal' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('group', { name: 'What do you want from learning science?' })).toHaveAccessibleDescription(
      /Choose the option closest to you/,
    );
    await expectNoAxeViolations(container);
    await user.click(screen.getByRole('radio', { name: 'Teach others' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Step 2 of 4: Weekly time' })).toHaveFocus();
    expect(screen.queryByText(/Choose the option closest/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('radio', { name: 'Teach others' })).toBeChecked();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('the steps are keyboard-complete and survive a reload', async () => {
    const user = userEvent.setup();
    const first = render(<DemoPage adapter={fast()} />);
    screen.getByRole('radio', { name: 'Pass an exam' }).focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'Use it at work' })).toBeChecked();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { level: 2, name: 'Step 2 of 4: Weekly time' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('radio', { name: '1–2 h' })).toHaveFocus();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(screen.getByRole('heading', { level: 2, name: 'Step 3 of 4: Format' })).toHaveFocus();
    first.unmount();

    render(<DemoPage adapter={fast()} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Step 3 of 4: Format' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('radio', { name: '3–5 h' })).toBeChecked();
  });

  it('asks the self-report last; both questions are required and errors are tied to them', async () => {
    const user = userEvent.setup();
    const { container } = render(<DemoPage adapter={fast()} />);
    for (const choice of ['Just curious', '6+ h', 'Videos']) {
      await user.click(screen.getByRole('radio', { name: choice }));
      await user.click(screen.getByRole('button', { name: 'Continue' }));
    }
    expect(screen.getByText(/it is not a test/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start the diagnostic' }));
    const groups = screen.getAllByRole('group');
    expect(groups).toHaveLength(2);
    for (const group of groups) {
      expect(group).toHaveAttribute('aria-invalid', 'true');
      expect(group).toHaveAccessibleDescription(/Choose the option closest to you/);
    }
    await expectNoAxeViolations(container);
  });

  it('runs 8–12 items on the quiz engine and lands on the result; "I don’t know yet" is never called wrong', async () => {
    const user = userEvent.setup();
    const { container } = render(<DemoPage adapter={fast()} />);
    await startDemo(user);
    expect(screen.getByText('Set 1 of about 2')).toBeInTheDocument();
    await expectNoAxeViolations(container);
    await dontKnowAll(user);

    expect(screen.getByText('Start at C1 Remember')).toBeInTheDocument();
    expect(screen.getByText(/^You got 0 of \d Remember items/)).toBeInTheDocument();
    expect(screen.getByText(/This is a demo placement/)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Your demo placement/ })).toHaveTextContent('You are here');
    const statuses = screen.getAllByText('You said you don’t know yet:');
    expect(statuses.length).toBeGreaterThanOrEqual(8);
    expect(statuses.length).toBeLessThanOrEqual(12);
    expect(container).not.toHaveTextContent(/wrong/i);
    // Under the hood: an architecture summary with no repository link.
    expect(screen.getByText('Under the hood')).toBeInTheDocument();
    expect(container.querySelector('a[href*="github"]')).toBeNull();
    await expectNoAxeViolations(container);

    await user.click(screen.getByRole('button', { name: 'Retake' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Find your starting point in learning science' })).toBeInTheDocument();
  });

  it('a reload resumes the open set from this browser', async () => {
    const user = userEvent.setup();
    const adapter = fast();
    const first = render(<DemoPage adapter={adapter} />);
    await startDemo(user);
    for (let i = 0; i < 4; i += 1) await user.click(screen.getByRole('button', { name: 'I don’t know yet' }));
    await screen.findByText('Set 2 of about 2');
    first.unmount();

    render(<DemoPage adapter={fast()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Picking up where you left off');
    expect(await screen.findByText('Set 2 of about 2')).toBeInTheDocument();
    expect(screen.getByText(/4 of about 8 answered/)).toBeInTheDocument();
  });

  it('the public route makes no request: no auth/me, no refresh, no API at all', async () => {
    const requests: string[] = [];
    const onRequest = ({ request }: { request: Request }) => {
      requests.push(request.url);
    };
    server.events.on('request:start', onRequest);
    try {
      const user = userEvent.setup();
      renderRoute('/demo');
      await screen.findByRole('heading', { level: 1, name: 'Find your starting point in learning science' });
      await startDemo(user);
      await user.click(screen.getByRole('button', { name: 'I don’t know yet' }));
      expect(await screen.findByText(/Question 2 of 4/)).toBeInTheDocument();
      expect(requests).toEqual([]);
    } finally {
      server.events.removeListener('request:start', onRequest);
    }
  });
});
