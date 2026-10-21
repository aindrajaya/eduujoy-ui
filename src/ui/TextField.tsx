import { CircleAlert, type LucideIcon } from 'lucide-react';
import { useId, type ComponentPropsWithRef } from 'react';

export interface TextFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'id'> {
  label: string;
  icon?: LucideIcon;
  error?: string | undefined;
  hint?: string;
}

/** Labelled input with icon, hint and error wired through aria-describedby. 16px text (no iOS zoom). */
export default function TextField({ label, icon: Icon, error, hint, className, ...input }: TextFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-text">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`min-h-11 w-full rounded-xl border-2 bg-surface py-3 pr-4 text-base text-text placeholder-text-muted transition-colors focus:ring-2 focus:outline-none ${
            Icon ? 'pl-12' : 'pl-4'
          } ${
            error
              ? 'border-danger focus:border-danger focus:ring-danger/30'
              : 'border-border hover:border-text-muted focus:border-primary focus:ring-focus/40'
          }`}
          {...input}
        />
        {Icon && (
          <Icon
            className={`absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 ${error ? 'text-danger' : 'text-text-muted'}`}
            aria-hidden="true"
          />
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-2 text-sm text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-2 flex items-center gap-2 text-sm text-danger">
          <CircleAlert className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
