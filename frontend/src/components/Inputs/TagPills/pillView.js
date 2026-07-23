// Pure logic for TagPills' collapse/expand behavior, split out so it can be
// unit-tested under `node --test` (which can't parse the .jsx component).
//
// Rule: collapsing must never hide a pill the user already selected. The
// collapsed view = the first `collapsedCount` options PLUS any selected option
// past that cutoff (pinned), in original order. `overflow` (shown only when
// expanded) is the still-hidden remainder — always unselected, so the "+N"
// count stays truthful.
export function computePillView({ options = [], selected = [], collapsedCount }) {
  const truncates =
    collapsedCount != null && collapsedCount < options.length
  if (!truncates) {
    return { alwaysVisible: options, overflow: [], hasToggle: false }
  }

  const top = options.slice(0, collapsedCount)
  const topSet = new Set(top)
  const pinned = options.filter(
    (o) => !topSet.has(o) && selected.includes(o)
  )
  const alwaysVisible = [...top, ...pinned]
  const visibleSet = new Set(alwaysVisible)
  const overflow = options.filter((o) => !visibleSet.has(o))

  return { alwaysVisible, overflow, hasToggle: overflow.length > 0 }
}
