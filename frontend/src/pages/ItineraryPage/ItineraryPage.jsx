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

// While the itinerary is being fetched (and if the fetch fails) the page shows
// the same golden-hour city scene the traveller saw on the Create + Loading
// screens, so arriving at a finished itinerary feels like a continuation of
// that same view. The scene markup + class names are shared with
// CreateItineraryPage / LoadingPage; the warm tokens they read are re-declared
// on .itinerary-page--message in ItineraryPage.css.
const SIDEWALK_TOP = 720;
const CITY_BUILDINGS = [
  { x: 0,    w: 118, h: 520, shade: "#7c7c7c" },
  { x: 124,  w: 92,  h: 660, shade: "#6c6c6c" },
  { x: 222,  w: 108, h: 470, shade: "#868686" },
  { x: 336,  w: 78,  h: 600, shade: "#727272" },
  { x: 420,  w: 132, h: 720, shade: "#646464" },
  { x: 558,  w: 96,  h: 500, shade: "#7e7e7e" },
  { x: 660,  w: 116, h: 620, shade: "#6e6e6e" },
  { x: 782,  w: 84,  h: 450, shade: "#808080" },
  { x: 872,  w: 126, h: 680, shade: "#6a6a6a" },
  { x: 1004, w: 100, h: 540, shade: "#767676" },
  { x: 1110, w: 90,  h: 720, shade: "#5f5f5f" },
  { x: 1206, w: 118, h: 480, shade: "#7c7c7c" },
  { x: 1330, w: 110, h: 620, shade: "#6e6e6e" },
];

/* A clean grid of windows for one building: exactly two windows per row, evenly
 * spread across the width, with a clear gap between each row. Most are warm and
 * lit; a deterministic scattering are left dark for a lived-in look — but never
 * two dark windows on the same row, so each row always keeps at least one lit. */
function buildingWindows(b) {
  const cols = 2;
  const winW = 16;
  const winH = 18;
  const rowGap = 16;        // vertical space between rows
  const roofGap = 26;       // space below the roof before the first row
  const rowStride = winH + rowGap;
  const rows = Math.max(1, Math.floor((b.h - roofGap) / rowStride));
  const colStride = b.w / (cols + 1); // even horizontal distribution
  const topY = SIDEWALK_TOP - b.h + roofGap;
  const windows = [];
  for (let r = 0; r < rows; r += 1) {
    // On some rows one window is dark; `darkCol` is which one (or -1 for none).
    // Deterministic from the building x + row so it stays stable across renders.
    const seed = b.x + r * 7;
    const darkCol = seed % 3 === 0 ? seed % cols : -1;
    for (let c = 0; c < cols; c += 1) {
      const isDark = c === darkCol;
      windows.push(
        <rect
          key={`${b.x}-${r}-${c}`}
          className={`create-building__window${isDark ? ' create-building__window--dark' : ''}`}
          x={b.x + colStride * (c + 1) - winW / 2}
          y={topY + r * rowStride}
          width={winW}
          height={winH}
        />
      );
    }
  }
  return windows;
}

// The fixed golden-hour sky + city scene, identical to the Create + Loading
// pages. Kept local so both the loading and error message states sit above it.
function CreateScene() {
  return (
    <div className="create-scene" aria-hidden="true">
      {/* Golden-hour sky, carried over from the Create scene for continuity */}
      <svg
        className="create-scene__sky"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
      >
        <defs>
          <linearGradient id="itinerarySky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F3E7CE" />
            <stop offset="45%" stopColor="#F6EBD6" />
            <stop offset="78%" stopColor="#F7E2C4" />
            <stop offset="100%" stopColor="#F4D3A6" />
          </linearGradient>
          <radialGradient id="itinerarySun" cx="80%" cy="16%" r="46%">
            <stop offset="0%" stopColor="#fbe6c4" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#fbe6c4" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="1440" height="900" fill="url(#itinerarySky)" />
        <rect x="0" y="0" width="1440" height="900" fill="url(#itinerarySun)" />
      </svg>

      {/* A very simple city: a full-width row of flat grey buildings standing
          on a straight sidewalk rectangle, with a street below where one small
          car drives the length of the block and wraps back to the left. */}
      <svg
        className="create-scene__city"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
        role="presentation"
      >
        <g className="create-city__buildings">
          {CITY_BUILDINGS.map((b) => (
            <g key={b.x}>
              <rect
                className="create-building__body"
                x={b.x}
                y={SIDEWALK_TOP - b.h}
                width={b.w}
                height={b.h}
                fill={b.shade}
              />
              {buildingWindows(b)}
            </g>
          ))}
        </g>

        {/* The sidewalk — a straight rectangle spanning the full width */}
        <rect
          className="create-city__sidewalk"
          x="0"
          y={SIDEWALK_TOP}
          width="1440"
          height="60"
        />

        {/* The street below the sidewalk, with a dashed centre line */}
        <rect className="create-city__street" x="0" y="780" width="1440" height="120" />
        <path className="create-city__lane" d="M0,842 L1440,842" fill="none" />

        {/* Small flat car driving along the street, wrapping back to the left. */}
        <g className="create-city__car-track">
          <g className="create-city__car" transform="translate(0,772) scale(1.6)">
            <rect className="create-car__body" x="3" y="12" width="58" height="15" rx="6" />
            <rect className="create-car__cabin" x="17" y="3" width="27" height="12" rx="4" />
            <rect className="create-car__window" x="20" y="5" width="21" height="8" rx="2" />
            <rect className="create-car__pillar" x="30" y="5" width="2.5" height="8" />
            <circle className="create-car__wheel" cx="17" cy="28" r="6.5" />
            <circle className="create-car__wheel" cx="47" cy="28" r="6.5" />
          </g>
        </g>
      </svg>
    </div>
  );
}

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

  if (loading) return (
    <div className="itinerary-page itinerary-page--message">
      <CreateScene />
      <div className="itinerary-page__message-card"><p>Loading itinerary…</p></div>
    </div>
  );
  if (error) return (
    <div className="itinerary-page itinerary-page--message">
      <CreateScene />
      <div className="itinerary-page__message-card"><ErrorMessage message={error} /></div>
    </div>
  );
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
