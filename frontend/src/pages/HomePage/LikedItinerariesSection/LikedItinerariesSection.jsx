import CardCarousel from '../../../components/CardCarousel/CardCarousel.jsx'
import './LikedItinerariesSection.css'

function LikedItinerariesSection() {
  return (
    <section className="liked-section">
      <CardCarousel title="Liked" itineraries={[]} />
    </section>
  );
}

export default LikedItinerariesSection;
