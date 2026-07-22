import './YourDaySection.css'

/*
 * Section 3 — Your day.
 *
 * Stripped back to just the terrain for now. The road and the text/itinerary
 * content have been removed and will be reintroduced later.
 */
function YourDaySection() {
  return (
    <section className="journey-section day">
      <div className="journey-section__scene" aria-hidden="true">
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" role="presentation">
          <defs>
            <linearGradient id="dayGround" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4a5c39" />
              <stop offset="55%" stopColor="#586c43" />
              <stop offset="100%" stopColor="#4a5c39" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="1440" height="900" fill="url(#dayGround)" />
        </svg>
      </div>
    </section>
  );
}

export default YourDaySection;
