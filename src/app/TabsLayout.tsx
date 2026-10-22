import { Outlet } from 'react-router';
import BottomNav from '@/ui/BottomNav';

/**
 * The four tab screens (PRD-UI §4): a bottom tab bar on mobile, a left rail from 1024 px.
 * Mobile content leaves room for the tab bar and the safe-area inset.
 */
export default function TabsLayout() {
  return (
    <div className="lg:flex">
      <BottomNav />
      <main className="pb-[calc(4rem+env(safe-area-inset-bottom))] lg:mx-auto lg:w-full lg:max-w-3xl lg:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
