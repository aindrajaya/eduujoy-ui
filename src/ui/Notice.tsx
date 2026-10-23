import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type NoticeTone = 'success' | 'warning' | 'danger' | 'info';

const TONE: Record<NoticeTone, { icon: LucideIcon; className: string }> = {
  success: { icon: CircleCheck, className: 'border-success text-success' },
  warning: { icon: TriangleAlert, className: 'border-warning text-warning' },
  danger: { icon: CircleAlert, className: 'border-danger text-danger' },
  info: { icon: Info, className: 'border-primary text-text' },
};

export interface NoticeProps {
  tone: NoticeTone;
  /** `alert` for errors the learner must act on; `status` for announcements; none for static notes. */
  role?: 'alert' | 'status' | 'note';
  className?: string;
  children: ReactNode;
}

/** A framed message whose status colour always comes with its icon and words (README). */
export default function Notice({ tone, role, className = '', children }: NoticeProps) {
  const { icon: Icon, className: toneClass } = TONE[tone];
  return (
    <div role={role} className={`flex items-start gap-2 rounded-lg border-2 bg-surface p-3 text-sm ${toneClass} ${className}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone === 'info' ? 'text-primary' : ''}`} aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
