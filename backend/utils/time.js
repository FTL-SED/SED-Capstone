// Helpers for converting between a clock time like "14:30" and the number of
// minutes since midnight (14:30 -> 870). Working in plain minutes makes it easy
// to add travel time, compare times, and check ordering.

// "HH:MM" -> minutes since midnight.
function toMinutes(hhmm) {
  const [hours, mins] = hhmm.split(':').map(Number)
  return hours * 60 + mins
}

// Minutes since midnight -> "HH:MM" (zero-padded, e.g. 9 * 60 -> "09:00").
function toHHMM(totalMins) {
  const hours = Math.floor(totalMins / 60)
  const mins = Math.round(totalMins % 60)
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

export { toMinutes, toHHMM }
