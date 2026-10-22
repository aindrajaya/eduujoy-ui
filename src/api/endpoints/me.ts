import { api } from '../client';

export interface DataExport {
  blob: Blob;
  filename: string;
}

/** Contract 0.6.0: all personal data as a JSON attachment. */
export async function exportMyData(now: Date = new Date()): Promise<DataExport> {
  const res = await api.get<Blob>('/v1/me/export', { responseType: 'blob' });
  // Content-Disposition is only readable cross-origin if the API exposes it; fall back to a dated name.
  const disposition = String(res.headers['content-disposition'] ?? '');
  const named = /filename="?([^";]+)"?/.exec(disposition)?.[1];
  return { blob: res.data, filename: named ?? `eduujoy-export-${now.toISOString().slice(0, 10)}.json` };
}

/** Contract 0.6.0: deletes the account and clears both cookies (204). 401 REAUTH_REQUIRED without a recent sign-in. */
export async function deleteMyAccount(): Promise<void> {
  await api.delete('/v1/me');
}
