"use client";

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmModal({ open, onCancel, onConfirm }: Props) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon">⚠️</div>
        <h2 className="modal-title">Start a New Study?</h2>
        <p className="modal-desc">
          Creating a new study will <strong>permanently remove</strong> all current data
          including uploaded files, scoring configuration, and analysis results.
        </p>
        <div className="modal-alert">
          💡 <strong>Tip:</strong> Download your results before starting a new study
          to avoid losing your work.
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn modal-btn-danger" onClick={onConfirm}>
            🗑️ Initiate New Study
          </button>
        </div>
      </div>
    </div>
  );
}
