import './LoadingPage.css'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import LoadingSection from './LoadingSection/LoadingSection.jsx'
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage.jsx'
import BackButton from '../../components/Inputs/BackButton/BackButton.jsx'
import { buildRecommendationBody } from '../CreateItineraryPage/buildRequest.js'
import { getRecommendations, generateItinerary } from '../../api/itinerary.js'

// One loading screen for the whole generation. It receives the wizard `form`
// via router state, runs recommend + generate as a single phase, then navigates
// to the finished itinerary. Both API calls happen here so the user sees one
// spinner instead of an inline two-phase button on the wizard.

// The Loading page carries over the exact golden-hour sky + city scene the
// traveller was looking at on the Create page, so generation feels like a
// seamless continuation of that same view rather than a jump to a new screen.
// The scene markup + class names are shared with CreateItineraryPage; the warm
// design tokens they read are (re)defined on .loading-page in LoadingPage.css.
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

// The fixed golden-hour sky + city scene, identical to the Create page. Kept as
// a small local component so both the loading and error states sit above it.
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
          <linearGradient id="loadingSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F3E7CE" />
            <stop offset="45%" stopColor="#F6EBD6" />
            <stop offset="78%" stopColor="#F7E2C4" />
            <stop offset="100%" stopColor="#F4D3A6" />
          </linearGradient>
          <radialGradient id="loadingSun" cx="80%" cy="16%" r="46%">
            <stop offset="0%" stopColor="#fbe6c4" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#fbe6c4" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="1440" height="900" fill="url(#loadingSky)" />
        <rect x="0" y="0" width="1440" height="900" fill="url(#loadingSun)" />
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
        {/* Buildings — grey blocks of varying height, each seated on the
            sidewalk, with a grid of warm lit windows (see CITY_BUILDINGS). */}
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

        {/* Small flat car driving along the street. The outer track slides the
            car from off-screen left to off-screen right and wraps; the inner
            group positions it on the street and scales it up a touch. */}
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

function LoadingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const form = location.state?.form;
  const [error, setError] = useState('');

  useEffect(() => {
    // Opened directly without a form (e.g. refresh) — nothing to generate.
    if (!form) {
      navigate('/create', { replace: true });
      return;
    }

    let active = true;
    (async () => {
      try {
        // Reuse the same members mapping the recommendation body uses, so the
        // group we persist matches the group the plan was built for.
        const recommendationBody = buildRecommendationBody(form);
        const { shortlist, constraints, reason } = await getRecommendations(recommendationBody);
        if (!active) return;

        if (!shortlist || shortlist.length === 0) {
          setError(reason || 'No places matched your trip. Try widening your budget or radius.');
          return;
        }

        const result = await generateItinerary({
          shortlist,
          constraints,
          // Persist the calendar day + the group so the saved itinerary is
          // self-describing and editable (an empty date is omitted, not sent).
          tripDate: form.tripDate || undefined,
          members: recommendationBody.members,
          isPublic: form.isPublic,
          title: form.title,
          description: form.description,
        });
        if (!active) return;

        if (result.feasible === false) {
          setError(result.reason || 'No itinerary fits these constraints. Try adjusting your trip.');
          return;
        }

        navigate(`/itinerary/${result.itinerary.id}`, { replace: true });
      } catch (err) {
        if (!active) return;
        if (err.code === 'ECONNABORTED') {
          setError('This is taking longer than expected. Please try again.');
        } else if (err.response?.status === 401) {
          setError('Your session expired. Please log in and try again.');
        } else {
          setError(err.response?.data?.error || 'Something went wrong generating your itinerary. Please try again.');
        }
      }
    })();

    return () => {
      active = false;
    };
    // form comes from navigation state and doesn't change while mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="loading-page">
        <CreateScene />
        <div className="loading-page__card">
          <div className="loading-page__error">
            <ErrorMessage message={error} />
            <BackButton onClick={() => navigate('/create', { state: { form } })} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="loading-page">
      <CreateScene />
      <div className="loading-page__card">
        <LoadingSection />
      </div>
    </div>
  );
}

export default LoadingPage;
