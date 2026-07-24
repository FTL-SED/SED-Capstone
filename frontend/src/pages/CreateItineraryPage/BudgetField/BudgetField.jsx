import './BudgetField.css'
import { useState } from 'react'

// A slider for the average per-person budget, in $5 steps. Stores the numeric
// string the field used before (buildRequest coerces via Number), so nothing
// downstream changes. The upper bound is editable, so a user who needs more
// than the default ceiling can raise it instead of being capped.
const BUDGET_STEP = 5;
const DEFAULT_MAX = 50;

function BudgetField({ form, update }) {
  const [max, setMax] = useState(DEFAULT_MAX);
  const current = form.budget === '' ? 0 : Number(form.budget);
  const fillPct = max > 0 ? Math.min(100, (current / max) * 100) : 0;

  // Editing the ceiling: keep it positive; if the current value now exceeds the
  // new ceiling, pull the value down to match so the thumb stays in range.
  const changeMax = (raw) => {
    const next = Math.max(BUDGET_STEP, Math.round(Number(raw) || 0));
    setMax(next);
    if (current > next) update('budget', String(next));
  };

  return (
    <div className="budget-field">
      <div className="budget-field__head">
        <h2>Budget <span className="field-required" aria-label="required">*</span></h2>
        <span className="budget-field__readout">${current}<span className="budget-field__unit"> / person</span></span>
      </div>
      <input
        className="range-slider"
        type="range"
        min="0"
        max={max}
        step={BUDGET_STEP}
        value={Math.min(current, max)}
        aria-label="Average budget per person in dollars"
        style={{ '--fill': `${fillPct}%` }}
        onChange={(e) => update('budget', e.target.value)}
      />
      <div className="range-slider__ticks">
        <span>$0</span>
        <label className="range-slider__max">
          <span className="range-slider__max-prefix">Max&nbsp;$</span>
          <input
            type="number"
            min={BUDGET_STEP}
            step={BUDGET_STEP}
            value={max}
            aria-label="Maximum budget on the slider"
            onChange={(e) => changeMax(e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}

export default BudgetField;
