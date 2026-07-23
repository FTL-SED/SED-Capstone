import './AddStopPanel.css'
import { useState, useEffect, useRef } from 'react'
import TextInput from '../../../components/Inputs/TextInput/TextInput.jsx'
import { searchCatalog } from '../../../api/itinerary.js'

const DEBOUNCE_MS = 300

// In-edit-mode panel to add a stop by searching the shared venue catalog. Type
// to search by name (debounced); each result has an Add button that appends it
// to the itinerary via the parent's onAddStop. Collapsed behind a toggle so it
// doesn't clutter the timeline until the user wants it.
function AddStopPanel({ onAddStop }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [addingId, setAddingId] = useState(null)
  const genRef = useRef(0)

  // Debounced catalog search. `ignore`/generation guard keeps a slow earlier
  // request from overwriting a newer one.
  useEffect(() => {
    if (!open) return
    const generation = ++genRef.current
    let ignore = false
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchCatalog({ q: query.trim() || undefined, limit: 15 })
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
  }, [query, open])

  const handleAdd = async (venue) => {
    if (addingId) return
    setAddingId(venue.id)
    await onAddStop(venue)
    setAddingId(null)
  }

  if (!open) {
    return (
      <button type="button" className="add-stop-panel__open" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add a stop
      </button>
    )
  }

  return (
    <div className="add-stop-panel">
      <div className="add-stop-panel__head">
        <h3>Add a stop</h3>
        <button type="button" className="add-stop-panel__close" onClick={() => setOpen(false)} aria-label="Close">
          ×
        </button>
      </div>

      <TextInput
        placeholder="Search venues by name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <ul className="add-stop-panel__results">
        {loading && results.length === 0 && (
          <li className="add-stop-panel__hint">Searching…</li>
        )}
        {!loading && results.length === 0 && (
          <li className="add-stop-panel__hint">No venues found.</li>
        )}
        {results.map((venue) => (
          <li key={venue.id} className="add-stop-panel__row">
            <div className="add-stop-panel__info">
              <span className="add-stop-panel__name">{venue.name}</span>
              <span className="add-stop-panel__meta">
                {venue.category}
                {venue.rating != null && ` · ★ ${venue.rating}`}
                {venue.pricePerPerson != null && ` · $${venue.pricePerPerson}/person`}
              </span>
            </div>
            <button
              type="button"
              className="add-stop-panel__add"
              onClick={() => handleAdd(venue)}
              disabled={addingId != null}
            >
              {addingId === venue.id ? 'Adding…' : 'Add'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default AddStopPanel
