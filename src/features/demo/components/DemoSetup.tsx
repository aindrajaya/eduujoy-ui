import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { readJson, writeJson } from '@/lib/storage';
import type { DemoSelfReport, YearsStudying } from '../placement';
import { DEMO_SETUP_KEY, FORMATS, GOALS, HOURS, type DemoFormat, type DemoGoal, type DemoHours, type DemoPrefs } from '../prefs';
import ChoiceGroup from './ChoiceGroup';

const YEARS: { value: YearsStudying; label: string }[] = [
  { value: 'none', label: 'Not yet' },
  { value: 'under1', label: 'Under a year' },
  { value: '1to3', label: '1–3 years' },
  { value: '3plus', label: '3 years or more' },
];

const PLANNED: { value: 'yes' | 'no'; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

/** The answers so far and the step on screen; saved like a quiz draft so a reload keeps them. */
export interface SetupDraft {
  step: number;
  goal?: DemoGoal;
  hours?: DemoHours;
  format?: DemoFormat;
  years?: YearsStudying;
  planned?: 'yes' | 'no';
}

const STEPS = ['Your goal', 'Weekly time', 'Format', 'About you'] as const;

const isDraft = (value: unknown): value is SetupDraft =>
  typeof value === 'object' &&
  value !== null &&
  Number.isInteger((value as SetupDraft).step) &&
  (value as SetupDraft).step >= 0 &&
  (value as SetupDraft).step < STEPS.length;

export interface DemoSetupProps {
  starting: boolean;
  onStart: (selfReport: DemoSelfReport, prefs: DemoPrefs) => void;
}

/**
 * Before the quiz (UD v1): goal, weekly time and format, one screen each, then the self-report.
 * Native radio cards only, no free text; each step needs a choice. Back keeps the answers.
 */
export default function DemoSetup({ starting, onStart }: DemoSetupProps) {
  const [draft, setDraft] = useState<SetupDraft>(() => readJson(DEMO_SETUP_KEY, isDraft) ?? { step: 0 });
  const [tried, setTried] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    writeJson(DEMO_SETUP_KEY, draft);
  }, [draft]);

  // Keyboard and screen-reader users land on the new step's title, not back at the top.
  useEffect(() => {
    if (moved.current) heading.current?.focus();
  }, [draft.step]);

  const set = (patch: Partial<SetupDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  };
  const go = (step: number) => {
    moved.current = true;
    setTried(false);
    set({ step });
  };

  const complete = [Boolean(draft.goal), Boolean(draft.hours), Boolean(draft.format), Boolean(draft.years && draft.planned)];

  const submit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTried(true);
    if (!complete[draft.step]) return;
    if (draft.step < STEPS.length - 1) {
      go(draft.step + 1);
      return;
    }
    const { goal, hours, format, years, planned } = draft;
    if (goal && hours && format && years && planned) {
      onStart({ years, plannedOthers: planned === 'yes' }, { goal, hours, format });
    }
  };

  const last = draft.step === STEPS.length - 1;

  return (
    <form noValidate onSubmit={submit} className="sk-card space-y-6" aria-labelledby="demo-step">
      <h2 id="demo-step" ref={heading} tabIndex={-1} className="sk-title">
        Step {draft.step + 1} of {STEPS.length}: {STEPS[draft.step]}
      </h2>
      {draft.step === 0 && (
        <ChoiceGroup
          name="goal"
          legend="What do you want from learning science?"
          options={GOALS}
          value={draft.goal ?? null}
          error={tried && !draft.goal}
          onChange={(goal) => {
            set({ goal });
          }}
        />
      )}
      {draft.step === 1 && (
        <ChoiceGroup
          name="hours"
          legend="How much time can you give it each week?"
          options={HOURS}
          value={draft.hours ?? null}
          error={tried && !draft.hours}
          onChange={(hours) => {
            set({ hours });
          }}
        />
      )}
      {draft.step === 2 && (
        <ChoiceGroup
          name="format"
          legend="How do you like to learn?"
          options={FORMATS}
          value={draft.format ?? null}
          error={tried && !draft.format}
          onChange={(format) => {
            set({ format });
          }}
        />
      )}
      {last && (
        <>
          <p className="text-sk-text-muted">Two quick questions. They are not scored.</p>
          <ChoiceGroup
            name="years"
            legend="How long have you studied with techniques like self-testing and spaced sessions?"
            options={YEARS}
            value={draft.years ?? null}
            error={tried && !draft.years}
            onChange={(years) => {
              set({ years });
            }}
          />
          <ChoiceGroup
            name="planned"
            legend="Have you ever planned someone else’s study?"
            options={PLANNED}
            value={draft.planned ?? null}
            error={tried && !draft.planned}
            onChange={(planned) => {
              set({ planned });
            }}
          />
        </>
      )}
      <div className="flex gap-3">
        {draft.step > 0 && (
          <button
            type="button"
            className="sk-btn"
            onClick={() => {
              go(draft.step - 1);
            }}
          >
            Back
          </button>
        )}
        <button type="submit" className="sk-btn sk-btn-primary flex-1" disabled={starting}>
          {last ? (starting ? 'Starting…' : 'Start the diagnostic') : 'Continue'}
        </button>
      </div>
    </form>
  );
}
