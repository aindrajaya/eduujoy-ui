import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { ApiError } from '@/api/errors';

function describe(error: unknown): { title: string; message: string; retry: boolean } {
  if (isRouteErrorResponse(error) && error.status === 403) {
    return { title: 'No access', message: 'You do not have access to this page.', retry: false };
  }
  if (isRouteErrorResponse(error) && error.status === 404) {
    return { title: 'Page not found', message: 'That page does not exist.', retry: false };
  }
  if (error instanceof ApiError && (error.status === 0 || error.status >= 500)) {
    return {
      title: 'Can’t reach Eduujoy',
      message: 'The server did not respond. Check your connection and try again.',
      retry: true,
    };
  }
  return { title: 'Something went wrong', message: 'Please try again.', retry: true };
}

/** Root error boundary: loader failures (e.g. auth/me unreachable), 403 from role guards, crashes. */
export default function RouteError() {
  const { title, message, retry } = describe(useRouteError());
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
      <h1 className="text-text">{title}</h1>
      <p role="alert" className="text-text-muted">
        {message}
      </p>
      <div className="flex gap-4">
        {retry && (
          <button
            type="button"
            onClick={() => {
              window.location.reload();
            }}
            className="sk-btn sk-btn-primary"
          >
            Try again
          </button>
        )}
        <Link to="/" className="inline-flex min-h-11 items-center font-semibold text-primary underline">
          Go home
        </Link>
      </div>
    </main>
  );
}
