import './ItinerariesGrid.css'
import ItineraryCard from '../ItineraryCard/ItineraryCard.jsx'

// How many pulsing placeholders to show on the first load — fills three rows of
// the 4-column grid so the page has a full skeleton instead of a blank gap.
const PLACEHOLDER_COUNT = 12;

function ItinerariesGrid({ itineraries = [], loading = false }) {
  return (
    <div className="itineraries-grid">
      {loading
        ? Array.from({ length: PLACEHOLDER_COUNT }).map((_, i) => (
            <div key={i} className="itinerary-card itinerary-card--placeholder" />
          ))
        : itineraries.map((itinerary) => (
            <ItineraryCard key={itinerary.id} itinerary={itinerary} />
          ))}
    </div>
  );
}

export default ItinerariesGrid;
