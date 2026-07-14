import './ItineraryPanel.css'
import ActionBar from '../ActionBar/ActionBar.jsx'
import WrittenItinerary from '../WrittenItinerary/WrittenItinerary.jsx'

function ItineraryPanel({ isOwner }) {
  return (
    <div>
      <ActionBar isOwner={isOwner} />
      <WrittenItinerary />
    </div>
  );
}

export default ItineraryPanel;
