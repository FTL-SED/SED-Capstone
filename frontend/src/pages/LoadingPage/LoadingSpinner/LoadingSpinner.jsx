import './LoadingSpinner.css'

// A compass whose two-tone needle sweeps around the dial — on-theme for a travel
// planner ("NavQuest"). The dial + ticks are static; only the needle group spins
// (the .loading-compass__needle class, paused under prefers-reduced-motion).
function LoadingSpinner() {
  return (
    <div className="loading-compass" role="status" aria-label="Loading">
      <svg viewBox="0 0 100 100" className="loading-compass__svg" aria-hidden="true">
        {/* Pale dial face + outer bezel */}
        <circle className="loading-compass__face" cx="50" cy="50" r="45" />
        <circle className="loading-compass__ring" cx="50" cy="50" r="45" />

        {/* Cardinal tick marks (N/E/S/W); N is emphasized */}
        <g className="loading-compass__ticks">
          <line x1="50" y1="9" x2="50" y2="19" className="loading-compass__tick--n" />
          <line x1="91" y1="50" x2="81" y2="50" />
          <line x1="50" y1="91" x2="50" y2="81" />
          <line x1="9" y1="50" x2="19" y2="50" />
        </g>

        {/* The rotating needle: red north half, muted south half */}
        <g className="loading-compass__needle">
          <polygon className="loading-compass__needle-n" points="50,16 44,50 56,50" />
          <polygon className="loading-compass__needle-s" points="50,84 44,50 56,50" />
        </g>

        {/* Center pivot hub */}
        <circle className="loading-compass__hub" cx="50" cy="50" r="5" />
      </svg>
    </div>
  );
}

export default LoadingSpinner;
