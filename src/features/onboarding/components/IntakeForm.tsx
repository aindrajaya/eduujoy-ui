import { ArrowRight, Clock, Sparkles, Target } from 'lucide-react';
import { useEffect } from 'react';
import { useForm, type FieldPath } from 'react-hook-form';
import type { ApiError } from '@/api/errors';
import { lazyResolver } from '@/lib/forms';
import TextField from '@/ui/TextField';
import type { IntakeValues } from '../schema';

const resolver = lazyResolver<IntakeValues>(() =>
  import('../validation.lazy').then((m) => m.intakeResolver),
);

// API field paths (TopicResolveRequest, DiagnosticStartRequest) → form fields.
const SERVER_FIELDS: Record<string, FieldPath<IntakeValues>> = {
  text: 'topic',
  topicId: 'topic',
  goal: 'goal',
  weeklyHours: 'weeklyHours',
  preferredFormats: 'formats',
  'selfReport.years': 'years',
  'selfReport.projectsShipped': 'projectsShipped',
};

const FORMATS = [
  { value: 'video', label: 'Videos' },
  { value: 'text', label: 'Articles and docs' },
  { value: 'papers', label: 'Research papers' },
] as const;

const optionalNumber = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : Number(v));

export interface IntakeFormProps {
  defaultValues?: Partial<IntakeValues>;
  onSubmit: (values: IntakeValues) => void;
  submitting?: boolean;
  /** Last API failure; field errors are shown on their fields, the rest as a form message. */
  error?: ApiError | null;
  errorMessage?: string;
}

/** US-01 intake: topic, goal, weekly hours, preferred formats, optional experience (FR-01, FR-04). */
export default function IntakeForm({ defaultValues, onSubmit, submitting = false, error, errorMessage }: IntakeFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<IntakeValues>({
    resolver,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { topic: '', goal: '', weeklyHours: 3, formats: ['video', 'text'], ...defaultValues },
  });

  useEffect(() => {
    if (!error) return;
    for (const [field, message] of Object.entries(error.fieldErrors)) {
      const target = SERVER_FIELDS[field];
      if (target) setError(target, { type: 'server', message }, { shouldFocus: true });
    }
  }, [error, setError]);

  return (
    <main
      aria-labelledby="intake-title"
      className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 dark:from-bg dark:via-bg dark:to-bg"
    >
      <div className="w-full max-w-2xl">
        <header className="mb-8 animate-fade-in text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg">
            <Sparkles className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
          <h1
            id="intake-title"
            className="mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-4xl font-bold text-transparent dark:from-indigo-300 dark:to-purple-300"
          >
            Let&apos;s Get Started!
          </h1>
          <p className="mx-auto max-w-md text-lg leading-relaxed text-text-muted">
            Tell us what you want to learn and we&apos;ll build a path that fits your week.
          </p>
        </header>

        <div className="animate-slide-up overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
          <form
            onSubmit={(e) => void handleSubmit(onSubmit)(e)}
            onFocus={resolver.preload}
            noValidate
            className="space-y-6 p-6 md:p-10"
          >
            <TextField
              label="What do you want to learn?"
              icon={Sparkles}
              placeholder="e.g. UX research, SQL, product strategy"
              autoComplete="off"
              error={errors.topic?.message}
              {...register('topic')}
            />
            <TextField
              label="What's your goal?"
              icon={Target}
              placeholder="e.g. Run usability studies at my startup"
              autoComplete="off"
              error={errors.goal?.message}
              {...register('goal')}
            />
            <TextField
              label="Hours per week"
              icon={Clock}
              type="number"
              inputMode="numeric"
              min={1}
              max={40}
              hint="Between 1 and 40. Your path's total time fits this."
              error={errors.weeklyHours?.message}
              {...register('weeklyHours', { valueAsNumber: true })}
            />

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-text">Preferred formats (optional)</legend>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map(({ value, label }) => (
                  <label
                    key={value}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-chip border-2 border-border px-4 has-checked:border-primary has-checked:bg-primary-soft"
                  >
                    <input type="checkbox" value={value} className="h-4 w-4 accent-primary" {...register('formats')} />
                    <span className="text-base text-text">{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <details className="rounded-xl border border-border p-4">
              <summary className="min-h-11 cursor-pointer content-center font-semibold text-text">
                Add your experience (optional)
              </summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Years of experience"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={50}
                  error={errors.years?.message}
                  {...register('years', { setValueAs: optionalNumber })}
                />
                <TextField
                  label="Projects shipped"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={1000}
                  error={errors.projectsShipped?.message}
                  {...register('projectsShipped', { setValueAs: optionalNumber })}
                />
              </div>
            </details>

            {errorMessage && (
              <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-11 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4 text-base font-bold text-white shadow-lg transition-all duration-300 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-75"
            >
              {submitting ? 'Checking your topic…' : 'Continue'}
              {!submitting && <ArrowRight className="h-5 w-5" aria-hidden="true" />}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
