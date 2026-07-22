import './EditItineraryModal.css'
import { useState } from 'react'
import TextInput from '../../../components/Inputs/TextInput/TextInput.jsx'
import ErrorMessage from '../../../components/ErrorMessage/ErrorMessage.jsx'
import { updateItinerary } from '../../../api/itinerary.js'

// Transport modes the backend accepts (mirrors config/ai.js TRANSPORT_MODES);
// same set the create wizard offers.
const TRANSPORT_OPTIONS = ['walking', 'biking', 'transit', 'driving']

// Owner-only edit form for an itinerary's title/description + the trip
// constraints the plan was generated from (US #7). Pre-fills from the itinerary
// and PUTs the changes; the backend validates (e.g. a budget below the plan's
// cost, or a window that would drop a stop) and we surface its error inline.
function EditItineraryModal({ itinerary, onClose, onSaved }) {
  const [title, setTitle] = useState(itinerary.title ?? '')
  const [description, setDescription] = useState(itinerary.description ?? '')
  const [dayStart, setDayStart] = useState(itinerary.dayStart ?? '')
  const [dayEnd, setDayEnd] = useState(itinerary.dayEnd ?? '')
  const [budget, setBudget] = useState(itinerary.maxBudgetPerPerson ?? '')
  const [travelRadius, setTravelRadius] = useState(itinerary.travelRadius ?? '')
  const [transport, setTransport] = useState(itinerary.transport ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (saving) return
    if (title.trim() === '') {
      setError('Title cannot be empty.')
      return
    }
    // dayStart/dayEnd are an all-or-nothing pair (the backend enforces this too).
    if (Boolean(dayStart) !== Boolean(dayEnd)) {
      setError('Set both a start and end time, or clear both.')
      return
    }

    // Send only string/number-shaped values the PUT accepts; blanks clear the
    // optional constraints (null), never send NaN.
    const changes = {
      title: title.trim(),
      description: description.trim() === '' ? null : description.trim(),
      dayStart: dayStart || null,
      dayEnd: dayEnd || null,
      maxBudgetPerPerson: budget === '' ? null : Number(budget),
      travelRadius: travelRadius === '' ? null : Number(travelRadius),
      transport: transport || null,
    }

    setSaving(true)
    setError('')
    try {
      const updated = await updateItinerary(itinerary.id, changes)
      onSaved(updated)
      onClose()
    } catch (err) {
      // Surface the backend's validation message (400/409) when present.
      setError(err.response?.data?.error || 'Could not save changes. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="edit-itinerary-modal" role="dialog" aria-modal="true" aria-label="Edit itinerary">
      <div className="edit-itinerary-modal__backdrop" onClick={onClose} />
      <form className="edit-itinerary-modal__card" onSubmit={handleSubmit}>
        <h2 className="edit-itinerary-modal__title">Edit itinerary</h2>

        <TextInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextInput
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="edit-itinerary-modal__row">
          <TextInput label="Start time" type="time" value={dayStart} onChange={(e) => setDayStart(e.target.value)} />
          <TextInput label="End time" type="time" value={dayEnd} onChange={(e) => setDayEnd(e.target.value)} />
        </div>

        <div className="edit-itinerary-modal__row">
          <TextInput label="Budget per person" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
          <TextInput label="Travel radius (miles)" type="number" value={travelRadius} onChange={(e) => setTravelRadius(e.target.value)} />
        </div>

        <div className="edit-itinerary-modal__field">
          <label htmlFor="edit-transport">Transport</label>
          <select
            id="edit-transport"
            value={transport}
            onChange={(e) => setTransport(e.target.value)}
          >
            <option value="">No preference</option>
            {TRANSPORT_OPTIONS.map((mode) => (
              <option key={mode} value={mode}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {error && <ErrorMessage message={error} />}

        <div className="edit-itinerary-modal__actions">
          <button type="button" className="action-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="next-button" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default EditItineraryModal
