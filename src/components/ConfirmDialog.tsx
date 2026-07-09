import type { ReactNode } from "react";

type ConfirmDialogProps = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="confirm-dialog-title">
          {title}
        </h2>
        <div className="confirm-dialog-message">{message}</div>
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="auth-button auth-button-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button type="button" className="auth-button confirm-dialog-danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Removing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
