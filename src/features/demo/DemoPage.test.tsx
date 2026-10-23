import { render, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { server } from '@/api/mocks/server';
import { expectNoAxeViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';
import DemoPage from './DemoPage';
import type { Bank } from './bank';
import { demoTopics, type BankEntry } from './banks';
import { createLocalDiagnosticAdapter } from './localAdapter';

const fast = (bank: Bank) => createLocalDiagnosticAdapter({ bank, rng: () => 0, latencyMs: [0, 0] });
// The single-topic flow (no topic step), as /demo was before the catalog topics were signed off.
const LEARNING_SCIENCE_ONLY = demoTopics.filter((t) => t.id === 'learning-science');

afterEach(() => {
  window.localStorage.clear();
});

async function startDemo(user: UserEvent) {
  // With several reviewed topics (the route's own list), pick learning science first.
  const topic = screen.queryByRole('radio', { name: /^Learning science/ });
  if (topic) {
    await user.click(topic);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
  }
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
    const { container } = render(<DemoPage topics={LEARNING_SCIENCE_ONLY} createAdapter={fast} />);
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
    const first = render(<DemoPage topics={LEARNING_SCIENCE_ONLY} createAdapter={fast} />);
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

    render(<DemoPage topics={LEARNING_SCIENCE_ONLY} createAdapter={fast} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Step 3 of 4: Format' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('radio', { name: '3–5 h' })).toBeChecked();
  });

  it('asks the self-report last; both questions are required and errors are tied to them', async () => {
    const user = userEvent.setup();
    const { container } = render(<DemoPage topics={LEARNING_SCIENCE_ONLY} createAdapter={fast} />);
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
    const { container } = render(<DemoPage topics={LEARNING_SCIENCE_ONLY} createAdapter={fast} />);
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
    const first = render(<DemoPage topics={LEARNING_SCIENCE_ONLY} createAdapter={fast} />);
    await startDemo(user);
    for (let i = 0; i < 4; i += 1) await user.click(screen.getByRole('button', { name: 'I don’t know yet' }));
    await screen.findByText('Set 2 of about 2');
    first.unmount();

    render(<DemoPage topics={LEARNING_SCIENCE_ONLY} createAdapter={fast} />);
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
      await screen.findByRole('heading', { level: 1, name: 'Find your starting point' });
      await startDemo(user);
      await user.click(screen.getByRole('button', { name: 'I don’t know yet' }));
      expect(await screen.findByText(/Question 2 of 4/)).toBeInTheDocument();
      expect(requests).toEqual([]);
    } finally {
      server.events.removeListener('request:start', onRequest);
    }
  });

  describe('with several reviewed topics (UD2)', () => {
    const topics: BankEntry[] = [
      { id: 'learning-science', name: 'Learning science for exam prep', shortName: 'learning science', summary: 'Studying for exams.', reviewed: true },
      { id: 'python', name: 'Python', summary: 'The Python language itself.', reviewed: true },
    ];

    async function setupPython(user: UserEvent) {
      expect(screen.getByRole('heading', { level: 1, name: 'Find your starting point' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Step 1 of 5: Your topic' })).toBeInTheDocument();
      await user.click(screen.getByRole('radio', { name: /^Python/ }));
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      expect(screen.getByRole('group', { name: 'What do you want from Python?' })).toBeInTheDocument();
      for (const choice of ['Pass an exam', '3–5 h', 'A mix']) {
        await user.click(screen.getByRole('radio', { name: choice }));
        await user.click(screen.getByRole('button', { name: 'Continue' }));
      }
      expect(screen.getByRole('group', { name: 'How long have you worked with Python?' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Have you taught or mentored others in Python?' })).toBeInTheDocument();
      await user.click(screen.getByRole('radio', { name: 'Under a year' }));
      await user.click(screen.getByRole('radio', { name: 'No' }));
      await user.click(screen.getByRole('button', { name: 'Start the diagnostic' }));
      expect(await screen.findByRole('heading', { level: 1, name: 'Python' })).toBeInTheDocument();
    }

    it('the topic comes first; a catalog topic runs its own bank and its result has no sources or next steps', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <MemoryRouter>
          <DemoPage topics={topics} createAdapter={fast} />
        </MemoryRouter>,
      );
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      expect(screen.getByRole('group', { name: 'Which topic do you want to test yourself on?' })).toHaveAccessibleDescription(
        /Choose the option closest to you/,
      );
      await setupPython(user);
      await dontKnowAll(user);
      expect(screen.getByText('Questions from Eduujoy’s reviewed item bank.')).toBeInTheDocument();
      expect(screen.queryByText(/^Source:/)).not.toBeInTheDocument();
      expect(screen.getAllByText('Why this answer:').length).toBeGreaterThan(0);
      expect(screen.getByRole('link', { name: 'Build your real path on Eduujoy' })).toHaveAttribute('href', '/signup');
      expect(screen.queryByText(/first three steps/)).not.toBeInTheDocument();
      await expectNoAxeViolations(container);
    });

    it('a reload resumes on the attempt’s own topic', async () => {
      const user = userEvent.setup();
      const first = render(
        <MemoryRouter>
          <DemoPage topics={topics} createAdapter={fast} />
        </MemoryRouter>,
      );
      await setupPython(user);
      first.unmount();
      render(
        <MemoryRouter>
          <DemoPage topics={topics} createAdapter={fast} />
        </MemoryRouter>,
      );
      expect(await screen.findByRole('heading', { level: 1, name: 'Python' })).toBeInTheDocument();
    });
  });
});
