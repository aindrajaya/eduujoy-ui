import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * An error announced in place: danger ink with the alert icon, never colour alone (README). It is
 * Notice's danger tone without Notice's other icons, because sign-in and sign-up use it and their
 * JS budget is tight (CircleAlert is already on /signin through TextField).
 */
export default function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border-2 border-danger bg-surface p-3 text-sm text-danger">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
