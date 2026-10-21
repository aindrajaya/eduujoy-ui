/**
 * Shown while the root loaders resolve the session (PRD-UI §6). It matches the static splash in
 * index.html, so first paint never shows protected UI or a sign-in form by mistake.
 */
export default function BootSplash() {
  return (
    <div
      role="status"
      aria-label="Loading Eduujoy"
      className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500"
    >
      <span className="animate-pulse text-3xl font-bold tracking-tight text-white">Eduujoy</span>
    </div>
  );
}
