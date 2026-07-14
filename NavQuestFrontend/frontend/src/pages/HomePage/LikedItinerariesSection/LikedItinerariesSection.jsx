import SectionHeader from '../../../components/SectionHeader/SectionHeader.jsx'
import CardCarousel from '../../../components/CardCarousel/CardCarousel.jsx'
import './LikedItinerariesSection.css'

function LikedItinerariesSection() {
  return (
    <section className="liked-section">
      <SectionHeader title="Liked" />
      <CardCarousel itineraries={[]} />
    </section>
  );
}

export default LikedItinerariesSection;
