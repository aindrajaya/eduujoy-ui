import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/test/axe';
import { learningScience as bank } from '../bank';
import { place, type Graded } from '../placement';
import { FORMATS, GOALS, HOURS, type DemoPrefs } from '../prefs';
import DemoResult from './DemoResult';

const graded: Graded[] = [
  { itemId: 'c1-retrieval', bloom: 'C1', correct: true, skipped: false },
  { itemId: 'c2-familiarity', bloom: 'C2', correct: true, skipped: false },
  { itemId: 'c2-why-spacing', bloom: 'C2', correct: true, skipped: false },
  { itemId: 'c3-flashcards', bloom: 'C3', correct: false, skipped: true },
];
const placement = place(graded, { years: 'none', plannedOthers: false });

const combinations: DemoPrefs[] = GOALS.flatMap((g) =>
  HOURS.flatMap((h) => FORMATS.map((f) => ({ goal: g.value, hours: h.value, format: f.value }))),
);

const MINUTES = { '1to2': 20, '3to5': 45, '6plus': 60 } as const;
const RESOURCES = { video: ['Video'], reading: ['Article'], practice: ['Practice set'], mix: ['Video', 'Article', 'Practice set'] };

describe('the result adapts to the preference steps (UD v1)', () => {
  it('covers all 48 combinations', () => {
    expect(combinations).toHaveLength(48);
  });

  it.each(combinations)('%j renders a result with fitting times, resources and goal copy', (prefs) => {
    const { unmount } = render(<DemoResult bank={bank} placement={placement} graded={graded} prefs={prefs} onRetake={() => undefined} />);
    expect(screen.getByText(new RegExp(`each step takes about ${String(MINUTES[prefs.hours])} minutes`))).toBeInTheDocument();
    const labels = screen.getAllByText(new RegExp(`· about ${String(MINUTES[prefs.hours])} min$`)).map((el) => el.textContent);
    expect(labels).toHaveLength(3);
    expect(labels.map((l) => l.split(' · ')[0])).toEqual(
      [0, 1, 2].map((n) => RESOURCES[prefs.format][n % RESOURCES[prefs.format].length]),
    );
    const goalCopy = { exam: /exam day/, work: /at work/, teach: /teaching/, curious: /own pace/ }[prefs.goal];
    expect(screen.getByText(goalCopy)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retake' })).toBeInTheDocument();
    unmount();
  });

  it('a C6 week plan that is not correct gets the spacing feedback, never "wrong"', () => {
    const week: Graded[] = [...graded, { itemId: 'c6-week-plan', bloom: 'C6', correct: false, skipped: false }];
    const { container } = render(
      <DemoResult bank={bank} placement={place(week, { years: 'none', plannedOthers: false })} graded={week} prefs={combinations[0]!} onRetake={() => undefined} />,
    );
    expect(screen.getByText("This plan doesn't build in spacing yet:")).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/wrong/i);
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <DemoResult bank={bank} placement={placement} graded={graded} prefs={combinations[0]!} onRetake={() => undefined} />,
    );
    await expectNoAxeViolations(container);
  });
});
