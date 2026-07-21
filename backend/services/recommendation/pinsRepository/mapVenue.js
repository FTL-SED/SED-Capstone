// Read-mapper: turns a venue Pin row (explicit columns + per-day hoursOpen) into
// the plain shape the recommendation engine consumes.
//
// Two behaviours it deliberately gets right:
//   1. cuisines/diets/interests read from the DB as [] on pins with none. The
//      engine's missing-data rule needs UNKNOWN to be `undefined` (keep the pin),
//      never [] (which passesDiet/overlap would read as "matches nothing" and
//      could drop it). We funnel all three through emptyToUndefined.
//   2. openingHours comes from THIS pin's own hoursOpen for the trip's weekday —
//      we do NOT assume every pin shares one default window. A pin closed on the
//      trip day yields `null` (caller hard-drops it), a pin with a real range
//      yields that range, and a pin with no hoursOpen stays `undefined` (unknown
//      ⇒ keep). See utils/hours.js.
import { parseDayHours, dayKeyFromDate } from '../../../utils/hours.js'

// The engine's missing-data rule needs UNKNOWN to be `undefined`, never `[]`: an
// empty diet/cuisine/interests list must read as "we don't know" (keep the pin),
// not "confirmed to serve/match nothing" (which would wrongly drop it). The Pin
// table's array columns default to `[]` on rows that were never populated, so
// every column mapped below funnels through this.
function emptyToUndefined(arr) {
  return Array.isArray(arr) && arr.length > 0 ? arr : undefined
}

// Pure: (venue Pin row, trip date 'YYYY-MM-DD') -> engine pin shape.
// openingHours is one of:
//   - [{ open, close }]  a real range for the trip's weekday
//   - null               the pin is explicitly closed that weekday (caller drops)
//   - undefined          hours unknown for this pin (caller keeps + flags)
// `dayKey` is derived from tripDate by default; callers mapping a whole catalog
// (getAllPins) resolve it ONCE and pass it in, so the same date isn't re-parsed
// for every pin.
function mapVenue(pin, tripDate, dayKey = dayKeyFromDate(tripDate)) {
  return {
    id: pin.id,
    name: pin.name,
    category: pin.category,
    // Split fields are exposed (interests/cuisine/diet) for the engine's
    // activity and food matching. The legacy tags field has been dropped.
    interests: emptyToUndefined(pin.interests),
    cuisine: emptyToUndefined(pin.cuisines),
    diet: emptyToUndefined(pin.diets),
    rating: pin.rating ?? undefined,
    pricePerPerson: pin.pricePerPerson,
    latitude: pin.latitude,
    longitude: pin.longitude,
    address: pin.address,
    locationImageUrl: pin.locationImageUrl,
    openingHours: parseDayHours(pin.hoursOpen, dayKey),
  }
}

export { mapVenue, emptyToUndefined }
