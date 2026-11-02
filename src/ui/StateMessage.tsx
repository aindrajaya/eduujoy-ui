import { CircleAlert, Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import RoughLayer from './sketch/RoughLayer';
import { roughSeed, useRough } from './sketch/useRough';

interface StateMessageProps {
  title: string;
  children?: ReactNode;
  icon?: LucideIcon;
  tone?: 'neutral' | 'danger';
  action?: ReactNode;
}

/**
 * Shared layout for empty and error states. The icon sits in a hand-drawn rough.js ring (U12b),
 * seeded by the title so each state draws the same every time; the ring's box is reserved from the
 * start, so drawing it after the first paint moves nothing.
 */
export default function StateMessage({ title, children, icon, tone = 'neutral', action }: StateMessageProps) {
  const Icon = icon ?? (tone === 'danger' ? CircleAlert : Inbox);
  const { ref } = useRough('ring', roughSeed(title));
  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      className="flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-ink bg-surface p-8 text-center"
    >
      <span
        className={`relative inline-flex h-16 w-16 items-center justify-center ${tone === 'danger' ? 'text-danger' : 'text-text-muted'}`}
      >
        <RoughLayer svgRef={ref} />
        <Icon className="h-8 w-8" aria-hidden="true" />
      </span>
      <p className="sk-display-md text-text">{title}</p>
      {children && <div className="text-text-muted">{children}</div>}
      {action}
    </div>
  );
}
