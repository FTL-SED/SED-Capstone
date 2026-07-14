import { Link } from 'react-router-dom'
import './NewItineraryButton.css'

function NewItineraryButton() {
  return (
    <Link to="/create"><button>New Trip</button></Link>
  );
}

export default NewItineraryButton;
