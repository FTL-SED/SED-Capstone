import SectionHeader from '../../../components/SectionHeader/SectionHeader.jsx'
import CardCarousel from '../../../components/CardCarousel/CardCarousel.jsx'
import NewItineraryButton from '../NewItineraryButton/NewItineraryButton.jsx'
import './CreatedItinerariesSection.css'

function CreatedItinerariesSection() {
  return (
    <section className="created-section">
      <SectionHeader title="Created">
        <NewItineraryButton />
      </SectionHeader>
      <CardCarousel itineraries={[]} />
    </section>
  );
}

export default CreatedItinerariesSection;
