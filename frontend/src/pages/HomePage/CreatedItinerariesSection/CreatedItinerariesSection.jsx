import CardCarousel from '../../../components/CardCarousel/CardCarousel.jsx'
import NewItineraryButton from '../NewItineraryButton/NewItineraryButton.jsx'
import './CreatedItinerariesSection.css'

function CreatedItinerariesSection() {
  return (
    <section className="created-section">
      <CardCarousel title="Created" headerAction={<NewItineraryButton />} itineraries={[]} />
    </section>
  );
}

export default CreatedItinerariesSection;
