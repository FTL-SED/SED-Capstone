import planTripPreview from '../../../assets/plan-trip-preview.png'
import groupMembersPreview from '../../../assets/group-members-preview.png'
import itineraryPreview from '../../../assets/itinerary-preview.png'
import discoverPreview from '../../../assets/discover-preview.png'
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
    title: "Making plans together shouldn't feel like work",
    copy: "Stop jumping between group chats, maps, TikToks, and review sites. Tell NavQuest what your group enjoys, and we'll handle the planning.",
    image: planTripPreview,
    imageAlt: "NavQuest's Create form — a few quick trip details (date, time window, transport, budget) and NavQuest maps out the whole day.",
  },
  {
    title: 'Plan a day that actually works for everyone',
    copy: "NavQuest finds a fair meeting point so no one's stuck with an hour commute, keeps every stop inside your group's budget, and never books a place someone in the group can't eat at.",
    image: groupMembersPreview,
    imageAlt: "Adding each group member with their starting point, interests, and dietary needs so NavQuest can plan a day that's fair to everyone.",
  },
  {
    title: 'Every destination in the right place, at the right time',
    copy: "Get a complete schedule with timed stops, sensible travel times, and an interactive map that keeps the day moving. Everything is organized for you from start to finish.",
    image: itineraryPreview,
    imageAlt: 'A finished NavQuest itinerary — a San Francisco day with timed stops beside a live map of the route.',
  },
  {
    title: "Your next great adventure may already be waiting",
    copy: "Browse public itineraries, save the ones you like, and copy any of them into your own plan to customize. Great plans are meant to be shared.",
    image: discoverPreview,
    imageAlt: "NavQuest's Explore page — a grid of public itineraries shared by others, ready to save or copy into your own plan.",
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

              {/* a real preview where the beat provides one, else a placeholder */}
              {beat.image ? (
                <img
                  className="field-beat__image field-beat__image--photo"
                  src={beat.image}
                  alt={beat.imageAlt}
                  loading="lazy"
                />
              ) : (
                <div className="field-beat__image" role="img" aria-label="Sample image">
                  <span className="field-beat__image-label">Sample image</span>
                </div>
              )}
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
