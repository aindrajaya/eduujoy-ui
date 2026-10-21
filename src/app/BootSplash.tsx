import { useWakingUp } from '@/ui/useWakingUp';

/**
 * Shown while the root loaders resolve the session (PRD-UI §6). It matches the static splash in
 * index.html, so first paint never shows protected UI or a sign-in form by mistake. After 1.5 s
 * it says the server is waking up instead of looking stuck (PRD-UI §4).
 */
export default function BootSplash() {
  const waking = useWakingUp();
  return (
    <div
      role="status"
      aria-label={waking ? 'Waking up the server' : 'Loading Eduujoy'}
      className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500"
    >
      <span className="animate-pulse text-3xl font-bold tracking-tight text-white">Eduujoy</span>
      <span className={`text-base text-white ${waking ? '' : 'invisible'}`}>Waking up the server…</span>
    </div>
  );
}
