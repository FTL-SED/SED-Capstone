import './ItineraryPanel.css'
import ActionBar from '../ActionBar/ActionBar.jsx'
import WrittenItinerary from '../WrittenItinerary/WrittenItinerary.jsx'

function ItineraryPanel({ isOwner, pins }) {
  return (
    <div className="itinerary-panel">
      <ActionBar isOwner={isOwner} />
      <WrittenItinerary pins={pins} />
    </div>
  );
}

export default ItineraryPanel;
