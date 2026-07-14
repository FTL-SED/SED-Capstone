import './RecentItinerariesSection.css'
import SectionHeader from '../../../components/SectionHeader/SectionHeader.jsx'
import ItinerariesGrid from '../../../components/ItinerariesGrid/ItinerariesGrid.jsx'
import LoadMoreButton from '../../../components/LoadMoreButton/LoadMoreButton.jsx'

function RecentItinerariesSection() {
  return (
    <section>
      <SectionHeader title="Recent Itineraries" />
      <ItinerariesGrid itineraries={[]} />
      <LoadMoreButton />
    </section>
  );
}

export default RecentItinerariesSection;
