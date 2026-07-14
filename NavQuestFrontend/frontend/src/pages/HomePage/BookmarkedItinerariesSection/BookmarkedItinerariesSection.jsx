import SectionHeader from '../../../components/SectionHeader/SectionHeader.jsx'
import CardCarousel from '../../../components/CardCarousel/CardCarousel.jsx'
import './BookmarkedItinerariesSection.css'

function BookmarkedItinerariesSection() {
  return (
    <section>
      <SectionHeader title="Bookmarked" />
      <CardCarousel itineraries={[]} />
    </section>
  );
}

export default BookmarkedItinerariesSection;
