import './ItineraryCard.css'
import { Link } from 'react-router-dom'

function ItineraryCard({ itinerary = {} }) {
  const { id, title, location } = itinerary;
  return (
    <Link to={id ? `/itinerary/${id}` : "#"}>
      <div>
        <h3>{title || "Untitled Itinerary"}</h3>
        <p>{location}</p>
      </div>
    </Link>
  );
}

export default ItineraryCard;
