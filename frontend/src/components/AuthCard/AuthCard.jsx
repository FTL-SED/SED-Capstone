import './AuthCard.css'

/*
 * The auth pages continue the landing-page world: the traveller has risen into
 * the clouds. The scene reuses the landing hero's warm golden-hour sky, with a
 * few soft drifting clouds and a couple of tiny birds, so the panel stays the
 * clear focus. All of the presentation lives in AuthCard.css.
 */
function AuthCard({ children }) {
  return (
    <div className="auth-scene">
      <div className="auth-scene__sky" aria-hidden="true">
        <svg
          className="auth-sky"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          role="presentation"
        >
          <defs>
            {/* The landing hero's golden-hour sky, reused verbatim for continuity */}
            <linearGradient id="authSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F3E7CE" />
              <stop offset="45%" stopColor="#F6EBD6" />
              <stop offset="78%" stopColor="#F7E2C4" />
              <stop offset="100%" stopColor="#F4D3A6" />
            </linearGradient>
            <radialGradient id="authSun" cx="80%" cy="18%" r="42%">
              <stop offset="0%" stopColor="#fbe6c4" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#fbe6c4" stopOpacity="0" />
            </radialGradient>
            <filter id="authSoft" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" />
            </filter>

            {/* Bird artwork, shared by every bird via <use>. Two wing states —
                up and down — taken verbatim from assets/BirdMovingUp.svg and
                assets/BirdMovingDown.svg, drawn in a 0–100 box. */}
            <g id="authBirdUp">
              <path d="M 55,48 Q 40,15 25,10 Q 50,20 62,45 Z" fill="#C1121F" />
              <path d="M 10,58 Q 40,35 75,48 L 95,52 L 75,56 Q 40,70 10,58 Z" fill="#DF2935" />
              <path d="M 45,52 Q 25,10 5,5 Q 40,15 55,48 Z" fill="#FD4141" />
            </g>
            <g id="authBirdDown">
              <path d="M 55,48 Q 40,85 25,90 Q 50,80 62,45 Z" fill="#C1121F" />
              <path d="M 10,58 Q 40,35 75,48 L 95,52 L 75,56 Q 40,70 10,58 Z" fill="#DF2935" />
              <path d="M 45,52 Q 25,90 5,95 Q 40,85 55,48 Z" fill="#FD4141" />
            </g>
          </defs>

          <rect x="0" y="0" width="1440" height="900" fill="url(#authSky)" />
          <rect x="0" y="0" width="1440" height="900" fill="url(#authSun)" />

          {/* Large, clearly-drawn clouds sitting low in the sky, well below the
              panel. Each one starts just off the left edge and drifts all the way
              across before wrapping back around from the left (see auth-drift),
              so a cloud never pops into view mid-screen. */}
          <g className="auth-sky__clouds" filter="url(#authSoft)" fill="#FFFCF3">
            <g className="auth-cloud auth-cloud--1" opacity="0.96">
              <ellipse cx="-190" cy="250" rx="132" ry="34" />
              <ellipse cx="-280" cy="264" rx="82" ry="26" />
              <ellipse cx="-100" cy="264" rx="88" ry="26" />
            </g>
            <g className="auth-cloud auth-cloud--2" opacity="0.9">
              <ellipse cx="-190" cy="428" rx="132" ry="34" />
              <ellipse cx="-280" cy="442" rx="82" ry="26" />
              <ellipse cx="-100" cy="442" rx="88" ry="26" />
            </g>
            <g className="auth-cloud auth-cloud--3" opacity="0.86">
              <ellipse cx="-190" cy="712" rx="132" ry="34" />
              <ellipse cx="-280" cy="726" rx="82" ry="26" />
              <ellipse cx="-100" cy="726" rx="88" ry="26" />
            </g>
          </g>

          {/* A few small birds, high and well spaced. Like the clouds they start
              off the left edge and fly all the way across before wrapping back
              around from the left (.auth-bird-fly). Nested groups compose cleanly:
              the fly wrapper drifts horizontally, the next group places/scales the
              bird, the inner .auth-bird bobs, and the two frames flap. */}
          <g className="auth-sky__birds">
            <g className="auth-bird-fly auth-bird-fly--1">
              <g transform="translate(-80 180) scale(0.42)">
                <g className="auth-bird auth-bird--1">
                  <use className="auth-bird__frame auth-bird__frame--up" href="#authBirdUp" />
                  <use className="auth-bird__frame auth-bird__frame--down" href="#authBirdDown" />
                </g>
              </g>
            </g>
            <g className="auth-bird-fly auth-bird-fly--2">
              <g transform="translate(-80 508) scale(0.42)">
                <g className="auth-bird auth-bird--2">
                  <use className="auth-bird__frame auth-bird__frame--up" href="#authBirdUp" />
                  <use className="auth-bird__frame auth-bird__frame--down" href="#authBirdDown" />
                </g>
              </g>
            </g>
            <g className="auth-bird-fly auth-bird-fly--3">
              <g transform="translate(-80 588) scale(0.42)">
                <g className="auth-bird auth-bird--3">
                  <use className="auth-bird__frame auth-bird__frame--up" href="#authBirdUp" />
                  <use className="auth-bird__frame auth-bird__frame--down" href="#authBirdDown" />
                </g>
              </g>
            </g>
          </g>
        </svg>
      </div>

      <div className="auth-card">
        {children}
      </div>
    </div>
  );
}

export default AuthCard;
