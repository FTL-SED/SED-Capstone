import './WrittenItinerary.css'
import { useState } from 'react'
import PinName from '../PinName/PinName.jsx'
import PinTiming from '../PinTiming/PinTiming.jsx'
import PinCost from '../PinCost/PinCost.jsx'
import PinAddress from '../PinAddress/PinAddress.jsx'
import AddStopPanel from '../AddStopPanel/AddStopPanel.jsx'

// Pin.startTime/endTime are ISO datetimes stored in Pacific wall-clock; show
// just the HH:MM in that zone.
function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles',
  });
}

// A meal badge if the stop was tagged breakfast/lunch/dinner (persist.js folds
// mealType into the pin's tags).
const MEALS = ['breakfast', 'lunch', 'dinner'];
function mealOf(tags = []) {
  return tags.find((t) => MEALS.includes(t));
}

// A stop's remove control: a trash button that flips to an inline "Remove?"
// confirm so a delete always takes two deliberate clicks (never one).
function RemoveStopControl({ onConfirm }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="timeline-stop__confirm">
        <span>Remove?</span>
        <button type="button" className="timeline-stop__confirm-yes" onClick={onConfirm}>
          Remove
        </button>
        <button type="button" className="timeline-stop__confirm-no" onClick={() => setConfirming(false)}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="timeline-stop__remove"
      aria-label="Remove stop"
      onClick={() => setConfirming(true)}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 6h18" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    </button>
  );
}

// Wanderlog-style vertical timeline: a numbered node per stop connected by a
// line, each with the stop's details. Reuses the Pin* display components. In
// edit mode each stop gets a remove control and an add-a-stop panel appears.
function WrittenItinerary({ pins = [], editMode = false, onRemoveStop, onAddStop }) {
  if (pins.length === 0) {
    return (
      <div className="written-itinerary">
        <p className="written-itinerary__empty">No stops in this itinerary yet.</p>
        {editMode && <AddStopPanel onAddStop={onAddStop} />}
      </div>
    );
  }

  return (
    <>
      <ol className="written-itinerary">
        {pins.map((pin, i) => {
          const meal = mealOf(pin.tags);
          return (
            <li key={pin.stopId ?? pin.id ?? pin.orderInItinerary} className="timeline-stop">
              <div className="timeline-stop__rail">
                <span className="timeline-stop__num">{i + 1}</span>
                {i < pins.length - 1 && <span className="timeline-stop__line" />}
              </div>

              <div className="timeline-stop__card">
                <div className="timeline-stop__head">
                  <PinName name={pin.name} />
                  {meal && <span className="timeline-stop__meal">{meal}</span>}
                  {editMode && pin.stopId != null && (
                    <RemoveStopControl onConfirm={() => onRemoveStop(pin.stopId)} />
                  )}
                </div>
                <PinTiming startTime={formatTime(pin.startTime)} endTime={formatTime(pin.endTime)} />
                {pin.address && <PinAddress address={pin.address} />}
                {pin.description && <p className="timeline-stop__desc">{pin.description}</p>}
                <PinCost cost={pin.pricePerPerson} />
              </div>
            </li>
          );
        })}
      </ol>
      {editMode && <AddStopPanel onAddStop={onAddStop} />}
    </>
  );
}

export default WrittenItinerary;
