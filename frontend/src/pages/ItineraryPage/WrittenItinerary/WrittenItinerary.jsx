import './WrittenItinerary.css'

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

function WrittenItinerary({ pins = [] }) {
  return (
    <div className="written-itinerary">
      <h3 className="written-itinerary__label">Written Itinerary</h3>
      <ol className="written-itinerary__stops">
        {pins.map((pin) => {
          const meal = mealOf(pin.tags);
          return (
            <li key={pin.id ?? pin.orderInItinerary} className="written-itinerary__stop">
              <div className="written-itinerary__time">
                {formatTime(pin.startTime)}–{formatTime(pin.endTime)}
              </div>
              <div className="written-itinerary__details">
                <span className="written-itinerary__name">
                  {pin.name}
                  {meal && <span className="written-itinerary__meal"> · {meal}</span>}
                </span>
                {pin.description && (
                  <p className="written-itinerary__desc">{pin.description}</p>
                )}
                <span className="written-itinerary__price">
                  {pin.pricePerPerson > 0 ? `$${pin.pricePerPerson}/person` : 'Free'}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default WrittenItinerary;
