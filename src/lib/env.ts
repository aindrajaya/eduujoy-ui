// Public runtime config. Every VITE_* value is bundled into the client: never put secrets here.

const PRODUCTION_API_URL = 'https://api.eduujoy.aindrajaya.my.id';
const LOCAL_API_URL = 'http://localhost:3000';

/** Validates VITE_API_URL; falls back to the local API in dev/test and the production API otherwise. */
export function resolveApiUrl(raw: string | undefined, isProd: boolean): string {
  const value = raw?.trim();
  if (!value) return isProd ? PRODUCTION_API_URL : LOCAL_API_URL;
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`VITE_API_URL must be an http(s) URL, got ${url.protocol}`);
  }
  return url.origin;
}

export const env = {
  apiUrl: resolveApiUrl(import.meta.env.VITE_API_URL, import.meta.env.PROD),
  apiMocks: import.meta.env.VITE_API_MOCKS === 'true',
} as const;
