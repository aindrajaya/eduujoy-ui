import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { readJson, writeJson } from '@/lib/storage';
import type { BankEntry } from '../banks';
import type { DemoSelfReport, YearsStudying } from '../placement';
import { DEMO_SETUP_KEY, FORMATS, GOALS, HOURS, type DemoFormat, type DemoGoal, type DemoHours, type DemoPrefs } from '../prefs';
import ChoiceGroup from './ChoiceGroup';

const YEARS: { value: YearsStudying; label: string }[] = [
  { value: 'none', label: 'Not yet' },
  { value: 'under1', label: 'Under a year' },
  { value: '1to3', label: '1–3 years' },
  { value: '3plus', label: '3 years or more' },
];

const YES_NO: { value: 'yes' | 'no'; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

/** The answers so far and the step on screen; saved like a quiz draft so a reload keeps them. */
export interface SetupDraft {
  step: number;
  topic?: string;
  goal?: DemoGoal;
  hours?: DemoHours;
  format?: DemoFormat;
  years?: YearsStudying;
  planned?: 'yes' | 'no';
}

type StepKey = 'topic' | 'goal' | 'hours' | 'format' | 'about';
const TITLES: Record<StepKey, string> = {
  topic: 'Your topic',
  goal: 'Your goal',
  hours: 'Weekly time',
  format: 'Format',
  about: 'About you',
};

const isDraft = (value: unknown): value is SetupDraft =>
  typeof value === 'object' && value !== null && Number.isInteger((value as SetupDraft).step) && (value as SetupDraft).step >= 0;

/**
 * The self-report, worded per topic. Learning science asks about studying techniques and planning
 * others' study; a catalog topic about working with it and teaching it (lead, UD2). Both answers
 * play the same roles in place().
 */
function selfReportQuestions(topic: BankEntry) {
  return topic.id === 'learning-science'
    ? {
        years: 'How long have you studied with techniques like self-testing and spaced sessions?',
        others: 'Have you ever planned someone else’s study?',
      }
    : { years: `How long have you worked with ${topic.name}?`, others: `Have you taught or mentored others in ${topic.name}?` };
}

export interface DemoSetupProps {
  /** The reviewed topics; with only one, there is no topic step. */
  topics: readonly BankEntry[];
  starting: boolean;
  onStart: (topicId: string, selfReport: DemoSelfReport, prefs: DemoPrefs) => void;
}

/**
 * Before the quiz: the topic (UD2, when there is a choice), goal, weekly time and format, one
 * screen each, then the self-report. Native radio cards only, no free text; each step needs a
 * choice. Back keeps the answers.
 */
export default function DemoSetup({ topics, starting, onStart }: DemoSetupProps) {
  const steps: StepKey[] = [...(topics.length > 1 ? (['topic'] as const) : []), 'goal', 'hours', 'format', 'about'];
  const [draft, setDraft] = useState<SetupDraft>(() => {
    const saved = readJson(DEMO_SETUP_KEY, isDraft);
    return saved && saved.step < steps.length ? saved : { step: 0 };
  });
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

  const topic = topics.length > 1 ? topics.find((t) => t.id === draft.topic) : topics[0];
  const key = steps[draft.step] ?? 'goal';
  const complete: Record<StepKey, boolean> = {
    topic: Boolean(topic),
    goal: Boolean(draft.goal),
    hours: Boolean(draft.hours),
    format: Boolean(draft.format),
    about: Boolean(draft.years && draft.planned),
  };
  const last = draft.step === steps.length - 1;
  const questions = topic ? selfReportQuestions(topic) : null;

  const submit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTried(true);
    if (!complete[key]) return;
    if (!last) {
      go(draft.step + 1);
      return;
    }
    const { goal, hours, format, years, planned } = draft;
    if (topic && goal && hours && format && years && planned) {
      onStart(topic.id, { years, plannedOthers: planned === 'yes' }, { goal, hours, format });
    }
  };

  return (
    <form noValidate onSubmit={submit} className="sk-card space-y-6" aria-labelledby="demo-step">
      <h2 id="demo-step" ref={heading} tabIndex={-1} className="sk-title">
        Step {draft.step + 1} of {steps.length}: {TITLES[key]}
      </h2>
      {key === 'topic' && (
        <ChoiceGroup
          name="topic"
          legend="Which topic do you want to test yourself on?"
          options={topics.map((t) => ({ value: t.id, label: `${t.name}: ${t.summary}` }))}
          value={draft.topic ?? null}
          error={tried && !topic}
          onChange={(id) => {
            set({ topic: id });
          }}
        />
      )}
      {key === 'goal' && (
        <ChoiceGroup
          name="goal"
          legend={`What do you want from ${topic ? (topic.shortName ?? topic.name) : 'this topic'}?`}
          options={GOALS}
          value={draft.goal ?? null}
          error={tried && !draft.goal}
          onChange={(goal) => {
            set({ goal });
          }}
        />
      )}
      {key === 'hours' && (
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
      {key === 'format' && (
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
      {key === 'about' && questions && (
        <>
          <p className="text-sk-text-muted">Two quick questions. They are not scored.</p>
          <ChoiceGroup
            name="years"
            legend={questions.years}
            options={YEARS}
            value={draft.years ?? null}
            error={tried && !draft.years}
            onChange={(years) => {
              set({ years });
            }}
          />
          <ChoiceGroup
            name="planned"
            legend={questions.others}
            options={YES_NO}
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
