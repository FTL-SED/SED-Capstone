// Pure helpers for a user's saved preferences — the shape the onboarding wizard
// and the profile preferences editor both edit, and the mapping to/from the
// backend's PUT /users/:id/preferences body. No network here, so it's unit-
// testable (mirrors CreateItineraryPage/buildRequest.js).
//
// In the UI, cuisines + dietary needs live in ONE flat `foodPrefs` array (same
// as a wizard MemberCard), sliced by vocab membership for display. The backend
// stores them in two columns (`foodPrefs` = cuisines, `diets`), so we split on
// the way out and merge on the way in.
import { CUISINE_TAGS, DIET_TAGS } from '../api/vocab.js'

const DIET_SET = new Set(DIET_TAGS)
const CUISINE_SET = new Set(CUISINE_TAGS)

// A blank preferences form. `location` is { label, latitude, longitude } | null,
// exactly what AddressPicker yields, so it can be snapshotted into a group member
// without re-geocoding.
export const INITIAL_PREFS = {
  interestTags: [],
  foodPrefs: [], // flat: cuisines + diets combined (like MemberCard)
  location: null,
  isPublic: false,
}

// Split the flat foodPrefs into the backend's two fields. Anything not a known
// diet is treated as a cuisine (matches MemberCard's cuisine/diet slicing).
export function splitFood(foodPrefs = []) {
  return {
    foodPrefs: foodPrefs.filter((t) => !DIET_SET.has(t)),
    diets: foodPrefs.filter((t) => DIET_SET.has(t)),
  }
}

// Merge the backend's separate cuisines + diets back into one flat array for the
// editor UI. Keeps only recognized tags so a stray value can't break the pills.
export function mergeFood(foodPrefs = [], diets = []) {
  const cuisines = foodPrefs.filter((t) => CUISINE_SET.has(t))
  const dietary = diets.filter((t) => DIET_SET.has(t))
  return [...cuisines, ...dietary]
}

// Map a preferences form → the PUT /users/:id/preferences request body. The
// location becomes `defaultStartLocation` ({ label, latitude, longitude } | null)
// so label + coords travel together.
export function buildPreferencesPayload(prefs) {
  const { foodPrefs, diets } = splitFood(prefs.foodPrefs)
  const loc = prefs.location
  return {
    isPublic: !!prefs.isPublic,
    interestTags: prefs.interestTags ?? [],
    foodPrefs,
    diets,
    defaultStartLocation: loc
      ? { label: loc.label, latitude: loc.latitude, longitude: loc.longitude }
      : null,
  }
}

// Map a backend preferences record (or a public search snapshot) → the flat
// form/member shape the UI uses. Used by the profile editor (to seed the form)
// and by "add group member by username" (to snapshot a user's prefs).
export function prefsFromRecord(rec = {}) {
  const hasCoords =
    typeof rec.defaultStartLat === 'number' && typeof rec.defaultStartLng === 'number'
  return {
    interestTags: rec.interestTags ?? [],
    foodPrefs: mergeFood(rec.foodPrefs, rec.diets),
    location: rec.defaultStartLabel && hasCoords
      ? { label: rec.defaultStartLabel, latitude: rec.defaultStartLat, longitude: rec.defaultStartLng }
      : null,
    isPublic: !!rec.isPublic,
  }
}
