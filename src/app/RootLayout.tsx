import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { loadSketchFonts } from '@/ui/sketch/loadFonts';
import ToastHost from '@/ui/toast/ToastHost';
import WakeUpNotice from '@/ui/WakeUpNotice';

/** Phone-width column below 1024 px; full width from `lg`, where the tabs become a left rail. */
export default function RootLayout() {
  // Nunito and Excalifont load after first paint, off the LCP path (lead decision, 22 Oct 2026).
  useEffect(() => loadSketchFonts(), []);
  return (
    <div className="min-h-dvh bg-bg antialiased">
      <div className="relative mx-auto min-h-dvh w-full max-w-md bg-bg md:border-x-2 md:border-ink lg:max-w-none lg:border-x-0">
        <Outlet />
      </div>
      <WakeUpNotice />
      <ToastHost />
    </div>
  );
}
