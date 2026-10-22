// The demo's preference steps (UD v1): goal, weekly time and format, asked before the quiz. They do
// not change the placement; the result screen adapts to them, statically: step time estimates fit
// the hours, the resource mix follows the format, and the copy reflects the goal.

/** The preference and self-report steps in progress (lib/storage), cleared on a retake. */
export const DEMO_SETUP_KEY = 'demo:setup';

export type DemoGoal = 'exam' | 'work' | 'teach' | 'curious';
export type DemoHours = '1to2' | '3to5' | '6plus';
export type DemoFormat = 'video' | 'reading' | 'practice' | 'mix';

export interface DemoPrefs {
  goal: DemoGoal;
  hours: DemoHours;
  format: DemoFormat;
}

export const GOALS: { value: DemoGoal; label: string }[] = [
  { value: 'exam', label: 'Pass an exam' },
  { value: 'work', label: 'Use it at work' },
  { value: 'teach', label: 'Teach others' },
  { value: 'curious', label: 'Just curious' },
];

export const HOURS: { value: DemoHours; label: string }[] = [
  { value: '1to2', label: '1–2 h' },
  { value: '3to5', label: '3–5 h' },
  { value: '6plus', label: '6+ h' },
];

export const FORMATS: { value: DemoFormat; label: string }[] = [
  { value: 'video', label: 'Videos' },
  { value: 'reading', label: 'Reading' },
  { value: 'practice', label: 'Hands-on practice' },
  { value: 'mix', label: 'A mix' },
];

const GOAL_LINE: Record<DemoGoal, string> = {
  exam: 'Aimed at exam day: each step ends with a self-test you can reuse in revision.',
  work: 'Aimed at work: each step applies the idea to something you are learning on the job.',
  teach: 'Aimed at teaching: each step includes a short explanation you could give someone else.',
  curious: 'No deadline: take the steps in any order, at your own pace.',
};

/** Minutes per sample SOP step, so the three steps fit the first week at the chosen hours. */
const STEP_MINUTES: Record<DemoHours, number> = { '1to2': 20, '3to5': 45, '6plus': 60 };

const HOURS_TEXT: Record<DemoHours, string> = { '1to2': '1–2 hours', '3to5': '3–5 hours', '6plus': '6 or more hours' };

const RESOURCE: Record<Exclude<DemoFormat, 'mix'>, string> = {
  video: 'Video',
  reading: 'Article',
  practice: 'Practice set',
};
const MIX = [RESOURCE.video, RESOURCE.reading, RESOURCE.practice];

export const goalLine = (prefs: DemoPrefs) => GOAL_LINE[prefs.goal];

export const stepMinutes = (prefs: DemoPrefs) => STEP_MINUTES[prefs.hours];

/** The resource the n-th sample step leads with; "A mix" rotates video, article and practice. */
export const resourceFor = (prefs: DemoPrefs, n: number) =>
  prefs.format === 'mix' ? (MIX[n % MIX.length] ?? RESOURCE.video) : RESOURCE[prefs.format];

export function timeFitLine(prefs: DemoPrefs, steps: number): string {
  const total = stepMinutes(prefs) * steps;
  return `At ${HOURS_TEXT[prefs.hours]} a week, each step takes about ${String(stepMinutes(prefs))} minutes, so all ${String(steps)} fit in your first week (${String(total)} minutes).`;
}

export const isPrefs = (value: unknown): value is DemoPrefs => {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    GOALS.some((g) => g.value === p.goal) && HOURS.some((h) => h.value === p.hours) && FORMATS.some((f) => f.value === p.format)
  );
};
