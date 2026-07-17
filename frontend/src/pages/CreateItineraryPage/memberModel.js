// Factory for a blank member in the Create-Itinerary wizard: a name, one
// starting location, and that member's own interests + food prefs. Kept in its
// own module so both the wizard (initial state) and the Members step (adding a
// member) can share it without tripping react-refresh's component-only rule.
export const newMember = () => ({
  name: '',
  location: null, // { label, latitude, longitude }
  interestTags: [],
  foodPrefs: [],
})
