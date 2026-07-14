import './ItinerariesGrid.css'
import ItineraryCard from '../ItineraryCard/ItineraryCard.jsx'

function ItinerariesGrid({ itineraries = [] }) {
  return (
    <div>
      {itineraries.map((itinerary) => (
        <ItineraryCard key={itinerary.id} itinerary={itinerary} />
      ))}
    </div>
  );
}

export default ItinerariesGrid;
