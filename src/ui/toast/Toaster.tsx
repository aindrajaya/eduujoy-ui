import * as RadixToast from '@radix-ui/react-toast';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { dismissToast, type Toast, type ToastTone } from './store';

const toneStyle: Record<ToastTone, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: 'text-primary' },
  success: { icon: CircleCheck, className: 'text-success' },
  error: { icon: CircleAlert, className: 'text-danger' },
};

/** Renders queued toasts with Radix (announced politely, swipe or Escape to dismiss). */
export default function Toaster({ toasts }: { toasts: readonly Toast[] }) {
  return (
    <RadixToast.Provider swipeDirection="down" label="Notifications">
      {toasts.map(({ id, title, description, tone = 'info', action, durationMs = 5000 }) => {
        const { icon: Icon, className } = toneStyle[tone];
        return (
          <RadixToast.Root
            key={id}
            duration={durationMs}
            type={tone === 'error' ? 'foreground' : 'background'}
            onOpenChange={(open) => {
              if (!open) dismissToast(id);
            }}
            className="flex w-full items-start gap-3 rounded-card border-2 border-ink bg-surface p-4 text-text shadow-lg data-[swipe=move]:translate-y-[var(--radix-toast-swipe-move-y)]"
          >
            <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${className}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <RadixToast.Title className="font-semibold">{title}</RadixToast.Title>
              {description && (
                <RadixToast.Description className="mt-1 text-sm text-text-muted">{description}</RadixToast.Description>
              )}
            </div>
            {action && (
              <RadixToast.Action
                altText={action.label}
                onClick={action.onClick}
                className="min-h-11 rounded-control px-3 font-semibold text-primary"
              >
                {action.label}
              </RadixToast.Action>
            )}
            <RadixToast.Close aria-label="Dismiss" className="-m-2 flex h-11 w-11 items-center justify-center text-text-muted">
              <X className="h-5 w-5" aria-hidden="true" />
            </RadixToast.Close>
          </RadixToast.Root>
        );
      })}
      <RadixToast.Viewport className="fixed right-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 z-50 mx-auto flex max-w-md flex-col gap-2 px-4 outline-none lg:top-4 lg:right-4 lg:bottom-auto lg:left-auto lg:mx-0 lg:w-96 lg:px-0" />
    </RadixToast.Provider>
  );
}
