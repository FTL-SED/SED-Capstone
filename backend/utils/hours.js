// Parses the per-day hoursOpen JSON ({ mon: "08:00-22:00", ..., sun: null })
// into the interval shape the recommendation engine already consumes.
// Three outcomes, matching the engine's missing-data rules:
//   - a day with a valid "HH:MM-HH:MM" range → [{ open, close }]
//   - a day explicitly null                  → null  (definitely closed)
//   - hoursOpen absent, day absent, or bad   → undefined (unknown ⇒ keep upstream)
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const RANGE_RE = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/

// The weekday of a YYYY-MM-DD calendar date is timezone-independent, so we
// anchor the probe at UTC noon and read getUTCDay(). Noon keeps us far from any
// midnight boundary, and using UTC on both sides means no offset (and no DST) is
// involved. Do NOT reuse this for wall-clock times — it only yields the day key.
function dayKeyFromDate(dateISO) {
  const probe = new Date(`${dateISO}T12:00:00Z`)
  return DAY_KEYS[probe.getUTCDay()]
}

function parseDayHours(hoursOpen, dayKey) {
  if (!hoursOpen || typeof hoursOpen !== 'object') return undefined
  if (!(dayKey in hoursOpen)) return undefined
  const value = hoursOpen[dayKey]
  if (value === null) return null
  if (typeof value !== 'string' || !RANGE_RE.test(value)) return undefined
  const [open, close] = value.split('-')
  return [{ open, close }]
}

export { parseDayHours, dayKeyFromDate }
