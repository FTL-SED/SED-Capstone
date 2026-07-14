import './SearchResultsSection.css'
import SectionHeader from '../../../components/SectionHeader/SectionHeader.jsx'
import ItinerariesGrid from '../../../components/ItinerariesGrid/ItinerariesGrid.jsx'
import LoadMoreButton from '../../../components/LoadMoreButton/LoadMoreButton.jsx'

function SearchResultsSection() {
  return (
    <section>
      <SectionHeader title="Search Results" />
      <ItinerariesGrid itineraries={[]} />
      <LoadMoreButton />
    </section>
  );
}

export default SearchResultsSection;
