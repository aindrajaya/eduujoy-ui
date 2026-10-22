import { useMutation } from '@tanstack/react-query';
import { exportMyData } from '@/api/endpoints/me';
import type { ApiError } from '@/api/errors';

/** Hands the file to the browser as a download. */
export function saveFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoke after the click has been handled.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

/** GDPR-style export of everything Eduujoy holds about the learner (contract 0.6.0). */
export function useExportData(save: (blob: Blob, filename: string) => void = saveFile) {
  return useMutation<string, ApiError>({
    mutationFn: async () => {
      const { blob, filename } = await exportMyData();
      save(blob, filename);
      return filename;
    },
  });
}
