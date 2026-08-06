// STAGE 4 post-processing: turn the narrator model's reply into (a) a validated
// visit order and (b) the human-readable text. The model only re-orders the
// pre-selected places and writes prose — it cannot add, drop, or reprice a
// place — so "validating" its reply is just confirming the order is a clean
// permutation of the selected ids. Anything off → we use the deterministic
// default order, so a bad or missing reply never breaks the day.
import { sanitizeText } from '../sanitizeText.js'

// Is `order` a permutation of exactly the selected ids (no extras, no missing,
// no dupes)? That's the only thing the model could get wrong about the order.
const isValidOrder = (order, defaultOrder) => {
  if (!Array.isArray(order) || order.length !== defaultOrder.length) return false
  const want = new Set(defaultOrder)
  const seen = new Set()
  for (const id of order) {
    if (!want.has(id) || seen.has(id)) return false
    seen.add(id)
  }
  return true
}

// Choose the order to schedule: the model's if it's a clean permutation, else
// the deterministic default (Stage 2's own order). Never throws.
const resolveOrder = (reply, defaultOrder) =>
  isValidOrder(reply?.order, defaultOrder) ? reply.order : defaultOrder

// Extract sanitized prose from the reply, with safe fallbacks. Times/dashes are
// normalized here (the model's style rules are best-effort). `notes` is a map of
// pinId -> note; missing notes just yield no note on that stop.
const resolveNarration = (reply, { fallbackTitle, fallbackDescription, fallbackLocation }) => {
  const title = typeof reply?.title === 'string' && reply.title.trim() ? sanitizeText(reply.title) : fallbackTitle
  const description =
    typeof reply?.description === 'string' && reply.description.trim()
      ? sanitizeText(reply.description)
      : fallbackDescription
  const notes = new Map()
  if (reply?.notes && typeof reply.notes === 'object') {
    for (const [id, note] of Object.entries(reply.notes)) {
      if (typeof note === 'string' && note.trim()) notes.set(Number(id), sanitizeText(note))
    }
  }
  return { title, description, location: fallbackLocation, notes }
}

export { isValidOrder, resolveOrder, resolveNarration }
