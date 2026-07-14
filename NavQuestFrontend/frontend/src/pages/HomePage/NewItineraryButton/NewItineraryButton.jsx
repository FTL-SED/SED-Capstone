import { Link } from 'react-router-dom'
import './NewItineraryButton.css'

function NewItineraryButton() {
  return (
    <Link to="/create" className="new-itinerary-button">
      <button className="new-itinerary-button__btn">New Trip</button>
    </Link>
  );
}

export default NewItineraryButton;
