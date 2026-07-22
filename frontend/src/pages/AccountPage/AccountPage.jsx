import AccountAvatar from './AccountAvatar/AccountAvatar.jsx'
import AccountNav from './AccountNav/AccountNav.jsx'
import ProfileSection from './ProfileSection/ProfileSection.jsx'
import UsernameField from './ProfileSection/UsernameField/UsernameField.jsx'
import ChangePasswordSection from './ChangePasswordSection/ChangePasswordSection.jsx'
import './AccountPage.css'

/*
 * The account page is the traveller's basecamp — a quiet mountain overlook that
 * continues the world of the landing, auth and create pages. It reuses the same
 * warm golden-hour sky (with a few drifting clouds and tiny birds) and sets a
 * minimal layered mountain range beneath it; a single floating cream card holds
 * all of the account controls. The warm palette is retinted onto the shared
 * design tokens, scoped to .account-page, so the reused avatar, inputs and
 * buttons adopt the identity here without their own component files changing —
 * the same approach the auth and create scenes use. All presentation lives in
 * AccountPage.css; the logic below is unchanged.
 */
function AccountPage({ currentUser, setCurrentUser }) {
  return (
    <div className="account-page">
      <div className="account-scene" aria-hidden="true">
        <svg
          className="account-sky"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMax slice"
          role="presentation"
        >
          <defs>
            {/* The golden-hour sky, reused verbatim from the auth + landing scenes */}
            <linearGradient id="acctSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F3E7CE" />
              <stop offset="45%" stopColor="#F6EBD6" />
              <stop offset="78%" stopColor="#F7E2C4" />
              <stop offset="100%" stopColor="#F4D3A6" />
            </linearGradient>
            <radialGradient id="acctSun" cx="78%" cy="20%" r="44%">
              <stop offset="0%" stopColor="#fbe6c4" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#fbe6c4" stopOpacity="0" />
            </radialGradient>

            {/* The stone-grey mountain ridge, reused verbatim from the landing
                hero (its "far mountain wall" gradient) so the peak matches. */}
            <linearGradient id="acctFar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8C877C" />
              <stop offset="100%" stopColor="#6E6A60" />
            </linearGradient>

            <filter id="acctSoft" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" />
            </filter>

            {/* Bird artwork, shared by every bird via <use> — the same two wing
                states used across the auth scene, drawn in a 0–100 box. */}
            <g id="acctBirdUp">
              <path d="M 55,48 Q 40,15 25,10 Q 50,20 62,45 Z" fill="#C1121F" />
              <path d="M 10,58 Q 40,35 75,48 L 95,52 L 75,56 Q 40,70 10,58 Z" fill="#DF2935" />
              <path d="M 45,52 Q 25,10 5,5 Q 40,15 55,48 Z" fill="#FD4141" />
            </g>
            <g id="acctBirdDown">
              <path d="M 55,48 Q 40,85 25,90 Q 50,80 62,45 Z" fill="#C1121F" />
              <path d="M 10,58 Q 40,35 75,48 L 95,52 L 75,56 Q 40,70 10,58 Z" fill="#DF2935" />
              <path d="M 45,52 Q 25,90 5,95 Q 40,85 55,48 Z" fill="#FD4141" />
            </g>
          </defs>

          <rect x="0" y="0" width="1440" height="900" fill="url(#acctSky)" />
          <rect x="0" y="0" width="1440" height="900" fill="url(#acctSun)" />

          {/* A few large, soft clouds drifting slowly across the upper sky. Each
              starts just off the left edge and drifts all the way across before
              wrapping back (see account-drift), so none pops into view mid-screen. */}
          <g className="account-sky__clouds" filter="url(#acctSoft)" fill="#FFFCF3">
            <g className="account-cloud account-cloud--1" opacity="0.95">
              <ellipse cx="-190" cy="200" rx="132" ry="34" />
              <ellipse cx="-280" cy="214" rx="82" ry="26" />
              <ellipse cx="-100" cy="214" rx="88" ry="26" />
            </g>
            <g className="account-cloud account-cloud--2" opacity="0.88">
              <ellipse cx="-190" cy="330" rx="120" ry="30" />
              <ellipse cx="-268" cy="342" rx="74" ry="23" />
              <ellipse cx="-108" cy="342" rx="80" ry="23" />
            </g>
            <g className="account-cloud account-cloud--3" opacity="0.82">
              <ellipse cx="-190" cy="150" rx="104" ry="26" />
              <ellipse cx="-258" cy="160" rx="66" ry="20" />
              <ellipse cx="-116" cy="160" rx="70" ry="20" />
            </g>
          </g>

          {/* A few small birds, high and well spaced. Like the clouds they start
              off the left edge and fly all the way across before wrapping back
              around. Nested groups compose cleanly: the fly wrapper drifts
              horizontally, the next group places/scales the bird, the inner
              .account-bird bobs, and the two frames flap. */}
          <g className="account-sky__birds">
            <g className="account-bird-fly account-bird-fly--1">
              <g transform="translate(-80 140) scale(0.4)">
                <g className="account-bird account-bird--1">
                  <use className="account-bird__frame account-bird__frame--up" href="#acctBirdUp" />
                  <use className="account-bird__frame account-bird__frame--down" href="#acctBirdDown" />
                </g>
              </g>
            </g>
            <g className="account-bird-fly account-bird-fly--2">
              <g transform="translate(-80 240) scale(0.4)">
                <g className="account-bird account-bird--2">
                  <use className="account-bird__frame account-bird__frame--up" href="#acctBirdUp" />
                  <use className="account-bird__frame account-bird__frame--down" href="#acctBirdDown" />
                </g>
              </g>
            </g>
            <g className="account-bird-fly account-bird-fly--3">
              <g transform="translate(-80 300) scale(0.4)">
                <g className="account-bird account-bird--3">
                  <use className="account-bird__frame account-bird__frame--up" href="#acctBirdUp" />
                  <use className="account-bird__frame account-bird__frame--down" href="#acctBirdDown" />
                </g>
              </g>
            </g>
          </g>

          {/* A single stone-grey mountain range with one snow peak, in the
              landing hero's style but sitting lower and shorter so it takes up
              less of the screen. Anchored to the bottom of the viewport
              (xMidYMax slice) so it always grounds the page as a basecamp.

              Snow peak — its base corners sit EXACTLY on the summit's two slopes.
              Apex is the peak (720,600); the slopes descend to the flanking
              valleys at (540,700) and (900,700), each a Δ(±180,+100) vector, so
              by the Pythagorean theorem each slope is √(180²+100²)=√42400≈205.9
              long. For the snow base at y=640 the slope parameter is
              t=(640−600)/100=0.4, giving base x = 720 ∓ 180·0.4 = 648 and 792. */}
          <g className="account-mtn">
            <path d="M0 720 L120 682 L260 712 L400 652 L540 700 L720 600 L900 700 L1050 656 L1200 706 L1330 672 L1440 700 L1440 900 L0 900 Z" fill="url(#acctFar)" />
            <polygon points="720,600 792,640 648,640" fill="#F1ECDF" />
          </g>
        </svg>
      </div>

      <div className="account-card">
        <header className="account-card__header">
          <AccountAvatar currentUser={currentUser} setCurrentUser={setCurrentUser} />
          <div className="account-card__identity">
            <p className="account-card__eyebrow">Your Basecamp</p>
            <h1 className="account-card__name">{currentUser?.username}</h1>
            <p className="account-card__subtitle">Everything about your travel profile.</p>
          </div>
        </header>

        <div className="account-card__sections">
          <ProfileSection currentUser={currentUser} />
          <UsernameField currentUser={currentUser} setCurrentUser={setCurrentUser} />
          <ChangePasswordSection currentUser={currentUser} />
        </div>

        <AccountNav setCurrentUser={setCurrentUser} />
      </div>
    </div>
  );
}

export default AccountPage;
