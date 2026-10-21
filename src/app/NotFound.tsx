import { Link } from 'react-router';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="text-gray-600">That page does not exist.</p>
      <Link to="/" className="font-semibold text-indigo-700 underline">
        Go home
      </Link>
    </main>
  );
}
