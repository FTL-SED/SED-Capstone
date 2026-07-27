// Pure, dependency-free. Turns a reshaped itinerary (models/itineraries.js shape)
// into structured text data. Consumers own final formatting: the PDF service draws
// each line; a clipboard consumer would join them with "\n". Missing fields are
// omitted rather than rendered as "undefined" (matches the engine's don't-punish
// convention). Stop times are ISO in Pacific wall-clock, shown as HH:MM in that zone.

const TIME_ZONE = 'America/Los_Angeles'

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TIME_ZONE,
  })
}

function fmtDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: TIME_ZONE,
  })
}

function buildSubtitle(itinerary) {
  const segments = []
  const date = fmtDate(itinerary.tripDate)
  if (date) segments.push(date)
  if (itinerary.location) segments.push(itinerary.location)
  if (itinerary.dayStart && itinerary.dayEnd) {
    segments.push(`${itinerary.dayStart}–${itinerary.dayEnd}`)
  }
  if (itinerary.transport) segments.push(itinerary.transport)
  if (typeof itinerary.maxBudgetPerPerson === 'number') {
    segments.push(`~$${itinerary.maxBudgetPerPerson}/person`)
  }
  return segments.join(' · ')
}

function buildLine(pin, index) {
  const times = [fmtTime(pin.startTime), fmtTime(pin.endTime)].filter(Boolean).join('–')
  const category = Array.isArray(pin.tags) && pin.tags.length > 0 ? `  (${pin.tags[0]})` : ''
  let line = `${index + 1}. ${times ? times + '  ' : ''}${pin.name}${category}`
  if (typeof pin.travelTimeToNextMinutes === 'number') {
    line += `\n   ↳ ${pin.travelTimeToNextMinutes} min to next stop`
  }
  return line
}

export function buildItinerarySummary(itinerary) {
  const pins = Array.isArray(itinerary?.pins) ? itinerary.pins : []
  return {
    title: `NavQuest — ${itinerary?.title ?? 'Itinerary'}`,
    subtitle: buildSubtitle(itinerary ?? {}),
    lines: pins.map(buildLine),
  }
}
