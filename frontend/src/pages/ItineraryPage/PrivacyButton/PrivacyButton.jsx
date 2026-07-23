import './PrivacyButton.css'
import { useState } from 'react'

// Owner-only toggle for an itinerary's visibility. Mirrors BookmarkButton: if a
// parent passes `isPublic` it's controlled, otherwise it tracks its own on/off
// so the switch works visually before it's wired to the backend. The actual
// public↔private persistence is left to the parent's onClick handler.
function PrivacyButton({ onClick, className = "", isPublic }) {
  const [selfPublic, setSelfPublic] = useState(true);
  const isOn = isPublic ?? selfPublic; // ?? = "use `isPublic` unless it's missing"

  const handleClick = (event) => {
    // Only self-toggle when uncontrolled; when a parent owns `isPublic`, its value wins.
    if (isPublic === undefined) setSelfPublic((prev) => !prev);
    onClick?.(event);
  };

  return (
    <button
      className={`action-btn privacy-button ${className}`.trim()}
      onClick={handleClick}
      aria-pressed={isOn}
      aria-label={isOn ? "Make private" : "Make public"}
    >
      {isOn ? (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )}
      <span className="privacy-button__label">{isOn ? "Public" : "Private"}</span>
    </button>
  );
}

export default PrivacyButton;
