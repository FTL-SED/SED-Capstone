import './TransportField.css'

// Inline SVG icons (no icon lib in this project) drawn in the 24x24,
// stroke=currentColor style used across the app so they inherit the pill's colour.
const ICONS = {
  walking: (
    <>
      <circle cx="12" cy="5" r="1.6" />
      <path d="m9 20 2.5-6 2.5 6" />
      <path d="M6 9.5 12 11l6-1.5" />
      <path d="M12 11v3" />
    </>
  ),
  transit: (
    <>
      <rect x="4" y="4" width="16" height="12" rx="2" />
      <path d="M4 11h16" />
      <path d="M8 4v7M16 4v7" />
      <circle cx="8" cy="19" r="1.4" />
      <circle cx="16" cy="19" r="1.4" />
    </>
  ),
  driving: (
    <>
      <path d="M5 11l1.5-4A2 2 0 0 1 8.4 6h7.2a2 2 0 0 1 1.9 1.3L19 11" />
      <path d="M3 11h18v5a1 1 0 0 1-1 1h-1M5 17H4a1 1 0 0 1-1-1v-5" />
      <path d="M7 17h10" />
      <circle cx="7.5" cy="17" r="1.6" />
      <circle cx="16.5" cy="17" r="1.6" />
    </>
  ),
  biking: (
    <>
      <circle cx="6" cy="17" r="3.2" />
      <circle cx="18" cy="17" r="3.2" />
      <circle cx="14.5" cy="5.5" r="1" />
      <path d="M6 17l4-6 4 3h3M10 11l3-3" />
    </>
  ),
};

// Backend accepts these exact transport modes (config/ai.js TRAVEL_MPH_BY_MODE);
// the pills keep the stored value in that set. Order + labels match the design.
const TRANSPORT_OPTIONS = [
  { value: 'walking', label: 'Walking' },
  { value: 'transit', label: 'Public Transit' },
  { value: 'driving', label: 'Driving' },
  { value: 'biking', label: 'Biking' },
];

function TransportField({ form, update }) {
  // Optional field: clicking the selected pill again clears it.
  const choose = (value) => update('transport', form.transport === value ? '' : value);

  return (
    <div className="transport-field">
      <h2>Getting around <span className="field-optional">(optional)</span></h2>
      <div className="transport-field__options" role="group" aria-label="Preferred transport">
        {TRANSPORT_OPTIONS.map(({ value, label }) => {
          const selected = form.transport === value;
          return (
            <button
              key={value}
              type="button"
              className={`transport-pill${selected ? ' transport-pill--selected' : ''}`}
              aria-pressed={selected}
              onClick={() => choose(value)}
            >
              <svg
                className="transport-pill__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {ICONS[value]}
              </svg>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TransportField;
