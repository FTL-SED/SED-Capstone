import './Description.css'

// The itinerary description. Read-only by default; when `editing`, an owner edits
// it via a bound textarea (value/onChange come from ItineraryPanel's draft state).
function Description({ text, editing = false, value, onChange }) {
  if (editing) {
    return (
      <textarea
        className="itinerary-description itinerary-description--editing"
        aria-label="Itinerary description"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Description"
        rows={3}
      />
    );
  }
  return (
    <p className="itinerary-description">{text || "description"}</p>
  );
}

export default Description;
