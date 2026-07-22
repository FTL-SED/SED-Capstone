import Heading from '../Heading/Heading.jsx'
import StartPlanningButton from '../StartPlanningButton/StartPlanningButton.jsx'
import './HeroSection.css'

/*
 * The hero is a single full-bleed, golden-hour landscape rendered as a layered,
 * handcrafted illustration. Three routes descend from their destinations —
 * lake, mountains, city — near the horizon and gather at a warm hub directly
 * above the CTA: countless possibilities drawn into one great day. The copy
 * sits on a calm foreground meadow, so the roads lead the eye to the button and
 * never cross the text.
 *
 * Built back-to-front in depth layers (sky, clouds, hazy far ridges, rolling
 * hills, the road network, trees, the meadow, foreground flora + vignette) with
 * atmospheric perspective: further-back shapes are lighter and softer. Each
 * route is hoverable and warms to sunset. A few gentle, almost-unnoticeable
 * animations run here and all yield to `prefers-reduced-motion`.
 */
function HeroSection() {
  return (
    <section className="hero" aria-label="NavQuest">
      {/* The shared, floating Navbar (hero variant) renders above this scene. */}

      {/* --- The scene --------------------------------------------------- */}
      <div className="hero__scene" aria-hidden="true">
        <svg
          className="hero__svg"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          role="presentation"
        >
          <defs>
            {/* Golden-hour sky: pale gold high up, warm cream at the horizon */}
            <linearGradient id="hqSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F3E7CE" />
              <stop offset="45%" stopColor="#F6EBD6" />
              <stop offset="78%" stopColor="#F7E2C4" />
              <stop offset="100%" stopColor="#F4D3A6" />
            </linearGradient>

            {/* The chosen route — warms from the destination toward the CTA */}
            <linearGradient id="hqRoute" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F6C56A" />
              <stop offset="55%" stopColor="#EC8C3E" />
              <stop offset="100%" stopColor="#E1783C" />
            </linearGradient>

            {/* Atmospheric depth: distant ridges wash out to a pale, hazy band;
                mid hills sit at full moss; the foreground meadow warms with the
                low sun. Each layer is a hand-tuned tonal step, not an outline. */}
            <linearGradient id="hqFar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8C877C" />
              <stop offset="100%" stopColor="#6E6A60" />
            </linearGradient>
            <linearGradient id="hqHill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94A26A" />
              <stop offset="100%" stopColor="#7C8A5C" />
            </linearGradient>
            <linearGradient id="hqMeadow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7E8E50" />
              <stop offset="60%" stopColor="#67763F" />
              <stop offset="100%" stopColor="#4E5C30" />
            </linearGradient>

            {/* Road surface: warm packed earth, lit from the upper edge */}
            <linearGradient id="hqRoad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F1E3C4" />
              <stop offset="100%" stopColor="#DFCBA0" />
            </linearGradient>

            {/* Trunk road as it arrives at the viewer: the merged road warms and
                fades into the foreground meadow before it can reach the copy. */}
            <linearGradient id="hqTrunk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EAD8B0" stopOpacity="1" />
              <stop offset="60%" stopColor="#E2CDA0" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#DFCBA0" stopOpacity="0" />
            </linearGradient>

            {/* A gentle ground shadow to seat the foreground behind the copy */}
            <linearGradient id="hqFore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#454F2E" stopOpacity="0" />
              <stop offset="100%" stopColor="#2C3320" stopOpacity="0.9" />
            </linearGradient>

            {/* Soft haze for anything sitting far back in the scene */}
            <filter id="hqHaze" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>

            <filter id="hqGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="7" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Sky — a thin warm band across the top */}
          <rect x="0" y="0" width="1440" height="900" fill="url(#hqSky)" />

          {/* Drifting clouds (soft, low-contrast). Each starts just off the left
              edge and drifts fully across before wrapping back around from the
              left (see hero-drift), so a cloud never pops into view mid-screen. */}
          <g className="hero__clouds" fill="#FFFCF3">
            <g className="hero__cloud hero__cloud--1" opacity="0.7">
              <ellipse cx="-180" cy="150" rx="90" ry="20" />
              <ellipse cx="-110" cy="140" rx="70" ry="17" />
              <ellipse cx="-240" cy="160" rx="55" ry="15" />
            </g>
            <g className="hero__cloud hero__cloud--2" opacity="0.55">
              <ellipse cx="-150" cy="110" rx="70" ry="15" />
              <ellipse cx="-90" cy="118" rx="50" ry="12" />
            </g>
            <g className="hero__cloud hero__cloud--3" opacity="0.6">
              <ellipse cx="-120" cy="205" rx="80" ry="17" />
              <ellipse cx="-180" cy="212" rx="55" ry="13" />
            </g>
          </g>

          {/* ============================================================
              ONE continuous world, not three destinations. A mountain range
              runs the whole horizon; foothills roll down from it into a lake
              basin on the left and a town built on the right-hand hillside. A
              stream threads mountains → lake to stitch the regions together,
              and the roads meander through waterfront, forest and neighbourhood
              on their way to the meeting point above the CTA. Drawn back to
              front with atmospheric perspective — one perspective, one scale,
              one hand throughout.
              ============================================================ */}

          {/* Far mountain wall — a crisp stone-grey ridge along the horizon */}
          <g>
            <path d="M0 302 L96 250 L176 292 L288 214 L372 288 L474 240 L566 300 L692 178 L806 292 L906 250 L1018 296 L1134 218 L1254 292 L1362 248 L1440 288 L1440 360 L0 360 Z" fill="url(#hqFar)" />
            {/* Snow peak on the tall centre summit — a triangle whose base corners
                sit exactly on the mountain's two slopes. Apex is the peak (692,178);
                base corners solved at y=224 along each slope
                (left slope Δ(-126,122) len √30760≈175.4; right slope Δ(114,114) len 114√2≈161.2). */}
            <polygon points="692,178 738,224 644,224" fill="#F1ECDF" />
          </g>

          {/* Foothills rolling down from the range — the ground the whole
              valley, its lake, town and roads all share */}
          <path d="M0 336 C 240 314, 520 336, 726 342 C 986 324, 1224 346, 1440 332 L1440 900 L0 900 Z" fill="url(#hqHill)" />
          <path d="M0 336 C 240 314, 520 336, 726 342 C 986 324, 1224 346, 1440 332" fill="none" stroke="#AFBC84" strokeWidth="3" opacity="0.5" />
          <path d="M0 408 C 320 372, 560 396, 812 406 C 1044 390, 1258 412, 1440 396 L1440 900 L0 900 Z" fill="#6C7A4E" />
          <path d="M0 408 C 320 372, 560 396, 812 406 C 1044 390, 1258 412, 1440 396" fill="none" stroke="#8B9A63" strokeWidth="3" opacity="0.5" />


          {/* --- The road network -------------------------------------- */}
          {/* Three routes descend from their destinations near the horizon and
              gather at a small hub (~720,470) that sits directly above the CTA:
              countless possibilities drawn down into one. Each route is its own
              hoverable group; on hover the whole ribbon warms to sunset. The
              roads curve with slight, deliberate imperfections and never cross
              the copy below. */}
          <g className="hero__paths">
            {/* Left route → along the lakeshore. The road hugs the water's edge
                as it winds down the valley toward the meeting point. */}
            <g className="hero__route" role="img" aria-label="The lakeshore route">
              <path className="hero__route-fill"
                    d="M725 478 L332 362 L328 374 L715 506 Z"
                    fill="url(#hqRoad)" />
              <path d="M720 490 L331 368" fill="none" stroke="#CBB588" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 26" opacity="0.55" />
              <path className="hero__route-glow"
                    d="M725 478 L332 362 L328 374 L715 506 Z"
                    fill="url(#hqRoute)" opacity="0" />

              {/* Lake basin, carved into the foothills — the stream drains into
                  it, a grassy shore rings it, and a little waterfront village
                  sits on the near bank. Part of the terrain, not a floating
                  disc: the shore blends into the surrounding hills. */}
              <g className="hero__dest">
                {/* the water — nestled into the land, layered for depth */}
                <path d="M206 336 C 236 316, 388 316, 430 340 C 452 356, 430 384, 356 392 C 268 400, 196 384, 194 356 C 194 346, 200 340, 206 336 Z" fill="#33495F" />
                <path d="M222 340 C 258 326, 380 328, 414 344 C 430 356, 404 374, 344 380 C 272 386, 214 372, 214 354 C 214 348, 218 343, 222 340 Z" fill="#43607C" opacity="0.9" />
                {/* the stream meets the lake here + light on the water */}
                <path d="M356 344 C 320 348, 286 352, 262 358" stroke="#7E99B0" strokeWidth="2" fill="none" opacity="0.55" strokeLinecap="round" />
                <path d="M300 366 C 330 362, 372 362, 398 356" stroke="#7E99B0" strokeWidth="2" fill="none" opacity="0.4" strokeLinecap="round" />

                {/* lighthouse on the point where the shore meets the road */}
                <g transform="translate(228 356)">
                  <path d="M-6 0 L6 0 L4 -34 L-4 -34 Z" fill="#F2E7CB" />
                  <path d="M-5.2 -8 L5.2 -8 L4.7 -16 L-4.7 -16 Z" fill="#E1783C" />
                  <path d="M-4 -24 L4 -24 L3.6 -31 L-3.6 -31 Z" fill="#E1783C" />
                  <rect x="-5" y="-41" width="10" height="7" rx="1" fill="#3B4B2A" />
                  <rect x="-3" y="-39" width="6" height="4" fill="#FCE9A8" />
                  <path d="M-6 -41 L6 -41 L2.6 -47 L-2.6 -47 Z" fill="#33402A" />
                  <circle cx="0" cy="-49" r="1.4" fill="#E1783C" />
                </g>

                {/* dock reaching out over the water, with moored boats */}
                <g transform="translate(322 366)">
                  <rect x="-26" y="-2.5" width="52" height="4" rx="1" fill="#B89A66" />
                  <g fill="#6E552F"><rect x="-22" y="1.5" width="2.5" height="7" /><rect x="-4" y="1.5" width="2.5" height="7" /><rect x="16" y="1.5" width="2.5" height="7" /></g>
                </g>
                <g transform="translate(300 360)">
                  <path d="M-11 0 C -9 5 9 5 11 0 Z" fill="#7C5A34" />
                  <path d="M0 0 L0 -20" stroke="#5A4A30" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M1 -18 L12 -2 L1 -2 Z" fill="#F2E7CB" />
                  <path d="M-1 -14 L-9 -2 L-1 -2 Z" fill="#E7D3AE" />
                </g>
                <g transform="translate(344 366)">
                  <path d="M-8 0 C -6 3 6 3 8 0 Z" fill="#B65E33" />
                  <path d="M0 0 L0 -10" stroke="#5A4A30" strokeWidth="1.4" />
                  <path d="M1 -9 L7 -2 L1 -2 Z" fill="#EFE0C0" />
                </g>

                {/* waterfront cottages + a stilted café along the near bank */}
                <g transform="translate(384 372)">
                  <rect x="-6" y="-13" width="15" height="13" fill="#EFE0C0" />
                  <path d="M-8 -13 L1 -21 L11 -13 Z" fill="#E1783C" />
                  <rect x="-3" y="-10" width="4" height="5" fill="#F4D03F" />
                  <rect x="5" y="-10" width="4" height="5" fill="#F4D03F" />
                  <rect x="-4" y="0" width="2.5" height="6" fill="#6E552F" /><rect x="7" y="0" width="2.5" height="6" fill="#6E552F" />
                </g>
                <g transform="translate(408 366)">
                  <rect x="-5" y="-10" width="12" height="10" fill="#E7D6B2" />
                  <path d="M-7 -10 L1 -16 L9 -10 Z" fill="#4E6038" />
                  <rect x="-2" y="-7" width="3" height="4" fill="#F4D03F" />
                </g>
              </g>
            </g>

            {/* Right route → the town's main street. The road climbs the
                right-hand hillside and becomes the street the town is built
                along, then meanders back down to the meeting point. */}
            <g className="hero__route" role="img" aria-label="The hillside town route">
              <path className="hero__route-fill"
                    d="M715 478 L1108 375 L1125 385 L725 506 Z"
                    fill="url(#hqRoad)" />
              <path d="M720 492 L1116 380" fill="none" stroke="#CBB588" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 26" opacity="0.55" />
              <path className="hero__route-glow"
                    d="M715 478 L1108 375 L1125 385 L725 506 Z"
                    fill="url(#hqRoute)" opacity="0" />

              {/* Hillside town — houses and a few taller buildings stepping UP
                  the foothill slope, so their bases follow the terrain rather
                  than floating. The road runs up as the main street; a church
                  spire, market and café give it life. */}
              <g className="hero__dest">
                {/* the built-up shoulder of the hill the town sits on */}
                <path d="M1088 380 C 1150 348, 1300 344, 1372 372 C 1360 392, 1120 400, 1088 380 Z" fill="#77864A" />

                {/* taller buildings toward the crest (hazed, a touch back) */}
                <g opacity="0.9">
                  <rect x="1300" y="316" width="16" height="52" fill="#8B929B" />
                  <rect x="1318" y="300" width="14" height="68" fill="#828A93" />
                  <rect x="1284" y="332" width="14" height="36" fill="#949BA3" />
                </g>
                {/* church with a spire, mid-slope */}
                <g transform="translate(1258 360)">
                  <rect x="-8" y="-22" width="16" height="22" fill="#E7D6B2" />
                  <path d="M-8 -22 L0 -30 L8 -22 Z" fill="#B65E33" />
                  <rect x="-2" y="-42" width="4" height="20" fill="#EFE0C0" />
                  <path d="M-2 -42 L0 -52 L2 -42 Z" fill="#4E6038" />
                  <rect x="-1" y="-16" width="2" height="6" fill="#6B4428" />
                </g>
                {/* a small terrace of houses lining the street, stepping downhill */}
                <g transform="translate(1214 366)">
                  <rect x="-9" y="-15" width="18" height="15" fill="#EFE0C0" />
                  <path d="M-11 -15 L0 -23 L11 -15 Z" fill="#E1783C" />
                  <rect x="-5" y="-11" width="4" height="5" fill="#F4D03F" /><rect x="2" y="-11" width="4" height="5" fill="#F4D03F" />
                </g>
                <g transform="translate(1180 372)">
                  <rect x="-8" y="-13" width="16" height="13" fill="#E7D6B2" />
                  <path d="M-10 -13 L0 -20 L10 -13 Z" fill="#4E6038" />
                  <rect x="-4" y="-9" width="4" height="5" fill="#F4D03F" />
                </g>
                <g transform="translate(1148 378)">
                  <rect x="-7" y="-11" width="14" height="11" fill="#EFE0C0" />
                  <path d="M-9 -11 L0 -17 L9 -11 Z" fill="#B65E33" />
                  <rect x="-3" y="-8" width="3" height="4" fill="#F4D03F" />
                </g>
                {/* lit windows scattered on the taller buildings */}
                <g fill="#F4D03F">
                  <rect x="1303" y="332" width="3" height="4" /><rect x="1310" y="348" width="3" height="4" />
                  <rect x="1321" y="316" width="3" height="4" /><rect x="1326" y="336" width="3" height="4" /><rect x="1321" y="352" width="3" height="4" />
                  <rect x="1287" y="344" width="3" height="4" />
                </g>
                {/* street life along the main street — café awning, market, people */}
                <g transform="translate(1118 380)">
                  <path d="M0 0 L16 0 L13 -7 L3 -7 Z" fill="#E1783C" />
                  <g stroke="#6E552F" strokeWidth="1.4"><path d="M3 0 L3 5" /><path d="M13 0 L13 5" /></g>
                </g>
                <g transform="translate(1238 372)">
                  <path d="M0 -7 L12 -7 L12 0 L0 0 Z" fill="#EFE0C0" />
                  <path d="M-2 -7 L14 -7 L11 -11 L1 -11 Z" fill="#4E6038" />
                </g>
              </g>
            </g>

            {/* Centre route → up through the forest park toward the pass. Drawn
                last of the three so it layers on top of the left and right
                routes (but still beneath the meeting-point trunk below). */}
            <g className="hero__route" role="img" aria-label="The forest trail toward the pass">
              <path className="hero__route-fill"
                    d="M700 494 L710 358 L726 358 L734 494 Z"
                    fill="url(#hqRoad)" />
              <path d="M717 492 L718 362" fill="none" stroke="#CBB588" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 26" opacity="0.55" />
              <path className="hero__route-glow"
                    d="M700 494 L710 358 L726 358 L734 494 Z"
                    fill="url(#hqRoute)" opacity="0" />

              {/* Forest park on the valley floor beneath the peaks — a stand of
                  pines the road threads through, a trailhead sign, a cabin, a
                  hiker, and the trail switchbacking up toward the pass. This is
                  a region OF the mountain range above it, not a separate icon. */}
              {/* Outer group positions/sizes the destination; the inner
                  .hero__dest keeps its own transform separate from this one. */}
              <g transform="translate(-11 05) scale(1.01)">
              <g className="hero__dest">
                {/* a soft clearing of paler grass the pines sit on */}
                <path d="M636 344 C 690 330, 760 330, 800 348 C 772 366, 668 366, 636 344 Z" fill="#77864A" />

                {/* pines flanking the trail — varied heights, a real little stand */}
                <g>
                  <g transform="translate(660 346)"><rect x="-1.6" y="-2" width="3.2" height="10" fill="#5A4A30" /><path d="M0 -30 L8 -12 L3 -13 L10 0 L-10 0 L-3 -13 L-8 -12 Z" fill="#3D4E2E" /></g>
                  <g transform="translate(678 350)"><rect x="-1.4" y="-2" width="2.8" height="8" fill="#5A4A30" /><path d="M0 -24 L7 -10 L3 -11 L8 0 L-8 0 L-3 -11 L-7 -10 Z" fill="#44562F" /></g>
                  <g transform="translate(760 348)"><rect x="-1.6" y="-2" width="3.2" height="10" fill="#5A4A30" /><path d="M0 -32 L9 -12 L3 -13 L10 0 L-10 0 L-3 -13 L-9 -12 Z" fill="#3D4E2E" /></g>
                  <g transform="translate(778 352)"><rect x="-1.4" y="-2" width="2.8" height="8" fill="#5A4A30" /><path d="M0 -22 L7 -9 L3 -10 L8 0 L-8 0 L-3 -10 L-7 -9 Z" fill="#44562F" /></g>
                </g>

                {/* trailhead cabin tucked in the clearing */}
                <g transform="translate(688 356)">
                  <rect x="-8" y="-9" width="16" height="9" fill="#B07440" />
                  <path d="M-10 -9 L0 -17 L10 -9 Z" fill="#6B4428" />
                  <rect x="-2" y="-6" width="4" height="6" fill="#F4D03F" />
                </g>
                {/* trailhead marker + a hiker setting off */}
                <g transform="translate(730 360)">
                  <rect x="-0.8" y="-10" width="1.6" height="10" fill="#6E552F" />
                  <rect x="0.8" y="-10" width="8" height="4" fill="#E1783C" />
                </g>
              </g>
              </g>
            </g>

            {/* Where the three routes meet they become one trunk road that widens
                as it approaches the viewer and dissolves into the meadow before
                the headline — so every path resolves into the single road ahead
                rather than dead-ending at a floating hub. */}
            <path d="M690 486 L750 486 C 764 528, 786 566, 812 600 L628 600 C 654 566, 676 528, 690 486 Z"
                  fill="url(#hqTrunk)" />
          </g>

          {/* Trees — each an individual silhouette (no repeats), sized and
              lightened by depth. Far trees are small, pale and hazed; the
              foreground pair carries a little more shape and shadow. All sit
              clear of the routes and the centred copy. */}
          {/* Every tree is now the same pine as the middle destination's stand —
              one silhouette, scaled by depth — deliberately spaced into the open
              meadow and hill margins, well clear of the routes, destinations and
              mountains, so each stands alone in the whitespace. */}
          <g className="hero__trees" fill="#3D4E2E">
            {/* left margin — upper hill down through the meadow */}
            <g className="hero__tree" transform="translate(96 470) scale(2.2)">
              <rect x="-1.6" y="-2" width="3.2" height="10" fill="#5A4A30" />
              <path d="M0 -30 L8 -12 L3 -13 L10 0 L-10 0 L-3 -13 L-8 -12 Z" />
            </g>
            <g className="hero__tree" transform="translate(70 616) scale(2.7)">
              <rect x="-1.6" y="-2" width="3.2" height="10" fill="#5A4A30" />
              <path d="M0 -30 L8 -12 L3 -13 L10 0 L-10 0 L-3 -13 L-8 -12 Z" />
            </g>
            <g className="hero__tree" transform="translate(250 742) scale(3.2)">
              <rect x="-1.6" y="-2" width="3.2" height="10" fill="#5A4A30" />
              <path d="M0 -30 L8 -12 L3 -13 L10 0 L-10 0 L-3 -13 L-8 -12 Z" />
            </g>

            {/* right margin — upper hill down through the meadow */}
            <g className="hero__tree" transform="translate(1344 470) scale(2.2)">
              <rect x="-1.6" y="-2" width="3.2" height="10" fill="#5A4A30" />
              <path d="M0 -30 L8 -12 L3 -13 L10 0 L-10 0 L-3 -13 L-8 -12 Z" />
            </g>
            <g className="hero__tree" transform="translate(1372 616) scale(2.7)">
              <rect x="-1.6" y="-2" width="3.2" height="10" fill="#5A4A30" />
              <path d="M0 -30 L8 -12 L3 -13 L10 0 L-10 0 L-3 -13 L-8 -12 Z" />
            </g>
            <g className="hero__tree" transform="translate(1190 742) scale(3.2)">
              <rect x="-1.6" y="-2" width="3.2" height="10" fill="#5A4A30" />
              <path d="M0 -30 L8 -12 L3 -13 L10 0 L-10 0 L-3 -13 L-8 -12 Z" />
            </g>

            {/* one more standing alone in the lower-left corner */}
            <g className="hero__tree" transform="translate(60 830) scale(3.4)">
              <rect x="-1.6" y="-2" width="3.2" height="10" fill="#5A4A30" />
              <path d="M0 -30 L8 -12 L3 -13 L10 0 L-10 0 L-3 -13 L-8 -12 Z" />
            </g>
          </g>

          {/* --- Calm foreground meadow that holds the copy ------------- */}
          {/* The meadow rises with a gently uneven crest, dipping in the centre
              to open a quiet stage for the headline and CTA. A lighter sunlit
              band traces the crest; wildflowers and a few tiny moments of life
              dot the edges without ever crowding the text. */}
          <path d="M0 528 C 280 506, 520 520, 720 526 C 980 512, 1240 530, 1440 516 L1440 900 L0 900 Z" fill="url(#hqMeadow)" />
          <path d="M0 528 C 280 506, 520 520, 720 526 C 980 512, 1240 530, 1440 516" fill="none" stroke="#93A25C" strokeWidth="4" opacity="0.55" />

          {/* Foreground vignette — deepens the lower frame so the copy stays
              effortlessly legible. Kept above the flora band so the small living
              moments below still read. */}
          <path d="M0 620 L1440 620 L1440 900 L0 900 Z" fill="url(#hqFore)" />

          {/* Foreground vegetation, wildflowers and small living moments — kept
              to the outer edges and drawn ABOVE the vignette so curiosity is
              rewarded. Colours are picked to hold up against the darkened
              meadow; nothing sits near the centred copy. */}
          <g className="hero__flora">
            {/* wildflower clusters (left) */}
            <g stroke="#7C8A4E" strokeWidth="2.5" strokeLinecap="round">
              <path d="M96 792 L96 756" /><circle cx="96" cy="750" r="7" fill="#F0A24A" stroke="none" />
              <path d="M126 800 L126 768" /><circle cx="126" cy="762" r="6" fill="#F6EFE1" stroke="none" />
              <path d="M70 804 L70 774" /><circle cx="70" cy="768" r="6" fill="#EC8C3E" stroke="none" />
              <path d="M154 796 L154 766" /><circle cx="154" cy="760" r="6" fill="#F0A24A" stroke="none" />
            </g>
            {/* wildflower clusters (right) */}
            <g stroke="#7C8A4E" strokeWidth="2.5" strokeLinecap="round">
              <path d="M1352 800 L1352 766" /><circle cx="1352" cy="760" r="7" fill="#F0A24A" stroke="none" />
              <path d="M1380 808 L1380 776" /><circle cx="1380" cy="770" r="6" fill="#F6EFE1" stroke="none" />
              <path d="M1324 806 L1324 776" /><circle cx="1324" cy="770" r="6" fill="#EC8C3E" stroke="none" />
            </g>
          </g>

          {/* Sky life: a small plane occasionally crossing, kept high in the
              now-thinner sky band. */}
          <g className="hero__plane">
            <path d="M0 0 l22 6 l-22 6 l6 -6 z M6 6 l14 -9 l3 2 l-11 8 z M6 6 l14 9 l3 -2 l-11 -8 z"
                  fill="#8A7B58" transform="translate(-40 140)" />
          </g>
        </svg>

        {/* A soft scrim keeps the overlay text legible over the bright sky */}
        <div className="hero__scrim" />
      </div>

      {/* --- Minimal overlay: one headline + one CTA --------------------- */}
      <div className="hero__overlay">
        <Heading text="The road already knows the way." />
        <StartPlanningButton />
      </div>
    </section>
  );
}

export default HeroSection;
