import { useId } from 'react';

const REQUIRED = 'Choose the option closest to you.';

export interface ChoiceGroupProps<T extends string> {
  name: string;
  legend: string;
  options: { value: T; label: string }[];
  value: T | null;
  error: boolean;
  onChange: (value: T) => void;
}

/** A native radio group: arrow keys move the choice, and the error is tied to the group. */
export default function ChoiceGroup<T extends string>({ name, legend, options, value, error, onChange }: ChoiceGroupProps<T>) {
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

