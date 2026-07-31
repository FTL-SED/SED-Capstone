// Factory for a blank member in the Create-Itinerary wizard: a name, one
// starting location, and that member's own interests + food prefs. Kept in its
// own module so both the wizard (initial state) and the Members step (adding a
// member) can share it without tripping react-refresh's component-only rule.
import { prefsFromRecord } from '../../lib/preferences.js'

export const newMember = () => ({
  name: '',
  location: null, // { label, latitude, longitude }
  interestTags: [],
  foodPrefs: [],
})

// Build a member from a public user's search snapshot. The copied preferences
// are an INDEPENDENT snapshot — editing this member later never touches the
// original user's saved preferences. Name defaults to their username (editable).
// `snapshot` is a public user record from GET /users/search; prefsFromRecord
// maps its columns into the flat member shape (merging cuisines + diets into one
// foodPrefs array and rebuilding the location triple).
export const memberFromUser = (snapshot) => {
  const prefs = prefsFromRecord(snapshot)
  return {
    name: snapshot.username ?? '',
    location: prefs.location,
    interestTags: prefs.interestTags,
    foodPrefs: prefs.foodPrefs,
  }
}
