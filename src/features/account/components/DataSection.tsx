import { Download } from 'lucide-react';
import type { ApiError } from '@/api/errors';
import { formatRetryWait } from '@/lib/time';
import { useExportData } from '../queries';

function exportErrorCopy(error: ApiError): string {
  if (error.status === 429) return `You downloaded your data recently. Try again ${formatRetryWait(error.retryAfterMs)}.`;
  if (error.status === 0) return 'We could not reach the server. Check your connection and try again.';
  return 'We could not prepare your data. Please try again.';
}

export interface DataSectionProps {
  /** Tests replace the browser download. */
  onSave?: (blob: Blob, filename: string) => void;
}

/** FR-23 / contract 0.6.0: export everything Eduujoy holds about the learner. */
export default function DataSection({ onSave }: DataSectionProps) {
  const exportData = useExportData(onSave);

  return (
    <section aria-labelledby="data-title" className="space-y-3 rounded-card border border-border p-4">
      <h2 id="data-title" className="text-lg font-bold text-text">
        Your data
      </h2>
      <p className="text-sm text-text-muted">Download everything Eduujoy holds about you as a JSON file.</p>
      <button
        type="button"
        onClick={() => {
          exportData.mutate();
        }}
        disabled={exportData.isPending}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-primary px-4 font-semibold text-primary disabled:opacity-60"
      >
        <Download className="h-5 w-5" aria-hidden="true" />
        {exportData.isPending ? 'Preparing your data…' : 'Download my data'}
      </button>
      <div aria-live="polite" className="text-sm">
        {exportData.isSuccess && <p className="text-success">Downloaded {exportData.data}.</p>}
      </div>
      {exportData.error && (
        <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
          {exportErrorCopy(exportData.error)}
        </p>
      )}
    </section>
  );
}
