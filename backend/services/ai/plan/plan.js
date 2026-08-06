// STAGE 2 — Constraint solver / selector. Turns the recommendation engine's
// ranked shortlist into the EXACT set of places for one day, already valid on
// every deterministic constraint (budget, meal coverage, window fit). The LLM
// downstream only RE-ORDERS this set and writes prose — it never chooses places,
// times, or budget — so the day can't be made infeasible by the model.
//
// Selection reuses the deterministic sequencer (fallbackSequence): it already
// picks a budget-fitting, meal-covered, window-filling day. We read back which
// pins it used (in its own order) as the selection + the default order, then
// annotate each pin with the few fields the LLM needs to order well.
import { fallbackSequence } from '../fallback/fallback.js'
import { stopDurationFor, CATEGORY } from '../../../config/ai.js'
import { neighborhoodOf } from './area.js'

// A compact place record for the LLM: only fields that materially help ORDERING
// and NARRATION. Coordinates, price, opening hours, and scores are intentionally
// omitted — the backend owns all routing/budget/feasibility, so the model can't
// misuse them and the prompt stays small. `mealBlock` tells the model which
// stops anchor lunch/dinner; `durationMinutes` lets it respect long vs short
// stops when ordering (the backend still owns the actual clock).
const toPlanPlace = (pin, mealBlock) => ({
  id: pin.id,
  name: pin.name,
  category: pin.category,
  area: neighborhoodOf(pin),
  durationMinutes: stopDurationFor(pin),
  mealBlock: mealBlock ?? null,
  tags: [...(pin.interests ?? []), ...(pin.cuisine ?? []), ...(pin.diet ?? [])].slice(0, 4),
})

// Build the day plan from the shortlist + constraints.
// Returns one of:
//   { feasible: false, reason }                    — no day fits (from selection)
//   { feasible: true, places[], defaultOrder[], selected[], mealById }
//     places      = annotated records for the LLM prompt
//     defaultOrder= pinIds in the deterministic sequencer's order (the floor)
//     selected    = the chosen pins (full objects, for scheduling/re-hydration)
//     mealById    = Map pinId -> 'lunch'|'dinner'|'breakfast' for stops the
//                   selection placed as meals (used to re-anchor after LLM order)
const buildPlan = (shortlist, constraints) => {
  const day = fallbackSequence(shortlist, constraints)
  if (day.feasible === false) return day

  // fallbackSequence emits stops in visit order, each tagged mealType when it
  // placed the stop as a meal. Recover the selected pins + their meal roles.
  const byId = new Map(shortlist.map((p) => [p.id, p]))
  const selected = []
  const mealById = new Map()
  for (const stop of day.stops) {
    const pin = byId.get(stop.pinId)
    if (!pin) continue
    selected.push(pin)
    if (stop.mealType) mealById.set(pin.id, stop.mealType)
  }

  const defaultOrder = selected.map((p) => p.id)
  const places = selected.map((pin) => toPlanPlace(pin, mealById.get(pin.id)))

  return { feasible: true, places, defaultOrder, selected, mealById }
}

// Deterministic starting arrival for the day (window start, else a default).
const dayStart = (constraints) => constraints?.timeWindow?.startTime ?? '09:00'

export { buildPlan, toPlanPlace, dayStart, CATEGORY }
