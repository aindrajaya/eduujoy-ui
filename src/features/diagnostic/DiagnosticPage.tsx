import { useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { Link, useParams } from 'react-router';
import type { DiagnosticBatchResponse } from '@/api/types';
import StateMessage from '@/ui/StateMessage';
import { diagnosticKeys } from './keys';

/**
 * Hand-off target for onboarding (US-01). It reads the first batch seeded by /start; the quiz
 * itself arrives in U6. The contract has no GET for a diagnostic, so a reload cannot restore it.
 */
export default function DiagnosticPage() {
  const { id = '' } = useParams();
  const batch = useQueryClient().getQueryData<DiagnosticBatchResponse>(diagnosticKeys.batch(id));

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 p-6">
      {batch ? (
        <>
          <ClipboardCheck className="h-10 w-10 text-primary" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-text">Your quick diagnostic is ready</h1>
          <p className="text-text-muted">
            About {batch.progress.estimatedTotal} short questions place you on the path, so you skip what you
            already know. The first {batch.items?.length ?? 0} are ready.
          </p>
        </>
      ) : (
        <StateMessage title="This diagnostic isn’t available here" action={<Link to="/start" className="font-semibold text-primary underline">Start again</Link>}>
          Start from your topic again to begin a new diagnostic.
        </StateMessage>
      )}
    </main>
  );
}
