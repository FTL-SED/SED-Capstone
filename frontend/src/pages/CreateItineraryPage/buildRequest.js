// Pure mapper: wizard `form` state → the POST /recommendations request body.
// Emits the backend's native per-member shape ({ trip, members }). No network,
// so it's unit-testable. See .claude/roadmap/frontend-backend-integration.md.
import { DIET_TAGS } from '../../api/vocab.js';

const DIET_SET = new Set(DIET_TAGS);

// Build the { trip, members } body. Number fields are coerced; travelRadius is
// OMITTED when blank (the backend rejects 0 / "" — it must be a positive number
// or absent). Each member contributes its own startLocation coordinate + prefs.
export function buildRecommendationBody(form) {
  const trip = {
    startTime: form.startTime,
    endTime: form.endTime,
    maxBudgetPerPerson: Number(form.budget),
  };
  if (form.transport) trip.transport = form.transport;

  // Meals opt-in/out. Default (undefined form field) is to include meals, so
  // only the explicit false needs sending — but send the boolean for clarity.
  trip.includeMeals = form.includeMeals !== false;

  const radius = Number(form.travelRadius);
  if (form.travelRadius !== '' && Number.isFinite(radius) && radius > 0) {
    trip.travelRadius = radius;
  }

  const members = form.members.map((m, i) => {
    // MemberCard stores cuisines + dietary needs in one flat foodPrefs array;
    // the backend wants them separate — foodPrefs drives cuisine matching, diet
    // drives diet-safety filtering. Route each tag to the right field so a
    // dietary need (vegan/halal/…) isn't mis-sent as a cuisine (and dropped).
    const prefs = m.foodPrefs ?? [];
    return {
      name: m.name?.trim() || `Member ${i + 1}`,
      startLocation: {
        latitude: m.location.latitude,
        longitude: m.location.longitude,
      },
      interestTags: m.interestTags,
      foodPrefs: prefs.filter((t) => !DIET_SET.has(t)),
      diet: prefs.filter((t) => DIET_SET.has(t)),
    };
  });

  return { trip, members };
}
