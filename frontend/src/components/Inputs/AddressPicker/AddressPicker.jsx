import './AddressPicker.css'
import { useState, useEffect } from 'react'
import DropdownInput from '../DropdownInput/DropdownInput.jsx'
import { suggestAddresses } from '../../../api/geocode.js'

// Address autocomplete that yields COORDINATES, not free text — the backend
// requires each starting location as { latitude, longitude }. Selected
// locations are shown as removable chips.
//   value:    [{ label, latitude, longitude }]
//   onChange: (next) => void   (called with the updated array)
// See .claude/roadmap/frontend-backend-integration.md (Step 4).
function AddressPicker({ value = [], onChange, placeholder = 'Enter a starting location' }) {
  const [text, setText] = useState('')
  const [suggestions, setSuggestions] = useState([])

  // Debounce lookups so we don't call Geoapify on every keystroke. The `active`
  // flag drops results from a stale query (typed further before it resolved).
  // Only runs for non-empty text; clearing on empty is handled in onType so no
  // setState happens synchronously in the effect body.
  useEffect(() => {
    const query = text.trim()
    if (!query) return

    let active = true
    const timer = setTimeout(() => {
      suggestAddresses(query)
        .then((results) => {
          if (active) setSuggestions(results)
        })
        .catch(() => {
          if (active) setSuggestions([]) // a failed lookup just shows no suggestions
        })
    }, 300)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [text])

  const onType = (e) => {
    const next = e.target.value
    setText(next)
    if (!next.trim()) setSuggestions([]) // clear immediately when the box is emptied
  }

  const addLocation = (loc) => {
    // Skip exact duplicates (same coords already picked).
    const exists = value.some(
      (v) => v.latitude === loc.latitude && v.longitude === loc.longitude
    )
    if (!exists) onChange([...value, loc])
    setText('')
    setSuggestions([])
  }

  const removeLocation = (index) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="address-picker">
      <DropdownInput
        placeholder={placeholder}
        value={text}
        onChange={onType}
      />

      {suggestions.length > 0 && (
        <ul className="address-picker__suggestions">
          {suggestions.map((s, i) => (
            <li key={`${s.latitude},${s.longitude},${i}`}>
              <button type="button" onClick={() => addLocation(s)}>
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="address-picker__chips">
        {value.map((loc, i) => (
          <span key={`${loc.latitude},${loc.longitude},${i}`} className="address-picker__chip">
            {loc.label}
            <button type="button" onClick={() => removeLocation(i)} aria-label={`Remove ${loc.label}`}>
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}

export default AddressPicker
