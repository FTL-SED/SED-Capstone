// Deterministic safety net for the itinerary's human-readable text. The system
// prompt asks the model to avoid 24-hour times and em/en dashes (see
// generation/prompt.js), but models slip, so we normalize the text ourselves
// before it's persisted/shown. Applied to BOTH the AI and fallback output so the
// user never sees "14:00" or an em dash regardless of which path produced it.

// Convert a single 24-hour "H:MM" / "HH:MM" to 12-hour "h[:MM]am/pm".
// Whole hours drop the ":00" (14:00 -> "2pm"); otherwise keep minutes ("2:30pm").
const to12h = (hh, mm) => {
  const h = Number(hh)
  const m = Number(mm)
  const period = h < 12 ? 'am' : 'pm'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, '0')}${period}`
}

// Rewrite 24-hour clock times (HH:MM) to 12-hour am/pm. Fires only on values
// that read as military time, so a genuinely ambiguous 12-hour token the model
// already wrote ("2:30", which could be pm) is left alone — mis-guessing its
// period would be worse than leaving it. Skips anything already followed by
// am/pm so we never double-convert.
const fixMilitaryTime = (text) =>
  text.replace(/\b(\d{1,2}):([0-5]\d)\b(?!\s*[ap]\.?m\.?)/gi, (match, hh, mm) => {
    const h = Number(hh)
    if (h > 23) return match // not a clock time (e.g. a score/ratio)
    // Rewrite when it's unambiguously military — an afternoon/evening hour
    // (13-23), midnight (00), or a zero-padded morning hour ("08:30") — OR a
    // whole hour like "10:00", which in prose reads as a clock time, not "10".
    // A bare afternoon "2:30" (non-padded, real minutes) stays untouched.
    const isMilitary = h >= 13 || h === 0 || /^0\d$/.test(hh) || Number(mm) === 0
    return isMilitary ? to12h(hh, mm) : match
  })

// Remove em (—) and en (–) dashes. A dash between two numbers/times is a range
// ("10:00–14:00" -> "10:00 to 14:00"); elsewhere it's punctuation, so collapse
// the dash (and any surrounding spaces) to a single comma + space.
const fixDashes = (text) =>
  text
    .replace(/(\d)\s*[—–]\s*(\d)/g, '$1 to $2')
    .replace(/\s*[—–]\s*/g, ', ')

// Normalize one free-text field. Order matters: fix dashes first (so a time
// range becomes "... to ..."), then rewrite any 24-hour times to 12-hour.
const sanitizeText = (value) => {
  if (typeof value !== 'string') return value
  return fixMilitaryTime(fixDashes(value))
}

// Apply the sanitizer to every human-readable field of a feasible itinerary:
// title, location, description, and each stop's note. Non-feasible results and
// non-text fields pass through untouched. Returns a new object (no mutation).
const sanitizeItineraryText = (itinerary) => {
  if (!itinerary || typeof itinerary !== 'object' || itinerary.feasible === false) {
    return itinerary
  }
  return {
    ...itinerary,
    title: sanitizeText(itinerary.title),
    location: sanitizeText(itinerary.location),
    description: sanitizeText(itinerary.description),
    stops: Array.isArray(itinerary.stops)
      ? itinerary.stops.map((s) =>
          s && typeof s === 'object' && typeof s.note === 'string'
            ? { ...s, note: sanitizeText(s.note) }
            : s,
        )
      : itinerary.stops,
  }
}

export { sanitizeText, sanitizeItineraryText }
