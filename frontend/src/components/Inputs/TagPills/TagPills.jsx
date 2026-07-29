import { useEffect, useId, useRef, useState } from 'react'
import './TagPills.css'
import { computePillView } from './pillView.js'

// Must match the collapse animation duration in TagPills.css.
const COLLAPSE_MS = 200

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
  // While collapsing, keep the overflow pills mounted so they can animate out
  // (an instant unmount would give the reverse of the reveal no chance to play).
  const [collapsing, setCollapsing] = useState(false)
  const collapseTimer = useRef(null)
  const regionId = useId()

  useEffect(() => () => clearTimeout(collapseTimer.current), [])

  const toggleExpanded = () => {
    if (expanded) {
      // Play the exit animation, then unmount the overflow pills.
      setExpanded(false)
      setCollapsing(true)
      clearTimeout(collapseTimer.current)
      collapseTimer.current = setTimeout(() => setCollapsing(false), COLLAPSE_MS)
    } else {
      clearTimeout(collapseTimer.current)
      setCollapsing(false)
      setExpanded(true)
    }
  }

  const toggle = (option) => {
    const isOn = selected.includes(option)
    onChange(isOn ? selected.filter((o) => o !== option) : [...selected, option])
  }

  const { alwaysVisible, overflow, hasToggle } = computePillView({
    options,
    selected,
    collapsedCount,
  })

  // When expanded (or mid-collapse), render every option in its original order —
  // the pinning in computePillView (which floats selected overflow pills up so
  // they aren't hidden when collapsed) would otherwise make a pill jump rows the
  // moment it's selected. Expanded shows everything anyway, so no pinning needed.
  const overflowSet = new Set(overflow)
  const showAll = expanded || collapsing
  const gridPills = showAll ? options : alwaysVisible

  const renderPill = (option, motion = '') => {
    const isOn = selected.includes(option)
    return (
      <button
        key={option}
        type="button"
        className={`tag-pill${isOn ? ' tag-pill--on' : ''}${motion}`}
        aria-pressed={isOn}
        onClick={() => toggle(option)}
      >
        {option}
      </button>
    )
  }

  return (
    <div className="tag-pills" role="group">
      {/* All shown pills live in one equal-column grid so they stay uniform in
          size; overflow pills join the same grid when expanded. */}
      <div
        id={regionId}
        className="tag-pills__grid"
        aria-live="polite"
        aria-label={`${groupLabel}`}
      >
        {gridPills.map((o) => {
          if (!overflowSet.has(o)) return renderPill(o)
          // A selected overflow pill stays after collapse (it gets pinned), so it
          // must NOT animate out — only the pills actually being removed do.
          if (collapsing) return renderPill(o, selected.includes(o) ? '' : ' tag-pill--collapse')
          if (expanded) return renderPill(o, ' tag-pill--reveal')
          return renderPill(o)
        })}
      </div>

      {/* The toggle sits on its own row, always aligned right — never wrapping
          into the pill grid's rows. */}
      {hasToggle && (
        <div className="tag-pills__actions">
          <button
            type="button"
            className="tag-pill tag-pill--more"
            aria-expanded={expanded}
            aria-controls={regionId}
            aria-label={expanded ? `View less ${groupLabel}` : `View ${overflow.length} more ${groupLabel}`}
            onClick={toggleExpanded}
          >
            {expanded ? 'View less' : `View more (+${overflow.length})`}
          </button>
        </div>
      )}
    </div>
  )
}

export default TagPills
