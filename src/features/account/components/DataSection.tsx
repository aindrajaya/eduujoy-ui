import { Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { ApiError } from '@/api/errors';
import type { SignInLocationState } from '@/auth/queries';
import { formatRetryWait } from '@/lib/time';
import { useDeleteAccount, useExportData } from '../queries';
import DeleteAccountDialog from './DeleteAccountDialog';

/** Where the learner returns after signing in again to confirm the delete. */
export const DELETE_RETURN = '/account?delete=1';

function deleteErrorCopy(error: ApiError): string {
  if (error.status === 0) return 'We could not reach the server. Your account was not deleted.';
  return 'We could not delete your account. Nothing was deleted; please try again.';
}

function exportErrorCopy(error: ApiError): string {
  if (error.status === 429) return `You downloaded your data recently. Try again ${formatRetryWait(error.retryAfterMs)}.`;
  if (error.status === 0) return 'We could not reach the server. Check your connection and try again.';
  return 'We could not prepare your data. Please try again.';
}

export interface DataSectionProps {
  /** Tests replace the browser download. */
  onSave?: (blob: Blob, filename: string) => void;
  /** Back from signing in again (REAUTH_REQUIRED): reopen the confirmation. */
  confirmDelete?: boolean;
  /** The delete flow was closed; the page drops `?delete=1`. */
  onDeleteClosed?: () => void;
}

/**
 * FR-23 / contract 0.6.0: export everything Eduujoy holds about the learner, or delete the account.
 * Delete needs a sign-in within 10 minutes; without one the API answers REAUTH_REQUIRED and the
 * learner signs in again, then confirms once more here.
 */
export default function DataSection({ onSave, confirmDelete = false, onDeleteClosed }: DataSectionProps) {
  const exportData = useExportData(onSave);
  const deleteAccount = useDeleteAccount();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(confirmDelete);

  const closeDialog = () => {
    setDialogOpen(false);
    deleteAccount.reset();
    onDeleteClosed?.();
  };

  const confirm = () => {
    deleteAccount.mutate(undefined, {
      onSuccess: () => {
        const state: SignInLocationState = { accountDeleted: true };
        void navigate('/signin', { replace: true, state });
      },
      onError: (error) => {
        if (error.code !== 'REAUTH_REQUIRED') return;
        const params = new URLSearchParams({ next: DELETE_RETURN, reauth: '1' });
        void navigate(`/signin?${params.toString()}`);
      },
    });
  };

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

      <div className="border-t border-border pt-3">
        <button
          type="button"
          onClick={() => {
            setDialogOpen(true);
          }}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 font-semibold text-danger"
        >
          <Trash2 className="h-5 w-5" aria-hidden="true" />
          Delete my account
        </button>
      </div>
      <DeleteAccountDialog
        open={dialogOpen}
        reauthenticated={confirmDelete}
        deleting={deleteAccount.isPending}
        errorMessage={
          deleteAccount.error && deleteAccount.error.code !== 'REAUTH_REQUIRED'
            ? deleteErrorCopy(deleteAccount.error)
            : undefined
        }
        onConfirm={confirm}
        onCancel={closeDialog}
      />
    </section>
  );
}
