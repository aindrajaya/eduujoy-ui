import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router';

// Loaded behind its own import so the realtime code never lands in a shell chunk (/signin budget).
const RealtimeBridge = lazy(() => import('@/realtime/RealtimeBridge'));

/** Wraps every signed-in screen: the realtime socket lives here, so /signin never loads it. */
export default function ProtectedLayout() {
  return (
    <>
      <Suspense fallback={null}>
        <RealtimeBridge />
      </Suspense>
      <Outlet />
    </>
  );
}
