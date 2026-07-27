// Pure, dependency-free. Turns a reshaped itinerary (models/itineraries.js shape)
// into structured text data. Consumers own final formatting: the PDF service draws
// each line; a clipboard consumer would join them with "\n". Missing fields are
// omitted rather than rendered as "undefined" (matches the engine's don't-punish
// convention). Stop times are ISO in Pacific wall-clock, shown in 12-hour am/pm.

const TIME_ZONE = 'America/Los_Angeles'

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
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

// Structured variant for the PDF renderer: instead of one pre-joined string per
// stop, expose the raw parts so the PDF can style each independently (bold name,
// muted category, a time chip, a small travel sub-line). Missing fields come back
// as '' / null so the renderer can simply skip them — same don't-punish convention.
export function buildItinerarySummaryData(itinerary) {
  const pins = Array.isArray(itinerary?.pins) ? itinerary.pins : []
  return {
    brand: 'NavQuest',
    title: itinerary?.title ?? 'Itinerary',
    subtitle: buildSubtitle(itinerary ?? {}),
    stops: pins.map((pin, index) => ({
      index: index + 1,
      time: [fmtTime(pin.startTime), fmtTime(pin.endTime)].filter(Boolean).join('–'),
      name: pin.name ?? '',
      category:
        Array.isArray(pin.tags) && pin.tags.length > 0 ? pin.tags[0] : '',
      travelToNext:
        typeof pin.travelTimeToNextMinutes === 'number'
          ? pin.travelTimeToNextMinutes
          : null,
    })),
  }
}
