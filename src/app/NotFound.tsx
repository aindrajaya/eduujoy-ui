import { Link } from 'react-router';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold text-text">Page not found</h1>
      <p className="text-text-muted">That page does not exist.</p>
      <Link to="/" className="font-semibold text-primary underline">
        Go home
      </Link>
    </main>
  );
}
