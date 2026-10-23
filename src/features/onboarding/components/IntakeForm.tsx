import { ArrowRight, CircleAlert, Clock, Sparkles, Target } from 'lucide-react';
import { useEffect, useId } from 'react';
import { useForm, useWatch, type FieldPath } from 'react-hook-form';
import type { ApiError } from '@/api/errors';
import { lazyResolver } from '@/lib/forms';
import TextField from '@/ui/TextField';
import { EXPERIENCE } from '../experience';
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
  selfReport: 'experience',
  'selfReport.years': 'experience',
  'selfReport.projectsShipped': 'experience',
};

const FORMATS = [
  { value: 'video', label: 'Videos' },
  { value: 'text', label: 'Articles and docs' },
  { value: 'papers', label: 'Research papers' },
] as const;

export interface IntakeFormProps {
  defaultValues?: Partial<IntakeValues>;
  onSubmit: (values: IntakeValues) => void;
  submitting?: boolean;
  /** Last API failure; field errors are shown on their fields, the rest as a form message. */
  error?: ApiError | null;
  errorMessage?: string;
}

/** US-01 intake: topic, goal, weekly hours, preferred formats and experience (FR-01, FR-04). */
export default function IntakeForm({ defaultValues, onSubmit, submitting = false, error, errorMessage }: IntakeFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<IntakeValues>({
    resolver,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { topic: '', goal: '', weeklyHours: 3, formats: ['video', 'text'], ...defaultValues },
  });

  // The legend names the topic as typed (one watched field, not the whole form; PRD-UI §7).
  const topicName = useWatch({ control, name: 'topic' });
  const experienceHelpId = useId();
  const experienceErrorId = useId();

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
      className="flex min-h-dvh items-center justify-center bg-bg p-4"
    >
      <div className="w-full max-w-2xl">
        <header className="mb-8 animate-fade-in text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-surface shadow-lg">
            <Sparkles className="h-8 w-8 text-primary" aria-hidden="true" />
          </div>
          <h1
            id="intake-title"
            className="mb-4 text-4xl text-text"
          >
            Let’s get started
          </h1>
          <p className="mx-auto max-w-md text-lg leading-relaxed text-text-muted">
            Tell us what you want to learn and we&apos;ll build a path that fits your week.
          </p>
        </header>

        <div className="sk-card animate-slide-up overflow-hidden p-0">
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
              <legend className="mb-2 sk-label text-text">Preferred formats (optional)</legend>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map(({ value, label }) => (
                  <label
                    key={value}
                    className="sk-chip-option min-h-11 cursor-pointer gap-2 px-4"
                  >
                    <input type="checkbox" value={value} className="h-4 w-4 accent-primary" {...register('formats')} />
                    <span className="text-base text-text">{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset
              aria-describedby={`${experienceHelpId}${errors.experience ? ` ${experienceErrorId}` : ''}`}
              aria-invalid={errors.experience ? true : undefined}
              className="space-y-2"
            >
              <legend className="mb-1 sk-label text-text">
                How much have you worked with {topicName.trim() || 'this topic'}?
              </legend>
              <p id={experienceHelpId} className="text-sm text-text-muted">
                This only sets where the questions start; your answers decide your level.
              </p>
              <div className="space-y-2">
                {EXPERIENCE.map(({ value, label }) => (
                  <label
                    key={value}
                    className="quiz-option flex min-h-11 cursor-pointer items-center gap-3 px-4 py-2"
                  >
                    <input type="radio" value={value} className="h-4 w-4 shrink-0 accent-primary" {...register('experience')} />
                    <span className="text-base text-text">{label}</span>
                  </label>
                ))}
              </div>
              {errors.experience && (
                <p id={experienceErrorId} className="flex items-center gap-2 text-sm text-danger">
                  <CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {errors.experience.message}
                </p>
              )}
            </fieldset>

            {errorMessage && (
              <p role="alert" className="flex items-start gap-2 rounded-lg border-2 border-danger bg-surface p-3 text-sm text-danger">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="sk-btn sk-btn-primary min-h-12 w-full"
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
