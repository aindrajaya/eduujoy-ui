import { lazy, Suspense, useState, useSyncExternalStore } from 'react';
import { getToasts, subscribeToasts } from './store';

const Toaster = lazy(() => import('./Toaster'));

/** Mounted once in the shell. Loads the Toaster chunk on the first toast, then keeps it mounted. */
export default function ToastHost() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts);
  const [needed, setNeeded] = useState(false);
  if (!needed && toasts.length > 0) setNeeded(true);
  if (!needed) return null;
  return (
    <Suspense fallback={null}>
      <Toaster toasts={toasts} />
    </Suspense>
  );
}
