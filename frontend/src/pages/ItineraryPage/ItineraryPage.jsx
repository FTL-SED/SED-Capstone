import './ItineraryPage.css'
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import ItineraryPanel from './ItineraryPanel/ItineraryPanel.jsx'
import MapView from './MapView/MapView.jsx'
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage.jsx'
import { getItinerary } from '../../api/itinerary.js'

// Fetches the itinerary by the :id route param and renders it. This is where a
// generated itinerary lands after the Create-Itinerary wizard finishes.
// See .claude/roadmap/frontend-backend-integration.md (Step 9).
function ItineraryPage() {
  const { id } = useParams();
  const [itinerary, setItinerary] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // No synchronous setState here — only the async callbacks touch state, so
    // the fetch never triggers a cascading render (react-hooks rule).
    getItinerary(id)
      .then((data) => {
        if (!active) return;
        setItinerary(data);
        setError('');
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.error || 'Could not load this itinerary.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <div className="itinerary-page itinerary-page--message"><p>Loading itinerary…</p></div>;
  if (error) return <div className="itinerary-page itinerary-page--message"><ErrorMessage message={error} /></div>;
  if (!itinerary) return null;

  // A true split: the scrolling panel (title, actions, timeline) on the left and
  // the map on the right, together filling the space between nav and footer.
  return (
    <div className="itinerary-page">
      <ItineraryPanel
        pins={itinerary.pins}
        title={itinerary.title}
        description={itinerary.description}
        author={itinerary.creator?.username}
      />
      <MapView pins={itinerary.pins} />
    </div>
  );
}

export default ItineraryPage;
