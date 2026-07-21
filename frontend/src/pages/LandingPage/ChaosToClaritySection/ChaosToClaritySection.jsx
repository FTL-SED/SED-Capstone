import './ChaosToClaritySection.css'

/*
 * The journey field — the single green section below the hero.
 *
 * One flat green band with a single straight road running dead-centre from top
 * to bottom. A stack of "beats" is laid over it: each beat pairs a text box
 * with an image, sitting on opposite sides of the road, and every beat flips
 * which side each lands on — text left / image right, then image left / text
 * right, and so on down the drive.
 */
const BEATS = [
  {
    title: "Planning together shouldn't feel like work",
    copy: "Stop jumping between group chats, maps, TikToks, and review sites. Tell NavQuest what your group enjoys, and we'll handle the planning.",
  },
  {
    title: 'Tell us what makes a great day.',
    copy: 'Choose your interests, budget, transportation, schedule, and preferences. NavQuest learns what matters so every itinerary feels personalized.',
  },
  {
    title: 'Your itinerary, built in seconds.',
    copy: 'Our AI organizes destinations into a route that makes sense: less backtracking, better timing, and more time enjoying the day.',
  },
  {
    title: 'Discover journeys worth sharing.',
    copy: 'Browse itineraries created by other travelers, save your favorites, or remix them into your own perfect day.',
  },
];

/*
 * Flora that lives ONLY in the open bands between beats — never beside a text
 * box or image. Each gap band gets its own cluster; plants are pinned to the
 * far left/right edges and kept well clear of the centre road corridor, so a
 * plant can only ever appear in the empty grass separating two sections.
 *
 * One entry per gap between beats (so BEATS.length - 1 gaps). Bands are
 * deliberately uneven: some hold only pines, some only wildflowers, and their
 * `height` differs so the drive doesn't fall into a mechanical rhythm — tree
 * bands run taller (trees need vertical room), flower bands sit shorter.
 * Each plant is placed by an edge (`side` + `offset` %) and a `top` (% down
 * the band).
 */
const GAP_FLORA = [
  {
    // trees only — a tall band
    height: 'clamp(320px, 40vh, 560px)',
    items: [
      { type: 'pine', side: 'left', offset: 5, top: 58, scale: 3.1 },
      { type: 'pine', side: 'left', offset: 17, top: 74, scale: 2.3 },
      { type: 'pine', side: 'right', offset: 8, top: 66, scale: 2.7 },
    ],
  },
  {
    // a mix — a pine paired with wildflowers, medium band
    height: 'clamp(240px, 28vh, 420px)',
    items: [
      { type: 'pine', side: 'left', offset: 6, top: 66, scale: 2.8 },
      { type: 'flower', side: 'left', offset: 19, top: 78, hue: 'ember' },
      { type: 'flower', side: 'right', offset: 7, top: 72, hue: 'gold' },
      { type: 'flower', side: 'right', offset: 20, top: 62, hue: 'cream' },
    ],
  },
  {
    // trees only — a tall band, weighted to the other side
    height: 'clamp(300px, 36vh, 520px)',
    items: [
      { type: 'pine', side: 'left', offset: 7, top: 64, scale: 2.6 },
      { type: 'pine', side: 'right', offset: 6, top: 70, scale: 3 },
      { type: 'pine', side: 'right', offset: 19, top: 56, scale: 2.2 },
    ],
  },
];

const FLOWER_FILL = { gold: '#F0A24A', ember: '#EC8C3E', cream: '#F6EFE1' };

function Pine({ scale }) {
  return (
    <svg className="field-flora__svg" viewBox="-12 -32 24 42" width={22 * scale} aria-hidden="true">
      <rect x="-1.6" y="-2" width="3.2" height="10" fill="#5A4A30" />
      <path d="M0 -30 L8 -12 L3 -13 L10 0 L-10 0 L-3 -13 L-8 -12 Z" fill="#3D4E2E" />
    </svg>
  );
}

function Flower({ hue }) {
  return (
    <svg className="field-flora__svg" viewBox="-10 -8 20 44" width="26" aria-hidden="true">
      <g stroke="#7C8A4E" strokeWidth="2.5" strokeLinecap="round">
        <path d="M0 34 L0 0" />
      </g>
      <circle cx="0" cy="-2" r="7" fill={FLOWER_FILL[hue]} />
    </svg>
  );
}

function ChaosToClaritySection() {
  return (
    <section className="journey-section journey-field">
      <div className="journey-field__route" aria-hidden="true" />

      <div className="journey-field__beats">
        {BEATS.map((beat, i) => (
          <div key={beat.title} className="field-beat-row">
            <div
              className={`field-beat${i % 2 === 1 ? ' field-beat--flip' : ''}`}
            >
              {/* text box */}
              <div className="field-beat__text">
                <h2 className="journey-headline field-beat__title">{beat.title}</h2>
                <p className="journey-copy">{beat.copy}</p>
              </div>

              {/* image placeholder */}
              <div className="field-beat__image" role="img" aria-label="Sample image">
                <span className="field-beat__image-label">Sample image</span>
              </div>
            </div>

            {/* greenery filling the open grass between this beat and the next —
                anchored to the far edges, clear of both the boxes and the road */}
            {i < BEATS.length - 1 && (
              <div
                className="field-gap"
                style={{ height: GAP_FLORA[i].height }}
                aria-hidden="true"
              >
                {GAP_FLORA[i].items.map((f, j) => (
                  <div
                    key={j}
                    className="field-flora"
                    style={{ top: `${f.top}%`, [f.side]: `${f.offset}%` }}
                  >
                    {f.type === 'pine' ? <Pine scale={f.scale} /> : <Flower hue={f.hue} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default ChaosToClaritySection;
