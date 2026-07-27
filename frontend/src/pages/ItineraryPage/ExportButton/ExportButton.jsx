import './ExportButton.css'
import { useState } from 'react'

// A small "Export" control that opens a menu with two actions: copy the itinerary
// as text (any viewer) and email it to the group (owner only). onCopy/onEmail are
// async handlers owned by ItineraryPage; this component only manages menu open
// state and a short-lived status message.
function ExportButton({ isOwner, onCopy, onEmail }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const runCopy = async () => {
    await onCopy()
    setStatus('Copied!')
    setTimeout(() => setStatus(''), 2000)
  }

  const runEmail = async () => {
    if (busy) return
    setBusy(true)
    setStatus('Sending…')
    try {
      const msg = await onEmail()
      setStatus(msg)
    } catch {
      setStatus('Could not send. Please try again.')
    } finally {
      setBusy(false)
      setTimeout(() => setStatus(''), 4000)
    }
  }

  return (
    <div className="export-button">
      <button className="action-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        Export
      </button>
      {open && (
        <div className="export-button__menu" role="menu">
          <button type="button" role="menuitem" onClick={runCopy}>Copy as text</button>
          {isOwner && (
            <button type="button" role="menuitem" onClick={runEmail} disabled={busy}>
              Email to group
            </button>
          )}
        </div>
      )}
      {status && <span className="export-button__status" role="status">{status}</span>}
    </div>
  )
}

export default ExportButton
