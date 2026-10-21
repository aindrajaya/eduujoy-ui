import { CircleAlert, Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface StateMessageProps {
  title: string;
  children?: ReactNode;
  icon?: LucideIcon;
  tone?: 'neutral' | 'danger';
  action?: ReactNode;
}

/** Shared layout for empty and error states. */
export default function StateMessage({ title, children, icon, tone = 'neutral', action }: StateMessageProps) {
  const Icon = icon ?? (tone === 'danger' ? CircleAlert : Inbox);
  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border p-8 text-center"
    >
      <Icon className={`h-8 w-8 ${tone === 'danger' ? 'text-danger' : 'text-text-muted'}`} aria-hidden="true" />
      <p className="font-semibold text-text">{title}</p>
      {children && <div className="text-text-muted">{children}</div>}
      {action}
    </div>
  );
}
