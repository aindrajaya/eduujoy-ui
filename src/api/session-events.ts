import type { SessionExpiredContext } from './interceptors';

type SessionExpiredHandler = (ctx: SessionExpiredContext) => void;
let handler: SessionExpiredHandler | undefined;

/** Registers what happens when a refresh fails (auth/session-expiry.ts installs it at boot). */
export function setSessionExpiredHandler(next: SessionExpiredHandler | undefined): void {
  handler = next;
}

export function emitSessionExpired(ctx: SessionExpiredContext): void {
  handler?.(ctx);
}
