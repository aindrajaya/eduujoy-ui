import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CircleAlert,
  Clock,
  Mail,
  Play,
  Sparkles,
  Target,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type SubmitEvent } from 'react';
import { validateField, type FieldName, type OnboardingValues } from '../validation';

export type { OnboardingValues };

type Errors = Partial<Record<FieldName, string>>;

interface TextField {
  name: FieldName;
  label: string;
  type: 'email' | 'text';
  icon: LucideIcon;
  placeholder: string;
  autoComplete: string;
}

interface SelectField {
  name: FieldName;
  label: string;
  icon: LucideIcon;
  options: { value: string; label: string }[];
}

const textFields: TextField[] = [
  {
    name: 'email',
    label: 'Email Address',
    type: 'email',
    icon: Mail,
    placeholder: 'your.email@example.com',
    autoComplete: 'email',
  },
  {
    name: 'learningGoals',
    label: 'Learning Goals',
    type: 'text',
    icon: Target,
    placeholder: 'e.g., Upgrade career growth in Product Design',
    autoComplete: 'off',
  },
];

const selectFields: SelectField[] = [
  {
    name: 'skillCategory',
    label: 'Skill Category',
    icon: Briefcase,
    options: [
      { value: 'designer', label: 'Designer' },
      { value: 'programmer', label: 'Programmer' },
      { value: 'agriculture', label: 'Agriculture' },
      { value: 'business', label: 'Business' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'education', label: 'Education' },
      { value: 'marketing', label: 'Marketing' },
      { value: 'engineering', label: 'Engineering' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    name: 'currentState',
    label: 'Current Skill Level',
    icon: TrendingUp,
    options: [
      { value: 'beginner', label: 'Beginner - Just starting out' },
      { value: 'intermediate', label: 'Intermediate - Some experience' },
      { value: 'advanced', label: 'Advanced - Experienced professional' },
    ],
  },
  {
    name: 'learningStyle',
    label: 'Learning Pace',
    icon: Clock,
    options: [
      { value: 'slow', label: 'Slow & Steady - Take your time' },
      { value: 'moderate', label: 'Moderate Pace - Balanced approach' },
      { value: 'fast', label: 'Fast Paced - Quick learning bursts' },
    ],
  },
  {
    name: 'preferredContent',
    label: 'Preferred Content Type',
    icon: BookOpen,
    options: [
      { value: 'audioVisual', label: 'Audio Visual - Videos & podcasts' },
      { value: 'reading', label: 'Reading - Articles & books' },
      { value: 'interactive', label: 'Interactive - Hands-on projects' },
    ],
  },
];

const fieldOrder: FieldName[] = [...textFields, ...selectFields].map((f) => f.name);

const emptyValues: OnboardingValues = {
  email: '',
  learningGoals: '',
  skillCategory: '',
  currentState: '',
  learningStyle: '',
  preferredContent: '',
};

const SPLASH_MS = 3000;
const SPLASH_EXIT_MS = 600;

export interface OnboardingFormProps {
  defaultValues?: Partial<OnboardingValues>;
  onSubmit: (values: OnboardingValues) => void;
  submitting?: boolean;
  submitError?: string;
  /** Skip the welcome splash (e.g. when returning to the form). */
  skipSplash?: boolean;
}

function inputClass(hasError: boolean): string {
  return `w-full rounded-xl border-2 py-3 pl-12 text-base text-gray-900 placeholder-gray-500 transition-all duration-200 focus:ring-2 focus:outline-none ${
    hasError
      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
      : 'border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-indigo-200'
  }`;
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="mt-2 flex animate-fade-in items-center gap-2 text-sm text-red-700">
      <CircleAlert className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

function Splash({ exiting, onStart }: { exiting: boolean; onStart: () => void }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-4">
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 h-64 w-64 animate-pulse rounded-full bg-white/10 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 animate-pulse rounded-full bg-purple-300/20 blur-3xl [animation-delay:1s]" />
      </div>
      <main
        className={`z-10 text-center transition-all duration-700 ${exiting ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <div className="mb-8 inline-flex h-24 w-24 animate-bounce items-center justify-center rounded-full bg-white/20 shadow-2xl backdrop-blur-sm">
          <Sparkles className="h-12 w-12 text-white" aria-hidden="true" />
        </div>
        <h1 className="mb-6 text-5xl font-bold tracking-tight text-white">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
            Eduujoy
          </span>
        </h1>
        <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed font-light text-white">
          Your personalized learning journey starts here. Let&apos;s create something amazing
          together.
        </p>
        <button
          type="button"
          onClick={onStart}
          className="group inline-flex min-h-11 items-center gap-3 rounded-full bg-white px-8 py-4 font-bold text-indigo-700 shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <span className="text-lg">Get Started</span>
          <Play
            className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </button>
        <p className="mt-6 animate-pulse text-sm text-white">Auto-continuing in a few seconds...</p>
      </main>
    </div>
  );
}

export default function OnboardingForm({
  defaultValues,
  onSubmit,
  submitting = false,
  submitError,
  skipSplash = false,
}: OnboardingFormProps) {
  const [splash, setSplash] = useState<'shown' | 'exiting' | 'done'>(skipSplash ? 'done' : 'shown');
  const [values, setValues] = useState<OnboardingValues>({ ...emptyValues, ...defaultValues });
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (splash === 'done') return;
    const next = splash === 'shown' ? 'exiting' : 'done';
    const t = setTimeout(
      () => {
        setSplash(next);
      },
      splash === 'shown' ? SPLASH_MS : SPLASH_EXIT_MS,
    );
    return () => {
      clearTimeout(t);
    };
  }, [splash]);

  if (splash !== 'done') {
    return (
      <Splash
        exiting={splash === 'exiting'}
        onStart={() => {
          setSplash('exiting');
        }}
      />
    );
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const name = e.target.name as FieldName;
    const { value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: Errors = {};
    for (const name of fieldOrder) {
      const error = validateField(name, values[name]);
      if (error) next[name] = error;
    }
    setErrors(next);
    const firstError = fieldOrder.find((name) => next[name]);
    if (firstError) {
      document.getElementById(firstError)?.focus();
      return;
    }
    onSubmit(values);
  };

  return (
    <main
      aria-labelledby="onboarding-title"
      className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4"
    >
      <div className="w-full max-w-2xl">
        <header className="mb-8 animate-fade-in text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg">
            <Sparkles className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
          <h1
            id="onboarding-title"
            className="mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-4xl font-bold text-transparent"
          >
            Let&apos;s Get Started!
          </h1>
          <p className="mx-auto max-w-md text-lg leading-relaxed text-gray-600">
            Tell us about yourself and we&apos;ll craft the perfect path to achieve your goals.
          </p>
        </header>

        <div className="animate-slide-up overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
          <form onSubmit={handleSubmit} noValidate className="p-6 md:p-10">
            <div className="space-y-6">
              {textFields.map((field) => {
                const Icon = field.icon;
                const error = errors[field.name];
                return (
                  <div key={field.name} className="relative">
                    <label
                      htmlFor={field.name}
                      className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700"
                    >
                      <Icon className="h-4 w-4 text-indigo-500" aria-hidden="true" />
                      {field.label}
                      <span className="text-red-600" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        id={field.name}
                        name={field.name}
                        type={field.type}
                        value={values[field.name]}
                        onChange={handleChange}
                        placeholder={field.placeholder}
                        autoComplete={field.autoComplete}
                        required
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? `${field.name}-error` : undefined}
                        className={`${inputClass(Boolean(error))} pr-4`}
                      />
                      <Icon
                        className={`absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 ${error ? 'text-red-400' : 'text-gray-400'}`}
                        aria-hidden="true"
                      />
                    </div>
                    {error && <FieldError id={`${field.name}-error`} message={error} />}
                  </div>
                );
              })}

              {selectFields.map((field) => {
                const Icon = field.icon;
                const error = errors[field.name];
                return (
                  <div key={field.name} className="relative">
                    <label
                      htmlFor={field.name}
                      className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700"
                    >
                      <Icon className="h-4 w-4 text-indigo-500" aria-hidden="true" />
                      {field.label}
                      <span className="text-red-600" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <div className="relative">
                      <select
                        id={field.name}
                        name={field.name}
                        value={values[field.name]}
                        onChange={handleChange}
                        required
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? `${field.name}-error` : undefined}
                        className={`${inputClass(Boolean(error))} appearance-none bg-white pr-10`}
                      >
                        <option value="">Select an option...</option>
                        {field.options.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <Icon
                        className={`absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 ${error ? 'text-red-400' : 'text-gray-400'}`}
                        aria-hidden="true"
                      />
                    </div>
                    {error && <FieldError id={`${field.name}-error`} message={error} />}
                  </div>
                );
              })}
            </div>

            {submitError && (
              <p role="alert" className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-8 flex min-h-11 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4 text-base font-bold text-white shadow-lg transition-all duration-300 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-75"
            >
              {submitting ? (
                <>
                  <span
                    className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
                    aria-hidden="true"
                  />
                  <span>Creating Your Learning Plan...</span>
                </>
              ) : (
                <>
                  <span>Generate My Learning Plan</span>
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </div>

        <footer className="mt-6 text-center text-sm text-gray-600">
          <p>Your data is secure and will only be used to create your learning experience.</p>
        </footer>
      </div>
    </main>
  );
}
