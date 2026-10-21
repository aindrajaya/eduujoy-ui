import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSession } from './session';

/**
 * For /signin and /signup, which render immediately instead of waiting on auth/me (PRD-UI §9 LCP):
 * once the session resolves signed in, replace the page with `target`. Pass `enabled: false` while
 * the page's own sign-in/sign-up runs, so that flow decides where the new session goes.
 */
export function useRedirectIfSignedIn(target: string, enabled = true): void {
  const { data: me } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (enabled && me) void navigate(target, { replace: true });
  }, [enabled, me, navigate, target]);
}
