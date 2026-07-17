// Pure mapper: wizard `form` state → the POST /recommendations request body.
// Uses the backend's group-level shape (validateRecommendationInput expands it
// into one member per starting coordinate). No network, so it's unit-testable.
// See .claude/roadmap/frontend-backend-integration.md (Step 6).

// Build the { trip, group } body. Number fields are coerced; travelRadius is
// OMITTED when blank (the backend rejects 0 / "" — it must be a positive number
// or absent). startingLocations carry { latitude, longitude } from the picker.
export function buildRecommendationBody(form) {
  const trip = {
    startTime: form.startTime,
    endTime: form.endTime,
    maxBudgetPerPerson: Number(form.budget),
  };
  if (form.transport) trip.transport = form.transport;

  const radius = Number(form.travelRadius);
  if (form.travelRadius !== '' && Number.isFinite(radius) && radius > 0) {
    trip.travelRadius = radius;
  }

  const group = {
    startingCoordinates: form.startingLocations.map(({ latitude, longitude }) => ({
      latitude,
      longitude,
    })),
    interestTags: form.interestTags,
    foodPrefs: form.foodPrefs,
  };

  return { trip, group };
}
