import { Trash2 } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import ErrorNote from '@/ui/ErrorNote';

export interface DeleteAccountDialogProps {
  open: boolean;
  /** Set after the learner signed in again to confirm (REAUTH_REQUIRED round trip). */
  reauthenticated?: boolean;
  deleting: boolean;
  errorMessage?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation before the irreversible delete. A native modal <dialog>: focus moves into it,
 * Esc cancels, and the page behind is inert. Cancel is focused first so Enter does not delete.
 */
export default function DeleteAccountDialog({
  open,
  reauthenticated = false,
  deleting,
  errorMessage,
  onConfirm,
  onCancel,
}: DeleteAccountDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(e) => {
        e.preventDefault();
        if (!deleting) onCancel();
      }}
      className="sk-card m-auto w-[min(28rem,calc(100%-2rem))] p-6 text-text backdrop:bg-bg/80"
    >
      <h2 id={titleId} className="sk-display-md">
        Delete your account?
      </h2>
      <div id={bodyId} className="mt-3 space-y-2 text-sm text-text-muted">
        {reauthenticated && <p className="font-semibold text-text">You signed in again. Confirm to delete your account.</p>}
        <p>
          This deletes your account, learning paths, progress and checkpoint results, and signs you out. It cannot
          be undone.
        </p>
        <p>Download your data first if you want a copy.</p>
      </div>
      {errorMessage && (
        <div className="mt-4">
          <ErrorNote>
          {errorMessage}
        </ErrorNote>
        </div>
      )}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
        <button
          type="button"
          onClick={onConfirm}
          disabled={deleting}
          className="sk-btn sk-btn-ghost flex-1 text-text"
        >
          <Trash2 className="h-5 w-5" aria-hidden="true" />
          {deleting ? 'Deleting…' : 'Delete my account'}
        </button>
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className="sk-btn flex-1"
        >
          Keep my account
        </button>
      </div>
    </dialog>
  );
}
