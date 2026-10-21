import { BookOpen, ChartColumn, House, User, type LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

// PRD-UI §4: Today, Paths, Progress, Account.
const defaultNavItems: NavItem[] = [
  { to: '/today', label: 'Today', icon: House },
  { to: '/paths', label: 'Paths', icon: BookOpen },
  { to: '/progress', label: 'Progress', icon: ChartColumn },
  { to: '/account', label: 'Account', icon: User },
];

export interface BottomNavProps {
  items?: NavItem[];
}

/** Main navigation: fixed bottom tab bar on mobile, sticky left rail from 1024 px. */
export default function BottomNav({ items = defaultNavItems }: BottomNavProps) {
  return (
    <nav
      aria-label="Main"
      className="fixed right-0 bottom-0 left-0 z-20 mx-auto max-w-md border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-lg lg:sticky lg:top-0 lg:mx-0 lg:h-dvh lg:w-60 lg:max-w-none lg:shrink-0 lg:border-t-0 lg:border-r lg:pb-0 lg:shadow-none"
    >
      <p className="hidden px-6 pt-8 pb-6 text-2xl font-bold tracking-tight text-primary lg:block">
        Eduujoy
      </p>
      <ul className="flex h-16 items-center justify-around lg:h-auto lg:flex-col lg:items-stretch lg:gap-1 lg:px-3">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="h-full w-full">
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex h-full min-h-11 w-full flex-col items-center justify-center transition-colors lg:flex-row lg:justify-start lg:gap-3 lg:rounded-control lg:px-3 lg:py-2 ${
                  isActive
                    ? 'text-success lg:bg-success-soft'
                    : 'text-text-muted hover:text-text lg:hover:bg-surface-muted'
                }`
              }
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
              <span className="mt-1 text-xs font-medium lg:mt-0 lg:text-base">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
