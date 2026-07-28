import './PasswordInput.css'
import { useState } from "react";

// Shared SVG attributes, matched to the rest of the app's inline icons (see
// LikeButton) so the eye reads as part of the same set.
const iconProps = {
  viewBox: "0 0 24 24",
  width: 18,
  height: 18,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

// Open eye — shown while the password is visible (click to hide).
function EyeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Eye with a slash — shown while the password is hidden (click to reveal).
function EyeOffIcon() {
  return (
    <svg {...iconProps}>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function PasswordInput({ label, placeholder = "Password", value, onChange }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="password-input">
      {label && <label>{label}</label>}

      <div className="password-input__field">
        <input
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          className="password-input__toggle"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeIcon /> : <EyeOffIcon />}
        </button>
      </div>
    </div>
  );
}

export default PasswordInput;
