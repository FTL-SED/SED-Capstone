import './Title.css'

// The itinerary title. Read-only by default; when `editing`, an owner edits it
// via a bound text input (value/onChange come from ItineraryPanel's draft state).
function Title({ text, editing = false, value, onChange }) {
  if (editing) {
    return (
      <input
        type="text"
        className="itinerary-title itinerary-title--editing"
        aria-label="Itinerary title"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Title"
      />
    );
  }
  return (
    <h1 className="itinerary-title">{text || "TITLE"}</h1>
  );
}

export default Title;
