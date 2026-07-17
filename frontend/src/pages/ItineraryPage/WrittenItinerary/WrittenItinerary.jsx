import './WrittenItinerary.css'
import PinName from '../PinName/PinName.jsx'
import PinTiming from '../PinTiming/PinTiming.jsx'
import PinCost from '../PinCost/PinCost.jsx'
import PinAddress from '../PinAddress/PinAddress.jsx'

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

// Wanderlog-style vertical timeline: a numbered node per stop connected by a
// line, each with the stop's details. Reuses the Pin* display components.
function WrittenItinerary({ pins = [] }) {
  if (pins.length === 0) {
    return (
      <div className="written-itinerary">
        <p className="written-itinerary__empty">No stops in this itinerary yet.</p>
      </div>
    );
  }

  return (
    <ol className="written-itinerary">
      {pins.map((pin, i) => {
        const meal = mealOf(pin.tags);
        return (
          <li key={pin.id ?? pin.orderInItinerary} className="timeline-stop">
            <div className="timeline-stop__rail">
              <span className="timeline-stop__num">{i + 1}</span>
              {i < pins.length - 1 && <span className="timeline-stop__line" />}
            </div>

            <div className="timeline-stop__card">
              <div className="timeline-stop__head">
                <PinName name={pin.name} />
                {meal && <span className="timeline-stop__meal">{meal}</span>}
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
  );
}

export default WrittenItinerary;
