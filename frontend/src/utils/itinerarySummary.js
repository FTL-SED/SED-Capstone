// Pure, dependency-free. Formats the loaded itinerary (the GET /itineraries/:id
// reshaped shape) into a plain-text summary for the clipboard. Kept separate from
// the backend's copy (which feeds the PDF) — each side already has the data, so a
// small duplicated pure function avoids a network round-trip just to copy. Times
// are ISO in Pacific wall-clock; shown as HH:MM in that zone (matches WrittenItinerary).

const TIME_ZONE = 'America/Los_Angeles'

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TIME_ZONE,
  })
}

function buildSubtitle(itinerary) {
  const segments = []
  if (itinerary.location) segments.push(itinerary.location)
  if (itinerary.dayStart && itinerary.dayEnd) segments.push(`${itinerary.dayStart}–${itinerary.dayEnd}`)
  if (itinerary.transport) segments.push(itinerary.transport)
  if (typeof itinerary.maxBudgetPerPerson === 'number') segments.push(`~$${itinerary.maxBudgetPerPerson}/person`)
  return segments.join(' · ')
}

function buildLine(pin, index) {
  const times = [fmtTime(pin.startTime), fmtTime(pin.endTime)].filter(Boolean).join('–')
  const category = Array.isArray(pin.tags) && pin.tags.length > 0 ? `  (${pin.tags[0]})` : ''
  let line = `${index + 1}. ${times ? times + '  ' : ''}${pin.name}${category}`
  if (typeof pin.travelTimeToNextMinutes === 'number') line += `\n   ↳ ${pin.travelTimeToNextMinutes} min to next stop`
  return line
}

export function buildItinerarySummaryText(itinerary) {
  const pins = Array.isArray(itinerary?.pins) ? itinerary.pins : []
  const header = [`NavQuest — ${itinerary?.title ?? 'Itinerary'}`, buildSubtitle(itinerary ?? {})]
    .filter(Boolean)
    .join('\n')
  const body = pins.map(buildLine).join('\n')
  return body ? `${header}\n\n${body}` : header
}
