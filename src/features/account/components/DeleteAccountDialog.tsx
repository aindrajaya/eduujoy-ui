import { useEffect, useId, useRef } from 'react';

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
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-border bg-surface p-6 text-text shadow-2xl backdrop:bg-black/50"
    >
      <h2 id={titleId} className="text-xl font-bold">
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
        <p role="alert" className="mt-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">
          {errorMessage}
        </p>
      )}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
        <button
          type="button"
          onClick={onConfirm}
          disabled={deleting}
          className="min-h-11 flex-1 rounded-xl border-2 border-danger bg-surface px-5 font-semibold text-danger disabled:opacity-60"
        >
          {deleting ? 'Deleting…' : 'Delete my account'}
        </button>
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className="min-h-11 flex-1 rounded-xl border-2 border-border px-5 font-semibold text-text disabled:opacity-60"
        >
          Keep my account
        </button>
      </div>
    </dialog>
  );
}
