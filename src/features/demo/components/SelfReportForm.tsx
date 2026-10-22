import { useId, useState, type SyntheticEvent } from 'react';
import type { DemoSelfReport, YearsStudying } from '../placement';

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

const REQUIRED = 'Choose the option closest to you.';

interface ChoiceGroupProps<T extends string> {
  name: string;
  legend: string;
  options: { value: T; label: string }[];
  value: T | null;
  error: boolean;
  onChange: (value: T) => void;
}

/** A native radio group: arrow keys move the choice, and the error is tied to the group. */
function ChoiceGroup<T extends string>({ name, legend, options, value, error, onChange }: ChoiceGroupProps<T>) {
  const errorId = useId();
  return (
    <fieldset aria-describedby={error ? errorId : undefined} aria-invalid={error || undefined} className="space-y-3">
      <legend className="sk-title mb-3">{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className="quiz-option flex min-h-11 cursor-pointer items-center gap-3 p-3">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => {
              onChange(option.value);
            }}
            className="h-4 w-4 accent-[var(--sk-primary)]"
          />
          <span>{option.label}</span>
        </label>
      ))}
      {error && (
        <p id={errorId} className="font-semibold text-sk-danger">
          <span aria-hidden="true">⚠ </span>
          {REQUIRED}
        </p>
      )}
    </fieldset>
  );
}

export interface SelfReportFormProps {
  starting: boolean;
  onStart: (selfReport: DemoSelfReport) => void;
}

/** Self-report before the first batch (PRD-UI §7b, adaptive flow step 1). Not scored. */
export default function SelfReportForm({ starting, onStart }: SelfReportFormProps) {
  const [years, setYears] = useState<YearsStudying | null>(null);
  const [planned, setPlanned] = useState<'yes' | 'no' | null>(null);
  const [tried, setTried] = useState(false);

  const submit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTried(true);
    if (!years || !planned) return;
    onStart({ years, plannedOthers: planned === 'yes' });
  };

  return (
    <form noValidate onSubmit={submit} className="sk-card space-y-6" aria-label="About you">
      <p className="text-sk-text-muted">Two quick questions first. They are not scored.</p>
      <ChoiceGroup
        name="years"
        legend="How long have you studied with techniques like self-testing and spaced sessions?"
        options={YEARS}
        value={years}
        error={tried && !years}
        onChange={setYears}
      />
      <ChoiceGroup
        name="planned"
        legend="Have you ever planned someone else’s study?"
        options={PLANNED}
        value={planned}
        error={tried && !planned}
        onChange={setPlanned}
      />
      <button type="submit" className="sk-btn sk-btn-primary w-full" disabled={starting}>
        {starting ? 'Starting…' : 'Start the diagnostic'}
      </button>
    </form>
  );
}
