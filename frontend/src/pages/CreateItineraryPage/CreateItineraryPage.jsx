import './CreateItineraryPage.css'
import ItineraryWizard from './ItineraryWizard/ItineraryWizard.jsx'

/*
 * The Create page continues the same golden-hour sky the traveller rose into on
 * the Login page — the warm gradient and low sun glow, reused for a seamless
 * transition. Beneath it a very simple city fills the whole screen: a full-width
 * row of flat grey buildings (the same shape as the City marker used across the
 * app) rises from a straight sidewalk near the bottom, and one small car drives
 * the length of the street below, wrapping back around to the left. The scene
 * lives on a fixed layer behind the form; the heading, progress stepper and the
 * form itself all live together in the single floating card (ItineraryWizard).
 * All of the presentation lives in CreateItineraryPage.css.
 */

/* One row of flat skyscrapers spanning the full width, in the same grey-with-
 * warm-windows style as src/assets/City.svg. Each building's base sits on the
 * sidewalk line; the buildings are tall so the skyline fills the whole screen,
 * with greys and heights varied for a simple cityscape. The tallest reach the
 * top of the viewport (base at SIDEWALK_TOP=720, so h=720 → top at y=0). */
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

function CreateItineraryPage() {

  return (
    <div className="create-itinerary-page">
      <div className="create-scene" aria-hidden="true">
        {/* Golden-hour sky, carried over from the Login scene for continuity */}
        <svg
          className="create-scene__sky"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          role="presentation"
        >
          <defs>
            <linearGradient id="createSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F3E7CE" />
              <stop offset="45%" stopColor="#F6EBD6" />
              <stop offset="78%" stopColor="#F7E2C4" />
              <stop offset="100%" stopColor="#F4D3A6" />
            </linearGradient>
            <radialGradient id="createSun" cx="80%" cy="16%" r="46%">
              <stop offset="0%" stopColor="#fbe6c4" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#fbe6c4" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width="1440" height="900" fill="url(#createSky)" />
          <rect x="0" y="0" width="1440" height="900" fill="url(#createSun)" />
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

      <ItineraryWizard />
    </div>
  );
}

export default CreateItineraryPage;
