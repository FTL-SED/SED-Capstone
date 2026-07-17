import './ItineraryPage.css'
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import ItineraryPanel from './ItineraryPanel/ItineraryPanel.jsx'
import MapView from './MapView/MapView.jsx'
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage.jsx'
import {
  getItinerary,
  getUserDashboard,
  likeItinerary,
  unlikeItinerary,
  bookmarkItinerary,
  removeBookmark,
} from '../../api/itinerary.js'

// Fetches the itinerary by the :id route param and renders it. This is where a
// generated itinerary lands after the Create-Itinerary wizard finishes.
// See .claude/roadmap/frontend-backend-integration.md (Step 9).
function ItineraryPage() {
  const { id } = useParams();
  const [itinerary, setItinerary] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Like/bookmark UI state. likeCount comes from the itinerary; whether *I've*
  // liked/bookmarked it isn't in GET /itineraries/:id, so we hydrate it from my
  // dashboard (GET /users/:id) — the same source the home page uses.
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const currentUserId = currentUser?.id;

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await getItinerary(id);
        if (!active) return;
        setItinerary(data);
        setLikeCount(data.likeCount ?? 0);
        setError('');

        // Hydrate my like/bookmark state for this itinerary from my dashboard.
        // Best-effort: if it fails (e.g. signed out) the buttons just start off.
        if (currentUserId) {
          try {
            const me = await getUserDashboard(currentUserId);
            if (!active) return;
            const numId = Number(id);
            setLiked((me.likedItineraries ?? []).some((it) => it.id === numId));
            setBookmarked((me.bookmarkedItineraries ?? []).some((it) => it.id === numId));
          } catch {
            /* leave defaults */
          }
        }
      } catch (err) {
        if (active) setError(err.response?.data?.error || 'Could not load this itinerary.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [id, currentUserId]);

  // Optimistic toggle: flip the UI (and the count) immediately, call the
  // backend, and revert if it rejects so the button never lies.
  const toggleLike = () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));

    const request = wasLiked ? unlikeItinerary(id) : likeItinerary(id);
    request
      .then((res) => {
        // Backend returns the authoritative { likeCount } — trust it over our guess.
        if (res && typeof res.likeCount === 'number') setLikeCount(res.likeCount);
      })
      .catch((err) => {
        console.error('Like failed, reverting:', err);
        setLiked(wasLiked);
        setLikeCount((c) => c + (wasLiked ? 1 : -1));
      });
  };

  const toggleBookmark = () => {
    const wasBookmarked = bookmarked;
    setBookmarked(!wasBookmarked);

    const request = wasBookmarked ? removeBookmark(id) : bookmarkItinerary(id);
    request.catch((err) => {
      console.error('Bookmark failed, reverting:', err);
      setBookmarked(wasBookmarked);
    });
  };

  if (loading) return <div className="itinerary-page itinerary-page--message"><p>Loading itinerary…</p></div>;
  if (error) return <div className="itinerary-page itinerary-page--message"><ErrorMessage message={error} /></div>;
  if (!itinerary) return null;

  const isOwner = currentUserId != null && itinerary.creator?.id === currentUserId;

  // A true split: the scrolling panel (title, actions, timeline) on the left and
  // the map on the right, together filling the space between nav and footer.
  return (
    <div className="itinerary-page">
      <ItineraryPanel
        isOwner={isOwner}
        pins={itinerary.pins}
        title={itinerary.title}
        description={itinerary.description}
        author={itinerary.creator?.username}
        liked={liked}
        bookmarked={bookmarked}
        likeCount={likeCount}
        onToggleLike={toggleLike}
        onToggleBookmark={toggleBookmark}
      />
      <MapView pins={itinerary.pins} />
    </div>
  );
}

export default ItineraryPage;
