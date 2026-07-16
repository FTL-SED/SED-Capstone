import CardCarousel from '../../../components/CardCarousel/CardCarousel.jsx'
import './BookmarkedItinerariesSection.css'

function BookmarkedItinerariesSection() {
  return (
    <section className="bookmarked-section">
      <CardCarousel title="Bookmarked" itineraries={[]} />
    </section>
  );
}

export default BookmarkedItinerariesSection;
