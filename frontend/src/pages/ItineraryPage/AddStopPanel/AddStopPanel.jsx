import './AddStopPanel.css'
import { useCallback, useState, useEffect, useRef } from 'react'
import TextInput from '../../../components/Inputs/TextInput/TextInput.jsx'
import { searchCatalog } from '../../../api/itinerary.js'

const DEBOUNCE_MS = 300

// Modal to add a stop by searching the shared venue catalog. Opened from the
// itinerary action bar (owner only). Type to search by name (debounced); each
// result has an Add button that appends it to the itinerary via the parent's
// onAddStop. Controlled by the parent's `open`/`onClose`, like ExportModal;
// closes on backdrop click, the X, and Escape.
function AddStopPanel({ open, onClose, onAddStop, meetingPoint, radiusMi }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [addingId, setAddingId] = useState(null)
  const genRef = useRef(0)

  const geoActive = meetingPoint != null && radiusMi != null

  // Reset local state, then ask the parent to close, so re-opening starts clean.
  const close = useCallback(() => {
    setQuery('')
    setResults([])
    setLoading(false)
    setAddingId(null)
    onClose()
  }, [onClose])

  // Close on Escape while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  // Debounced catalog search. `ignore`/generation guard keeps a slow earlier
  // request from overwriting a newer one.
  useEffect(() => {
    if (!open) return
    const generation = ++genRef.current
    let ignore = false
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchCatalog({
          q: query.trim() || undefined,
          limit: 15,
          ...(geoActive && { lat: meetingPoint.lat, lng: meetingPoint.lng, radius: radiusMi }),
        })
        if (ignore || generation !== genRef.current) return
        setResults(data)
      } catch (err) {
        if (!ignore) console.error('Catalog search failed:', err)
      } finally {
        if (!ignore) setLoading(false)
      }
    }, DEBOUNCE_MS)
    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [query, open, geoActive, meetingPoint?.lat, meetingPoint?.lng, radiusMi])

  const handleAdd = async (venue) => {
    if (addingId) return
    setAddingId(venue.id)
    await onAddStop(venue)
    setAddingId(null)
  }

  if (!open) return null

  return (
    <div className="add-stop-modal__backdrop" onClick={close}>
      <div
        className="add-stop-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Add a stop"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="add-stop-modal__close" onClick={close} aria-label="Close">
          ×
        </button>
        <h2 className="add-stop-modal__title">Add a stop</h2>

        <TextInput
          placeholder="Search venues by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {geoActive && (
          <p className="add-stop-modal__geo-note">
            Showing places within {radiusMi} mi of your group&rsquo;s meeting point
          </p>
        )}

        <ul className="add-stop-modal__results">
          {loading && results.length === 0 && (
            <li className="add-stop-modal__hint">Searching…</li>
          )}
          {!loading && results.length === 0 && (
            <li className="add-stop-modal__hint">No venues found.</li>
          )}
          {results.map((venue) => (
            <li key={venue.id} className="add-stop-modal__row">
              <div className="add-stop-modal__info">
                <span className="add-stop-modal__name">{venue.name}</span>
                <span className="add-stop-modal__meta">
                  {venue.category}
                  {venue.rating != null && ` · ★ ${venue.rating}`}
                  {venue.pricePerPerson != null && ` · $${venue.pricePerPerson}/person`}
                  {venue.distanceMi != null && ` · ${venue.distanceMi} mi away`}
                </span>
              </div>
              <button
                type="button"
                className="add-stop-modal__add"
                onClick={() => handleAdd(venue)}
                disabled={addingId != null}
              >
                {addingId === venue.id ? 'Adding…' : 'Add'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default AddStopPanel
