// Helpers for converting between a clock time like "14:30" and the number of
// minutes since midnight (14:30 -> 870). Working in plain minutes makes it easy
// to add travel time, compare times, and check ordering.

const MINUTES_PER_DAY = 24 * 60

// "HH:MM" -> minutes since midnight.
function toMinutes(hhmm) {
  const [hours, mins] = hhmm.split(':').map(Number)
  return hours * 60 + mins
}

// Minutes since midnight -> "HH:MM" (zero-padded, e.g. 9 * 60 -> "09:00").
// Wraps past 24h back into a wall-clock time (1500 min -> "01:00"), so an
// overnight schedule that runs past midnight still renders a valid clock time.
function toHHMM(totalMins) {
  const wrapped = ((Math.round(totalMins) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const hours = Math.floor(wrapped / 60)
  const mins = wrapped % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

// Length of a trip window in minutes, treating endTime <= startTime as crossing
// midnight (end is the next day). 09:00->18:00 = 540; 22:00->02:00 = 240;
// a full 24h window (start == end) reads as 0 here — callers requiring a
// positive span reject that separately.
function windowLengthMinutes(startTime, endTime) {
  return ((toMinutes(endTime) - toMinutes(startTime)) + MINUTES_PER_DAY) % MINUTES_PER_DAY
}

// Map a wall-clock "HH:MM" to ELAPSED minutes since the trip's start, so times
// after midnight sort after the evening. A time at/after start counts as day 0;
// a time before start is assumed to be the next day (+1440). E.g. with start
// 22:00: 22:00->0, 23:30->90, 00:30->150, 02:00->240. On a same-day trip
// (start 09:00) 10:00->60 and nothing wraps, so same-day math is unchanged.
function minutesFromStart(startTime, hhmm) {
  return ((toMinutes(hhmm) - toMinutes(startTime)) + MINUTES_PER_DAY) % MINUTES_PER_DAY
}

export { toMinutes, toHHMM, windowLengthMinutes, minutesFromStart, MINUTES_PER_DAY }
