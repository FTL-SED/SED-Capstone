import { Link } from 'react-router-dom'
import './Logo.css'

// The "NavQuest" wordmark with the Q rendered as a compass — the exact
// golden-hour compass from the loading spinner (cream dial, moss north tick,
// sunset-orange/stone two-tone needle, moss-deep hub). Unlike the loader this
// one is static, and the needle's south half extends past the ring on a
// diagonal so it doubles as the Q's tail. "Nav" + "uest" stay real text so the
// mark still reads/selects as "NavQuest"; the SVG is decorative.
function Logo() {
  return (
    <Link to="/" className="logo" aria-label="NavQuest home">
      <h3>
        Nav<svg
          viewBox="0 0 100 100"
          className="logo__compass"
          aria-hidden="true"
        >
          {/* Pale dial face + outer bezel */}
          <circle className="logo__compass-face" cx="50" cy="50" r="45" />
          <circle className="logo__compass-ring" cx="50" cy="50" r="45" />

          {/* Cardinal tick marks (N/E/S/W); N is emphasized */}
          <g className="logo__compass-ticks">
            <line x1="50" y1="9" x2="50" y2="19" className="logo__compass-tick--n" />
            <line x1="91" y1="50" x2="81" y2="50" />
            <line x1="50" y1="91" x2="50" y2="81" />
            <line x1="9" y1="50" x2="19" y2="50" />
          </g>

          {/* Both halves stay on the vertical axis (matches the compass in the
              loader / the reference): north up, south down. The Q's tail is a
              separate stroke off the ring below. */}
          <g className="logo__compass-needle">
            <polygon className="logo__compass-needle-n" points="50,16 45,50 55,50" />
            <polygon className="logo__compass-needle-s" points="50,84 45,50 55,50" />
          </g>

          {/* Short diagonal stroke hanging off the lower-right of the ring —
              the Q's tail, so the compass reads as a letter. Starts on the ring
              edge (~82,82 at 45°) and dangles outward. */}
          <line className="logo__compass-tail" x1="82" y1="82" x2="96" y2="96" />

          {/* Center pivot hub */}
          <circle className="logo__compass-hub" cx="50" cy="50" r="5" />
        </svg>uest
      </h3>
    </Link>
  );
}

export default Logo;
