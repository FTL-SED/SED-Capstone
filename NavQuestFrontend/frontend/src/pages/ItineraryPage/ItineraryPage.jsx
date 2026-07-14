import './ItineraryPage.css'
import ItineraryHeader from './ItineraryHeader/ItineraryHeader.jsx'
import ItineraryPanel from './ItineraryPanel/ItineraryPanel.jsx'
import MapView from './MapView/MapView.jsx'

function ItineraryPage() {
  return (
    <div>
      <ItineraryHeader />
      <div>
        <ItineraryPanel />
        <MapView />
      </div>
    </div>
  );
}

export default ItineraryPage;
