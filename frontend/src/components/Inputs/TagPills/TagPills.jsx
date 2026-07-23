import { useId, useState } from 'react'
import './TagPills.css'
import { computePillView } from './pillView.js'

// Click-to-toggle pills for choosing from a fixed set of options (e.g. the
// engine's interest/food vocab). Clearer and more discoverable than a dropdown:
// every option is visible and selection is one tap.
//   options:        string[] of choices
//   selected:       string[] currently chosen
//   onChange:       (nextSelected) => void
//   collapsedCount: optional — show only this many pills initially, with a
//                   "View more" disclosure for the rest. Omit to show all.
//   groupLabel:     optional noun for the toggle's label ("interests", ...).
// Collapsing never hides a selected pill (see pillView.js).
function TagPills({ options = [], selected = [], onChange, collapsedCount, groupLabel = 'options' }) {
  const [expanded, setExpanded] = useState(false)
  const regionId = useId()

  const toggle = (option) => {
    const isOn = selected.includes(option)
    onChange(isOn ? selected.filter((o) => o !== option) : [...selected, option])
  }

  const { alwaysVisible, overflow, hasToggle } = computePillView({
    options,
    selected,
    collapsedCount,
  })

  const renderPill = (option) => {
    const isOn = selected.includes(option)
    return (
      <button
        key={option}
        type="button"
        className={`tag-pill${isOn ? ' tag-pill--on' : ''}`}
        aria-pressed={isOn}
        onClick={() => toggle(option)}
      >
        {option}
      </button>
    )
  }

  return (
    <div className="tag-pills" role="group">
      {alwaysVisible.map(renderPill)}

      {hasToggle && (
        <button
          type="button"
          className="tag-pill tag-pill--more"
          aria-expanded={expanded}
          aria-controls={regionId}
          aria-label={expanded ? `View less ${groupLabel}` : `View ${overflow.length} more ${groupLabel}`}
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? 'View less' : `View more (+${overflow.length})`}
        </button>
      )}

      {hasToggle && (
        <div
          id={regionId}
          className="tag-pills__overflow"
          hidden={!expanded}
          aria-live="polite"
          aria-label={`More ${groupLabel}`}
        >
          {overflow.map(renderPill)}
        </div>
      )}
    </div>
  )
}

export default TagPills
