// Parses the per-day hoursOpen JSON ({ mon: "08:00-22:00", ..., sun: null })
// into the interval shape the recommendation engine already consumes.
// Three outcomes, matching the engine's missing-data rules:
//   - a day with a valid "HH:MM-HH:MM" range → [{ open, close }]
//   - a day explicitly null                  → null  (definitely closed)
//   - hoursOpen absent, day absent, or bad   → undefined (unknown ⇒ keep upstream)
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const RANGE_RE = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/

function dayKeyFromDate(dateISO) {
  // Parse as a Pacific-local calendar date; noon avoids any tz edge flipping the day.
  const probe = new Date(`${dateISO}T12:00:00-08:00`)
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
