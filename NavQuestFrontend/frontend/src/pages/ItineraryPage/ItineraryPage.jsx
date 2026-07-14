import './ItineraryPage.css'
import ItineraryHeader from './ItineraryHeader/ItineraryHeader.jsx'
import ItineraryPanel from './ItineraryPanel/ItineraryPanel.jsx'
import MapView from './MapView/MapView.jsx'

function ItineraryPage() {
  return (
    <div className="itinerary-page">
      <ItineraryHeader />
      <div className="itinerary-page__body">
        <ItineraryPanel />
        <MapView />
      </div>
    </div>
  );
}

export default ItineraryPage;
