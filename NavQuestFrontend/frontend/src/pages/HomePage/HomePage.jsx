import ExploreSection from './ExploreSection/ExploreSection.jsx'
import CreatedItinerariesSection from './CreatedItinerariesSection/CreatedItinerariesSection.jsx'
import LikedItinerariesSection from './LikedItinerariesSection/LikedItinerariesSection.jsx'
import BookmarkedItinerariesSection from './BookmarkedItinerariesSection/BookmarkedItinerariesSection.jsx'
import './HomePage.css'

function HomePage() {
  return (
    <div>
      <ExploreSection />
      <CreatedItinerariesSection />
      <LikedItinerariesSection />
      <BookmarkedItinerariesSection />
    </div>
  );
}

export default HomePage;
