import { Outlet } from 'react-router';
import BottomNav from '@/ui/BottomNav';

/** Layout for the four tab screens: content above a fixed bottom tab bar. */
export default function TabsLayout() {
  return (
    <>
      <main className="pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </>
  );
}
