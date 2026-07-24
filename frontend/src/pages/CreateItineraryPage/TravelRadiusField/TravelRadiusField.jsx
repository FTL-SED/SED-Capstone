import './TravelRadiusField.css'
import { useState } from 'react'

// A slider for the max travel radius (miles) around the group's meeting point.
// Position 0 means "no limit" and stores '' (so buildRequest omits it); any
// other position stores that number as a string, matching the prior contract.
// The upper bound is editable so a user who needs a wider radius isn't capped.
const DEFAULT_MAX = 15;

function TravelRadiusField({ form, update }) {
  const [max, setMax] = useState(DEFAULT_MAX);
  const current = form.travelRadius === '' ? 0 : Number(form.travelRadius);
  const readout = current === 0 ? 'No limit' : `${current} mi`;
  const fillPct = max > 0 ? Math.min(100, (current / max) * 100) : 0;

  // Editing the ceiling: keep it at least 1; if the current value now exceeds
  // the new ceiling, pull it down so the thumb stays in range.
  const changeMax = (raw) => {
    const next = Math.max(1, Math.round(Number(raw) || 0));
    setMax(next);
    if (current > next) update('travelRadius', String(next));
  };

  return (
    <div className="travel-radius-field">
      <div className="travel-radius-field__head">
        <h2>Max travel radius <span className="field-optional">(optional)</span></h2>
        <span className="travel-radius-field__readout">{readout}</span>
      </div>
      <input
        className="range-slider"
        type="range"
        min="0"
        max={max}
        step="1"
        value={Math.min(current, max)}
        aria-label="Maximum travel radius in miles"
        style={{ '--fill': `${fillPct}%` }}
        onChange={(e) => {
          const n = Number(e.target.value);
          update('travelRadius', n === 0 ? '' : String(n));
        }}
      />
      <div className="range-slider__ticks">
        <span>No limit</span>
        <label className="range-slider__max">
          <span className="range-slider__max-prefix">Max&nbsp;</span>
          <input
            type="number"
            min="1"
            step="1"
            value={max}
            aria-label="Maximum radius on the slider"
            onChange={(e) => changeMax(e.target.value)}
          />
          <span className="range-slider__max-suffix">&nbsp;mi</span>
        </label>
      </div>
    </div>
  );
}

export default TravelRadiusField;
