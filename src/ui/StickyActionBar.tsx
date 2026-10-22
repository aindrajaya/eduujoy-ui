import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

interface BaseProps {
  /** The screen's one primary action (PRD-UI §4). */
  label: string;
  /** Tab screens sit above the mobile tab bar; full-screen pages sit on the safe-area edge. */
  aboveTabs?: boolean;
}

/** A link to another screen, or an action on this one (e.g. "Try again"). */
export type StickyActionBarProps = BaseProps & ({ to: string; onClick?: never } | { onClick: () => void; to?: never });

const ACTION_CLASS = 'sk-btn sk-btn-primary min-h-12 w-full lg:w-auto lg:justify-self-end';

/** Sticky bottom bar holding the screen's primary action in the thumb zone. */
export default function StickyActionBar({ label, aboveTabs = false, ...action }: StickyActionBarProps) {
  const content = (
    <>
      {label}
      <ArrowRight className="h-5 w-5" aria-hidden="true" />
    </>
  );
  return (
    <div
      className={`sticky z-10 border-t-2 border-ink bg-surface px-4 pt-3 lg:bottom-0 lg:flex lg:justify-end lg:px-6 lg:pb-3 ${
        aboveTabs
          ? 'bottom-[calc(4rem+env(safe-area-inset-bottom))] pb-3'
          : 'bottom-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]'
      }`}
    >
      {action.to !== undefined ? (
        <Link to={action.to} className={ACTION_CLASS}>
          {content}
        </Link>
      ) : (
        <button type="button" onClick={action.onClick} className={ACTION_CLASS}>
          {content}
        </button>
      )}
    </div>
  );
}
