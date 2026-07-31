import './ItineraryPage.css'
import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import ItineraryPanel from './ItineraryPanel/ItineraryPanel.jsx'
import MapView from './MapView/MapView.jsx'
import ExportModal from './ExportModal/ExportModal.jsx'
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage.jsx'
import LoadingSection from '../LoadingPage/LoadingSection/LoadingSection.jsx'
import { useLikeBookmark } from '../../hooks/useLikeBookmark.js'
import {
  getItinerary,
  deleteItinerary,
  copyItinerary,
  addStop,
  deleteStop,
  updateStop,
  updateItinerary,
  uploadItineraryCover,
  deleteItineraryCover,
  reorderStops,
  emailItinerary,
} from '../../api/itinerary.js'
import { getCurrentUser } from '../../lib/currentUser.js'
import { buildItinerarySummaryText } from '../../utils/itinerarySummary.js'

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // The itinerary itself is a cached query keyed by id, so revisiting it (e.g.
  // bouncing back from Discover) is instant. The optimistic edits below write
  // straight into this cache via setQueryData instead of local state.
  const itineraryKey = ['itinerary', id];
  const { data: itinerary, isLoading: loading, error: queryError } = useQuery({
    queryKey: itineraryKey,
    queryFn: () => getItinerary(id),
  });
  const error = queryError
    ? queryError.response?.data?.error || 'Could not load this itinerary.'
    : '';
  // Guards against double-firing the delete/copy network calls on rapid clicks.
  const [actionBusy, setActionBusy] = useState(false);
  // Highlights the Copy button while the copy request is in flight, so the user
  // gets immediate feedback that their click registered.
  const [copied, setCopied] = useState(false);
  // Privacy toggle sync: like the hook's like/bookmark loop, we track the latest
  // DESIRED public/private state and keep at most one request in flight, so rapid
  // clicks feel instant and always converge to the last click. { desired, running }.
  const privacySync = useRef({ desired: false, running: false });

  const currentUserId = getCurrentUser()?.id;
  const numId = Number(id);

  // Like/bookmark/visited membership, the shared like-count map, and race-safe
  // toggling all live in the shared hook, which owns the ['dashboard', id] cache
  // — the SAME sources of truth as Home and Discover, so a toggle here shows up
  // there (count included) and vice versa. We DERIVE this page's flags AND its
  // count from those shared caches rather than tracking our own.
  const {
    likedIds,
    bookmarkedIds,
    visitedIds,
    likeCounts,
    toggleLike,
    toggleBookmark,
    toggleVisited,
  } = useLikeBookmark({ userId: currentUserId });
  const liked = likedIds.has(numId);
  const bookmarked = bookmarkedIds.has(numId);
  const visited = visitedIds.has(numId);
  // The shared override wins over the fetched itinerary's baked-in count.
  const likeCount = likeCounts?.[numId] ?? itinerary?.likeCount ?? 0;

  // Optimistically patch the cached itinerary. Returns the previous value so a
  // failed request can roll back to it.
  const patchItinerary = (updater) => {
    const previous = queryClient.getQueryData(itineraryKey);
    queryClient.setQueryData(itineraryKey, (prev) => (prev ? updater(prev) : prev));
    return previous;
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
    setCopied(true);
    try {
      const copy = await copyItinerary(id);
      navigate(`/itinerary/${copy.id}`);
    } catch (err) {
      console.error('Copy failed:', err);
      setActionBusy(false);
      setCopied(false);
      window.alert('Could not save a copy. Please try again.');
    }
  };

  // Owner-only: remove a stop from the itinerary. Optimistic — drop it from the
  // timeline (and map) immediately, then DELETE; on failure, put it back.
  const handleRemoveStop = async (stopId) => {
    const previous = patchItinerary((prev) => ({
      ...prev,
      pins: prev.pins.filter((p) => p.stopId !== stopId),
    }));
    try {
      await deleteStop(stopId);
    } catch (err) {
      console.error('Remove stop failed, reverting:', err);
      queryClient.setQueryData(itineraryKey, previous);
      window.alert('Could not remove that stop. Please try again.');
    }
  };

  // Owner-only: edit a stop's scheduled time. Optimistic — patch the stop's
  // start/end in place immediately, then PUT; on failure, restore the old times.
  // Only the ItineraryStop's timing changes — the venue Pin is never touched.
  const handleEditStop = async (stopId, { startTime, endTime }) => {
    const previous = patchItinerary((prev) => ({
      ...prev,
      pins: prev.pins.map((p) => (p.stopId === stopId ? { ...p, startTime, endTime } : p)),
    }));
    try {
      await updateStop(stopId, { startTime, endTime });
    } catch (err) {
      console.error('Edit stop time failed, reverting:', err);
      queryClient.setQueryData(itineraryKey, previous);
      window.alert(err.response?.data?.error || 'Could not update the time. Please try again.');
    }
  };

  // Owner-only: edit a stop's per-person cost. Optimistic — patch the stop's
  // price in place immediately, then PUT the ItineraryStop's `costPerPerson`
  // override (the shared venue Pin is never touched). The server recomputes the
  // itinerary's maxBudgetPerPerson from the sum of stop costs, so we refetch to
  // pick up the new budget; on failure we roll back to the pre-edit cache.
  const handleEditCost = async (stopId, costPerPerson) => {
    const previous = patchItinerary((prev) => ({
      ...prev,
      pins: prev.pins.map((p) =>
        p.stopId === stopId ? { ...p, pricePerPerson: costPerPerson, costPerPerson } : p,
      ),
    }));
    try {
      await updateStop(stopId, { costPerPerson });
      // Refetch so the server-recalculated per-person budget is reflected.
      const refreshed = await getItinerary(id);
      queryClient.setQueryData(itineraryKey, refreshed);
    } catch (err) {
      console.error('Edit stop cost failed, reverting:', err);
      queryClient.setQueryData(itineraryKey, previous);
      window.alert(err.response?.data?.error || 'Could not update the cost. Please try again.');
    }
  };

  // Drain loop: keep sending until the last request we sent matches the user's
  // latest desired public/private state (they may click again mid-flight), with
  // at most one request in flight so concurrent toggles can't race at the DB.
  const syncPrivacy = async () => {
    const state = privacySync.current;
    if (state.running) return;
    state.running = true;
    try {
      let sent;
      while (state.desired !== sent) {
        sent = state.desired;
        await updateItinerary(id, { isPublic: sent });
      }
    } catch (err) {
      console.error('Privacy toggle failed, reverting:', err);
      // Roll the cache back to whatever the server last confirmed (state.desired
      // never applied), so the toggle never lies.
      patchItinerary((prev) => ({ ...prev, isPublic: !state.desired }));
      window.alert('Could not change the privacy setting. Please try again.');
    } finally {
      state.running = false;
    }
  };

  // Owner-only: flip the itinerary between public and private. Optimistic — flip
  // the cached value immediately (so the click feels instant), record the latest
  // desired state, then converge the server in the background.
  const handleTogglePrivacy = () => {
    const desired = !itinerary.isPublic;
    patchItinerary((prev) => ({ ...prev, isPublic: desired }));
    privacySync.current.desired = desired;
    syncPrivacy();
  };

  // Owner-only: save inline edits to the itinerary's own metadata (title,
  // description, budget, and optionally a new cover — or removing the cover).
  // NOT optimistic — a cover upload is async and can fail, so we keep the panel
  // in edit mode and only commit state on success. Coordinated: upload/remove the
  // cover first (if requested) so its URL lands, then PUT the text fields, then
  // merge both results. Guarded by actionBusy against a double-click. Returns true
  // on success so the panel knows whether to close the editor.
  const handleEditItinerary = async (changes, coverFile, coverRemoved) => {
    if (actionBusy) return false;
    setActionBusy(true);
    try {
      // A newly picked file wins over a staged removal.
      if (coverFile) {
        const withCover = await uploadItineraryCover(id, coverFile);
        patchItinerary((prev) => ({ ...prev, coverImageUrl: withCover.coverImageUrl }));
      } else if (coverRemoved) {
        await deleteItineraryCover(id);
        patchItinerary((prev) => ({ ...prev, coverImageUrl: null }));
      }
      const updated = await updateItinerary(id, changes);
      patchItinerary((prev) => ({
        ...prev,
        title: updated.title,
        description: updated.description,
        maxBudgetPerPerson: updated.maxBudgetPerPerson,
      }));
      return true;
    } catch (err) {
      console.error('Edit itinerary failed:', err);
      window.alert(err.response?.data?.error || 'Could not save your changes. Please try again.');
      return false;
    } finally {
      setActionBusy(false);
    }
  };

  // On narrow screens the split becomes a tabbed view: one of the written
  // itinerary (the panel) or the visual itinerary (the map) at a time. Defaults
  // to the written view; ignored on desktop, where both show side by side.
  const [activeTab, setActiveTab] = useState('written');

  // Whether the Export modal (ad-hoc email + copy) is open.
  const [exportOpen, setExportOpen] = useState(false);

  // Any viewer: copy the itinerary as plain text. Uses the Clipboard API with a
  // hidden-textarea fallback for non-HTTPS / older browsers.
  const handleCopyText = async () => {
    const text = buildItinerarySummaryText(itinerary)
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch (err) {
      console.error('Copy failed:', err)
      window.alert('Could not copy. Here is the text:\n\n' + text)
    }
  }

  // Email the itinerary PDF to an ad-hoc list of addresses typed in the export
  // modal. Returns the raw { sent, failed } result; the modal renders the status.
  const handleEmail = async (emails) => emailItinerary(id, emails)

  // Owner-only: add a catalog venue as a new stop, appended at the end. The
  // backend has no auto-scheduler, so we assign the next order slot and default
  // times (right after the last stop, 90-min visit) which the user can adjust.
  const handleAddStop = async (venue) => {
    const pins = itinerary.pins ?? [];
    const nextOrder = pins.length > 0 ? Math.max(...pins.map((p) => p.orderInItinerary ?? 0)) + 1 : 0;
    const DEFAULT_VISIT_MIN = 90;
    const lastEnd = pins.length > 0 ? pins[pins.length - 1].endTime : null;
    const start = lastEnd ? new Date(lastEnd) : new Date();
    const end = new Date(start.getTime() + DEFAULT_VISIT_MIN * 60 * 1000);
    try {
      const stop = await addStop({
        itineraryId: Number(id),
        pinId: venue.id,
        orderInItinerary: nextOrder,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      // Refetch to get the authoritative flattened pin shape (stopId, tags, etc.)
      // rather than reconstruct the reshape on the client.
      const refreshed = await getItinerary(id);
      queryClient.setQueryData(itineraryKey, refreshed);
      return stop;
    } catch (err) {
      console.error('Add stop failed:', err);
      window.alert(err.response?.data?.error || 'Could not add that stop. Please try again.');
      return null;
    }
  };

  // Owner-only: reorder stops by drag. Optimistic — reorder the cached pins
  // immediately, then PUT the new id order. The backend recomputes times/travel
  // and returns the authoritative itinerary; on failure we roll back to the
  // pre-drag cache. Uses setQueryData (NOT the stale setItinerary) per the
  // React Query cache model.
  const handleReorderStops = async (stopIds) => {
    const previous = patchItinerary((prev) => {
      const byId = new Map(prev.pins.map((p) => [p.stopId, p]));
      return { ...prev, pins: stopIds.map((sid) => byId.get(sid)).filter(Boolean) };
    });
    try {
      const updated = await reorderStops(id, stopIds);
      queryClient.setQueryData(itineraryKey, updated);
    } catch (err) {
      console.error('Reorder stops failed, reverting:', err);
      queryClient.setQueryData(itineraryKey, previous);
      window.alert(err.response?.data?.error || 'Could not reorder the stops. Please try again.');
    }
  };

  if (loading) return (
    <div className="itinerary-page itinerary-page--message">
      <CreateScene />
      <LoadingSection text="Loading your itinerary" />
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

  // Owner-only meeting point + optional travel radius drive the Add Stop distance
  // filter and the map's radius circle. Both must be present/positive to apply;
  // otherwise the UI degrades to its no-radius behavior.
  const meetingPoint =
    typeof itinerary.meetingPointLat === 'number' && typeof itinerary.meetingPointLng === 'number'
      ? { lat: itinerary.meetingPointLat, lng: itinerary.meetingPointLng }
      : null;
  const radiusMi = typeof itinerary.travelRadius === 'number' && itinerary.travelRadius > 0
    ? itinerary.travelRadius
    : null;

  // A true split: the scrolling panel (title, actions, timeline) on the left and
  // the map on the right, together filling the space between nav and footer.
  // On narrow screens (see ItineraryPage.css) the two collapse into a tabbed
  // view; the `--tab-*` modifier below drives which pane is visible there.
  return (
    <div className={`itinerary-page itinerary-page--tab-${activeTab}`}>
      <ItineraryPanel
        isOwner={isOwner}
        pins={itinerary.pins}
        maxBudgetPerPerson={itinerary.maxBudgetPerPerson}
        title={itinerary.title}
        description={itinerary.description}
        author={itinerary.creator?.username}
        coverImageUrl={itinerary.coverImageUrl}
        liked={liked}
        bookmarked={bookmarked}
        likeCount={likeCount}
        isPublic={itinerary.isPublic}
        visited={visited}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onToggleLike={() => toggleLike(numId, { id: numId, likeCount })}
        onToggleBookmark={() => toggleBookmark(numId, itinerary)}
        onTogglePrivacy={handleTogglePrivacy}
        onDelete={handleDelete}
        onCopy={handleCopy}
        copied={copied}
        onMarkVisited={() => toggleVisited(numId, itinerary)}
        onExport={() => setExportOpen(true)}
        onRemoveStop={handleRemoveStop}
        onEditStop={handleEditStop}
        onEditCost={handleEditCost}
        onAddStop={handleAddStop}
        meetingPoint={meetingPoint}
        radiusMi={radiusMi}
        onReorderStops={handleReorderStops}
        onEditItinerary={handleEditItinerary}
        actionBusy={actionBusy}
      />
      <MapView pins={itinerary.pins} meetingPoint={meetingPoint} radiusMi={radiusMi} />
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onSend={handleEmail}
        onCopy={handleCopyText}
      />
    </div>
  );
}

export default ItineraryPage;
