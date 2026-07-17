import './AddressPicker.css'
import { useState, useEffect } from 'react'
import DropdownInput from '../DropdownInput/DropdownInput.jsx'
import { suggestAddresses } from '../../../api/geocode.js'

// Single-location autocomplete that yields COORDINATES (the backend requires
// each starting location as { latitude, longitude }). Picking a suggestion
// fills the search bar with its label and stores the coords — no separate chip.
//   value:    { label, latitude, longitude } | null
//   onChange: (loc | null) => void
// See .claude/roadmap/frontend-backend-integration.md (Step 4).
function AddressPicker({ value = null, onChange, placeholder = 'Enter a starting location' }) {
  // The input text mirrors the chosen label; editing it clears the selection
  // until a new suggestion is picked.
  const [text, setText] = useState(value?.label ?? '')
  const [suggestions, setSuggestions] = useState([])

  // Debounce lookups so we don't call Geoapify on every keystroke. `active`
  // drops results from a stale query (typed further before it resolved).
  useEffect(() => {
    const query = text.trim()
    if (!query) return
    // The text matches the picked address → it was just selected, not typed.
    // Skip the lookup so the dropdown doesn't reappear after a pick.
    if (value && text === value.label) return

    let active = true
    const timer = setTimeout(() => {
      suggestAddresses(query)
        .then((results) => {
          if (active) setSuggestions(results)
        })
        .catch(() => {
          if (active) setSuggestions([])
        })
    }, 300)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [text, value])

  const onType = (e) => {
    const next = e.target.value
    setText(next)
    if (!next.trim()) setSuggestions([]) // clear immediately when emptied
    // Typing after a pick invalidates the stored coords until a new selection.
    if (value) onChange(null)
  }

  const pick = (loc) => {
    onChange(loc)
    setText(loc.label) // fill the bar with the chosen address
    setSuggestions([])
  }

  return (
    <div className="address-picker">
      <DropdownInput placeholder={placeholder} value={text} onChange={onType} />

      {suggestions.length > 0 && (
        <ul className="address-picker__suggestions">
          {suggestions.map((s, i) => (
            <li key={`${s.latitude},${s.longitude},${i}`}>
              <button type="button" onClick={() => pick(s)}>
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default AddressPicker
