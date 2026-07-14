import SectionHeader from '../../../components/SectionHeader/SectionHeader.jsx'
import CardCarousel from '../../../components/CardCarousel/CardCarousel.jsx'
import './ExploreSection.css'

function ExploreSection() {
  return (
    <section className="explore-section">
      <SectionHeader title="Explore" />
      <CardCarousel itineraries={[]} />
    </section>
  );
}

export default ExploreSection;
