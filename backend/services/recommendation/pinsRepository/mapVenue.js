// Phase 3 read-mapper: turns a venue Pin row (explicit columns + real per-day
// hoursOpen) into the plain shape the recommendation engine consumes — the
// venue-only successor to mapPin's tag-derivation + startTime/endTime hours proxy.
//
// Two behaviours it deliberately gets right (see the Phase 2 review landmines):
//   1. cuisines/diets read from the DB as [] on pins with none. The engine's
//      missing-data rule needs UNKNOWN to be `undefined` (keep the pin), never []
//      (which passesDiet/overlap would read as "matches nothing" and could drop
//      it). We funnel both through emptyToUndefined.
//   2. openingHours comes from THIS pin's own hoursOpen for the trip's weekday —
//      we do NOT assume every pin shares one default window. Once real per-day
//      hours are seeded, a pin closed on the trip day yields `null` (caller hard-
//      drops it) and a pin with a real range yields that range; a pin with no
//      hoursOpen at all stays `undefined` (unknown ⇒ keep). See utils/hours.js.
import { emptyToUndefined } from '../../../config/tagVocab.js'
import { parseDayHours, dayKeyFromDate } from '../../../utils/hours.js'

// Pure: (venue Pin row, trip date 'YYYY-MM-DD') -> engine pin shape.
// openingHours is one of:
//   - [{ open, close }]  a real range for the trip's weekday
//   - null               the pin is explicitly closed that weekday (caller drops)
//   - undefined          hours unknown for this pin (caller keeps + flags)
function mapVenue(pin, tripDate) {
  const dayKey = dayKeyFromDate(tripDate)
  return {
    id: pin.id,
    name: pin.name,
    category: pin.category,
    // Full tag list stays available for activity tag-overlap matching, exactly
    // as the engine matches today. interests/cuisines/diets are the explicit
    // split; tags remains the superset until it's dropped in a later phase.
    tags: pin.tags ?? [],
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

export { mapVenue }
