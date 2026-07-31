import './PinCost.css'
import { useState } from 'react'

// A stop's per-person cost. Read-only by default; when `editable`, a pencil
// reveals a number input with save/cancel — the same inline pattern as PinTiming.
// Editing sets the ItineraryStop's own `costPerPerson` (never the shared venue
// Pin), and the server recomputes the itinerary's per-person budget from the sum
// of every stop's cost. `cost` is the stop's effective per-person price.
// `controlProps` (owner mode) is spread onto every interactive control so a
// click/keypress here stops propagating to the draggable card (never starts a
// drag). Undefined for the read-only viewer path.
function PinCost({ cost, editable = false, stopId, onEditCost, controlProps }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const beginEdit = () => {
    setDraft(cost != null ? String(cost) : '');
    setError('');
    setEditing(true);
  };

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      setError('Cost is required.');
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) {
      setError('Cost must be a non-negative number.');
      return;
    }
    setEditing(false);
    onEditCost(stopId, n);
  };

  if (editable && editing) {
    return (
      <div className="pin-cost pin-cost--editing">
        <div className="pin-cost__inputs">
          <span className="pin-cost__prefix" aria-hidden="true">$</span>
          <input
            type="number"
            min="0"
            step="1"
            className="pin-cost__input"
            aria-label="Cost per person"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            {...controlProps}
          />
          <span className="pin-cost__suffix">per person</span>
          <button type="button" className="pin-cost__save" onClick={save} {...controlProps}>
            Save
          </button>
          <button type="button" className="pin-cost__cancel" onClick={() => setEditing(false)} {...controlProps}>
            Cancel
          </button>
        </div>
        {error && <span className="pin-cost__error">{error}</span>}
      </div>
    );
  }

  return (
    <p className="pin-cost">
      ${cost} per person
      {editable && stopId != null && (
        <button
          type="button"
          className="pin-cost__edit"
          aria-label="Edit cost"
          onClick={beginEdit}
          {...controlProps}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
      )}
    </p>
  );
}

export default PinCost;
