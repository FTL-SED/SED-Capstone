import './ExportModal.css'
import { useCallback, useEffect, useRef, useState } from 'react'

// Conservative well-formed-email check, mirrors the backend's EMAIL_RE.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// The export overlay: a chip/tag input for typing recipient emails and a Send
// button, with a Copy-to-clipboard button pinned bottom-center. Closes on
// backdrop click, the X, Escape, and after a successful send. All async work is
// owned by the parent (onSend/onCopy); this component owns only local UI state.
function ExportModal({ open, onClose, onSend, onCopy }) {
  const [draft, setDraft] = useState('')
  const [emails, setEmails] = useState([])
  const [hint, setHint] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef(null)

  // Focus the input when the modal opens. (Reset of the fields happens on close
  // via `close()`, so the next open starts clean without a setState-in-effect.)
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Reset local state, then ask the parent to close. Used by every close path
  // (backdrop, X, Escape, and after a successful send) so re-opening is clean.
  const close = useCallback(() => {
    setDraft('')
    setEmails([])
    setHint('')
    setStatus('')
    setBusy(false)
    setCopied(false)
    onClose()
  }, [onClose])

  // Close on Escape while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  if (!open) return null

  // Validate the current draft and, if good and not a duplicate, add it as a chip.
  const commitDraft = () => {
    const email = draft.trim().toLowerCase()
    if (!email) return
    if (!EMAIL_RE.test(email)) {
      setHint(`"${email}" is not a valid email address.`)
      return
    }
    if (emails.includes(email)) {
      setDraft('')
      setHint('')
      return
    }
    setEmails((prev) => [...prev, email])
    setDraft('')
    setHint('')
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitDraft()
    } else if (e.key === 'Backspace' && draft === '' && emails.length > 0) {
      // Backspace on an empty input removes the last chip.
      setEmails((prev) => prev.slice(0, -1))
    }
  }

  const removeEmail = (email) => setEmails((prev) => prev.filter((e) => e !== email))

  const send = async () => {
    // Fold a typed-but-not-yet-committed address into the list before sending.
    const pending = draft.trim().toLowerCase()
    let toSend = emails
    if (pending) {
      if (!EMAIL_RE.test(pending)) {
        setHint(`"${pending}" is not a valid email address.`)
        return
      }
      if (!emails.includes(pending)) toSend = [...emails, pending]
    }
    if (toSend.length === 0) {
      setHint('Add at least one email address.')
      return
    }
    setBusy(true)
    setStatus('')
    try {
      const res = await onSend(toSend)
      const sent = res?.sent?.length ?? 0
      const failed = res?.failed?.length ?? 0
      setStatus(failed > 0 ? `Sent to ${sent}, ${failed} failed` : `Sent to ${sent}`)
      if (failed === 0) setTimeout(close, 1200)
    } catch {
      setStatus('Could not send. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    await onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="export-modal__backdrop" onClick={close}>
      <div
        className="export-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Export itinerary"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="export-modal__close" onClick={close} aria-label="Close">
          ×
        </button>
        <h2 className="export-modal__title">Email this itinerary</h2>
        <p className="export-modal__subtitle">
          Add the email addresses you'd like to send it to.
        </p>

        <div className="export-modal__chips">
          {emails.map((email) => (
            <span key={email} className="export-modal__chip">
              {email}
              <button
                type="button"
                className="export-modal__chip-remove"
                onClick={() => removeEmail(email)}
                aria-label={`Remove ${email}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="email"
            className="export-modal__input"
            placeholder={emails.length ? 'Add another…' : 'name@example.com'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={commitDraft}
          />
        </div>
        {hint && <span className="export-modal__hint" role="status">{hint}</span>}

        <button
          type="button"
          className="export-modal__send"
          onClick={send}
          disabled={busy || (emails.length === 0 && draft.trim() === '')}
        >
          {busy ? 'Sending…' : 'Send'}
        </button>
        {status && <span className="export-modal__status" role="status">{status}</span>}

        <div className="export-modal__footer">
          <button type="button" className="export-modal__copy" onClick={copy}>
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportModal
