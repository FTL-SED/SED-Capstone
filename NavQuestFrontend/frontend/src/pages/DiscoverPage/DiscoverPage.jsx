import './DiscoverPage.css'
import { useState } from 'react'
import SearchBar from './SearchBar/SearchBar.jsx'
import SearchResultsSection from './SearchResultsSection/SearchResultsSection.jsx'
import RecentItinerariesSection from './RecentItinerariesSection/RecentItinerariesSection.jsx'

function DiscoverPage() {
  const [query, setQuery] = useState("");

  return (
    <div className="discover-page">
      <SearchBar value={query} onChange={(e) => setQuery(e.target.value)} />
      {query ? <SearchResultsSection /> : <RecentItinerariesSection />}
    </div>
  );
}

export default DiscoverPage;
