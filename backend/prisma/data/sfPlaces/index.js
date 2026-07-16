// Flattened catalog of real San Francisco places, hand-curated for the seeded
// Pin catalog. Split into category files for readability; the loader
// (scripts/seedSfPlaces.js) treats this as one flat array.
import restaurants from './restaurants.js'
import cafesBakeriesDesserts from './cafesBakeriesDesserts.js'
import parksGardensBeaches from './parksGardensBeaches.js'
import cultureLandmarks from './cultureLandmarks.js'
import moreActivities from './moreActivities.js'
import nightlifeAndGames from './nightlifeAndGames.js'

const sfPlaces = [
  ...restaurants,
  ...cafesBakeriesDesserts,
  ...parksGardensBeaches,
  ...cultureLandmarks,
  ...moreActivities,
  ...nightlifeAndGames,
]

export default sfPlaces
