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

export default function BottomNav({ items = defaultNavItems }: BottomNavProps) {
  return (
    <nav
      aria-label="Main"
      className="fixed right-0 bottom-0 left-0 mx-auto max-w-md border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-lg"
    >
      <ul className="flex h-16 items-center justify-around">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="h-full w-full">
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex h-full min-h-11 w-full flex-col items-center justify-center transition-colors duration-200 ${
                  isActive ? 'text-green-700' : 'text-gray-500'
                }`
              }
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
              <span className="mt-1 text-xs font-medium">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
