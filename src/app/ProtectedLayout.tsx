import { lazy, Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { afterFirstPaint } from '@/lib/idle';

// Loaded behind its own import so the realtime code never lands in a shell chunk (/signin budget).
const RealtimeBridge = lazy(() => import('@/realtime/RealtimeBridge'));

/**
 * Wraps every signed-in screen. The realtime socket opens once the first screen has painted and
 * the browser is idle, so neither its chunk nor its connection competes with the LCP (PRD-UI §9).
 */
export default function ProtectedLayout() {
  const [realtime, setRealtime] = useState(false);
  useEffect(
    () =>
      afterFirstPaint(() => {
        setRealtime(true);
      }),
    [],
  );
  return (
    <>
      {realtime && (
        <Suspense fallback={null}>
          <RealtimeBridge />
        </Suspense>
      )}
      <Outlet />
    </>
  );
}
