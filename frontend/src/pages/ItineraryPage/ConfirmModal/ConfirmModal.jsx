import './ConfirmModal.css'
import { useEffect } from 'react'

// A small in-app confirmation dialog, replacing the browser's native
// window.confirm so destructive actions get a branded, readable prompt with a
// tailored title/message and named buttons. Controlled by the parent's `open`;
// closes on backdrop click, the X, Escape, and Cancel. `danger` tints the
// confirm button red for destructive actions (delete, remove).
function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) {
  // Close on Escape while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="confirm-modal__backdrop" onClick={onCancel}>
      <div
        className="confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="confirm-modal__close" onClick={onCancel} aria-label="Close">
          ×
        </button>
        <h2 className="confirm-modal__title">{title}</h2>
        {message && <p className="confirm-modal__message">{message}</p>}
        <div className="confirm-modal__actions">
          <button type="button" className="confirm-modal__cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-modal__confirm${danger ? ' confirm-modal__confirm--danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
