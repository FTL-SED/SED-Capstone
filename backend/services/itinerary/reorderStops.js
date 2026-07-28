// Recompute an itinerary's schedule after the owner drags its stops into a new
// order. Pure: takes the stops already in the desired order and returns the DB
// rows to persist (new order + recomputed times + travel legs). The controller
// owns loading/validating/persisting; this owns the shape bridge + reschedule.
//
// The scheduler (rescheduleStops) works in "HH:MM" and would HOLD a meal until
// its window opens. On a MANUAL reorder we honor the dragged order literally, so
// mealType is stripped from the scheduling input (no holding, no day-fill). The
// stored row still keeps mealType for display — see the re-attach below.
import { rescheduleStops } from '../ai/fallback/schedule.js'
import { stopsToStops, fromDateTime, pacificDayISO } from './persist.js'

// orderedStops = stops already in the desired order:
//   { id, pin: { id, latitude, longitude }, startTime, endTime, mealType, note }
// options = { dayStart?: 'HH:MM', transport?: string, tripDate?: 'YYYY-MM-DD' }
// Returns rows: { id, orderInItinerary, startTime, endTime,
//                 travelTimeToNextMinutes, distanceToNextMeters }
function computeReorder(orderedStops, { dayStart, transport, tripDate } = {}) {
  if (orderedStops.length === 0) return []

  // Bridge to the scheduler's domain: HH:MM arrive/depart + pin for coords.
  // mealType is intentionally omitted so no stop is held to a meal window.
  const schedIn = orderedStops.map((s) => ({
    id: s.id,
    pinId: s.pin.id,
    pin: s.pin,
    arriveTime: fromDateTime(s.startTime),
    departTime: fromDateTime(s.endTime),
  }))

  const startTime = dayStart || schedIn[0].arriveTime
  // Re-walk the clock only: no windowEndElapsed => no day-fill.
  const scheduled = rescheduleStops(schedIn, (s) => s.pin, startTime, transport ?? undefined)

  // Anchor the calendar day: the explicit tripDate, else the Pacific day of the
  // earliest existing stop (keeps the itinerary on its original day).
  const dayISO =
    tripDate ||
    pacificDayISO(
      orderedStops.reduce(
        (min, s) => (new Date(s.startTime) < new Date(min) ? s.startTime : min),
        orderedStops[0].startTime
      )
    )

  // Re-attach mealType/note so the persisted row keeps them (only the SCHEDULING
  // input dropped mealType), then convert HH:MM -> ISO with stopsToStops (which
  // sets orderInItinerary = index and handles the midnight roll + DST offset).
  const forPersist = scheduled.map((s, i) => ({
    ...s,
    mealType: orderedStops[i].mealType ?? undefined,
    note: orderedStops[i].note ?? undefined,
  }))
  const shortlist = orderedStops.map((s) => s.pin)
  const rows = stopsToStops(forPersist, shortlist, dayISO)

  // Re-attach the ItineraryStop id (stopsToStops keys by pinId and drops id).
  return rows.map((r, i) => ({
    id: orderedStops[i].id,
    orderInItinerary: r.orderInItinerary,
    startTime: r.startTime,
    endTime: r.endTime,
    travelTimeToNextMinutes: r.travelTimeToNextMinutes,
    distanceToNextMeters: r.distanceToNextMeters,
  }))
}

export { computeReorder }
