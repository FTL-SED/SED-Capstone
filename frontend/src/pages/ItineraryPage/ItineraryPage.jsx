import './ItineraryPage.css'
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  updateItinerary,
  deleteItinerary,
  copyItinerary,
} from '../../api/itinerary.js'
import { getCurrentUser } from '../../lib/currentUser.js'

// Fetches the itinerary by the :id route param and renders it. This is where a
// generated itinerary lands after the Create-Itinerary wizard finishes.
// See .claude/roadmap/frontend-backend-integration.md (Step 9).
function ItineraryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [itinerary, setItinerary] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  // Guards against double-firing the delete/copy network calls on rapid clicks.
  const [actionBusy, setActionBusy] = useState(false);

  // Like/bookmark UI state. likeCount comes from the itinerary; whether *I've*
  // liked/bookmarked it isn't in GET /itineraries/:id, so we hydrate it from my
  // dashboard (GET /users/:id) — the same source the home page uses.
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const currentUserId = getCurrentUser()?.id;

  // Like/bookmark sync: firing one request per click lets concurrent toggles
  // race at the DB, so the server's final state can disagree with the UI. Track
  // the user's latest DESIRED state and keep at most one request in flight,
  // re-sending until the server matches. { desired, running }.
  const likeSync = useRef({ desired: false, running: false });
  const bookmarkSync = useRef({ desired: false, running: false });

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
  // Drain loop: send like/unlike until the server matches the user's latest
  // desired state, with only ONE request in flight (so calls can't race at the
  // DB). Once settled, reconcile the count with the authoritative value.
  const syncLike = async () => {
    const state = likeSync.current;
    if (state.running) return;
    state.running = true;
    try {
      let sent;
      while (state.desired !== sent) {
        sent = state.desired;
        const res = sent ? await likeItinerary(id) : await unlikeItinerary(id);
        if (state.desired === sent && res && typeof res.likeCount === 'number') {
          setLikeCount(res.likeCount);
        }
      }
    } catch (err) {
      console.error('Like sync failed:', err);
    } finally {
      state.running = false;
    }
  };

  // Optimistic toggle in click order (count stays self-consistent), then
  // converge the server in the background.
  const toggleLike = () => {
    const desired = !liked;
    setLiked(desired);
    setLikeCount((c) => Math.max(0, c + (desired ? 1 : -1)));
    likeSync.current.desired = desired;
    syncLike();
  };

  // Drain loop mirroring syncLike: one request in flight, converge to desired.
  // Bookmark returns 204 (no count), so on hard failure we just revert the flag.
  const syncBookmark = async () => {
    const state = bookmarkSync.current;
    if (state.running) return;
    state.running = true;
    try {
      let sent;
      while (state.desired !== sent) {
        sent = state.desired;
        sent ? await bookmarkItinerary(id) : await removeBookmark(id);
      }
    } catch (err) {
      console.error('Bookmark sync failed, reverting:', err);
      setBookmarked(!state.desired);
    } finally {
      state.running = false;
    }
  };

  const toggleBookmark = () => {
    const desired = !bookmarked;
    setBookmarked(desired);
    bookmarkSync.current.desired = desired;
    syncBookmark();
  };

  // Owner-only: delete this itinerary after confirming, then go home.
  const handleDelete = async () => {
    if (actionBusy) return;
    if (!window.confirm('Delete this itinerary? This cannot be undone.')) return;
    setActionBusy(true);
    try {
      await deleteItinerary(id);
      navigate('/home');
    } catch (err) {
      console.error('Delete failed:', err);
      setActionBusy(false);
      window.alert('Could not delete this itinerary. Please try again.');
    }
  };

  // Any viewer: save an editable copy owned by me, then open it.
  const handleCopy = async () => {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      const copy = await copyItinerary(id);
      navigate(`/itinerary/${copy.id}`);
    } catch (err) {
      console.error('Copy failed:', err);
      setActionBusy(false);
      window.alert('Could not save a copy. Please try again.');
    }
  };

  // Owner-only: edit the itinerary's title/description via a simple prompt, then
  // reflect the saved values (only the scalar fields are editable server-side).
  const handleEdit = async () => {
    if (actionBusy) return;
    const nextTitle = window.prompt('Itinerary title:', itinerary.title);
    if (nextTitle === null) return;
    if (nextTitle.trim() === '') {
      window.alert('Title cannot be empty.');
      return;
    }
    const nextDescription = window.prompt(
      'Description (leave blank to clear):',
      itinerary.description ?? '',
    );
    if (nextDescription === null) return;
    setActionBusy(true);
    try {
      const updated = await updateItinerary(id, {
        title: nextTitle.trim(),
        description: nextDescription.trim() === '' ? null : nextDescription.trim(),
      });
      setItinerary((prev) => ({ ...prev, title: updated.title, description: updated.description }));
    } catch (err) {
      console.error('Edit failed:', err);
      window.alert('Could not save changes. Please try again.');
    } finally {
      setActionBusy(false);
    }
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
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCopy={handleCopy}
      />
      <MapView pins={itinerary.pins} />
    </div>
  );
}

export default ItineraryPage;
