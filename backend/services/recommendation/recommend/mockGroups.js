// Step 8 fixtures — three mock trip groups (A/B/C) standing in for the OSM
// spike's original mock users (never committed to this repo). Each group is
// built to exercise a different combination of the roadmap's Step 8
// assertions: fairness for a niche member, tight-budget/diet drops, ratings
// breaking ties, and missing-data flags surviving to the final shortlist.
// Data only — no logic, so no accompanying test file.

// --- Group A: museum-going foodie trio, generous budget, full day -----------
// Exercises: diet hard-filter (Wei is vegetarian), ≥3 categories, normal food
// quota without needing floor-fill, an activity outside the group's interests
// (dropped for relevance) and a restaurant open only outside the trip window
// (dropped for hours).
const groupA = {
  trip: { startTime: '09:00', endTime: '19:00', maxBudgetPerPerson: 80 },
  members: [
    { name: 'Priya', startLocation: { latitude: 37.7946, longitude: -122.3999 }, interestTags: ['museum', 'art', 'history'], foodPrefs: ['italian'] },
    { name: 'Marcus', startLocation: { latitude: 37.7946, longitude: -122.3999 }, interestTags: ['museum', 'architecture'], foodPrefs: ['thai'] },
    { name: 'Wei', startLocation: { latitude: 37.7785, longitude: -122.4056 }, interestTags: ['art', 'gallery'], foodPrefs: ['sushi'], diet: ['vegetarian'] },
  ],
  pins: [
    { name: 'SF MoMA', category: 'museum', interests: ['art', 'museum'], rating: 4.6, priceLevel: 2, openingHours: [{ open: '10:00', close: '17:00' }] },
    { name: 'de Young Museum', category: 'museum', interests: ['art', 'museum', 'history'], rating: 4.5, priceLevel: 2 }, // no hours -> hoursUnknown
    { name: 'Legion of Honor', category: 'museum', interests: ['art', 'history'], rating: 4.7, priceLevel: 2, openingHours: [{ open: '09:30', close: '17:15' }] },
    { name: 'Exploratorium', category: 'museum', interests: ['museum', 'science'], rating: 4.6, priceLevel: 3, openingHours: [{ open: '10:00', close: '17:00' }] },
    { name: 'Cable Car Museum', category: 'museum', interests: ['museum', 'history'], priceLevel: 0, openingHours: [{ open: '10:00', close: '18:00' }] }, // no rating -> quality default
    { name: 'Chinatown Gallery', category: 'gallery', interests: ['art', 'gallery'], rating: 4.2, openingHours: [{ open: '11:00', close: '18:00' }] }, // no priceLevel -> priceUnknown
    { name: 'Coit Tower', category: 'landmark', interests: ['history', 'architecture'], rating: 4.5, priceLevel: 1, openingHours: [{ open: '10:00', close: '17:00' }] },
    { name: 'Palace of Fine Arts', category: 'landmark', interests: ['architecture', 'history'], rating: 4.8, priceLevel: 0 },
    { name: 'Ferry Building', category: 'landmark', interests: ['architecture'] }, // fully missing rating/price/hours
    { name: 'Golden Gate Park', category: 'park', interests: ['park'], rating: 4.8, priceLevel: 0, openingHours: [{ open: '05:00', close: '22:00' }] }, // no interest overlap -> dropped

    { name: "Original Joe's", category: 'restaurant', cuisine: ['italian'], rating: 4.3, priceLevel: 2, diet: ['vegetarian'], openingHours: [{ open: '11:00', close: '22:00' }] },
    { name: 'Thai House', category: 'restaurant', cuisine: ['thai'], rating: 4.4, priceLevel: 2, diet: ['vegetarian', 'vegan'], openingHours: [{ open: '11:00', close: '21:00' }] },
    { name: 'Sushi Zone', category: 'restaurant', cuisine: ['sushi'], rating: 4.6, priceLevel: 3, diet: ['vegetarian'] },
    { name: 'North Beach Pizza', category: 'restaurant', cuisine: ['italian'], priceLevel: 1, diet: ['vegetarian'], openingHours: [{ open: '11:00', close: '23:00' }] },
    { name: 'Bangkok Kitchen', category: 'restaurant', cuisine: ['thai'], rating: 4.1, priceLevel: 2 }, // diet unknown -> kept
    { name: 'Sushi Hana', category: 'restaurant', cuisine: ['sushi'], rating: 4.5, priceLevel: 2, diet: ['vegetarian', 'vegan'], openingHours: [{ open: '12:00', close: '21:30' }] },
    { name: 'Meat & Grill BBQ', category: 'restaurant', cuisine: ['bbq'], rating: 4.0, priceLevel: 3, diet: [] }, // no vegetarian -> dropped
    { name: 'Vegan Vibes', category: 'restaurant', cuisine: ['vegan'], rating: 4.7, priceLevel: 2, diet: ['vegan', 'vegetarian'], openingHours: [{ open: '10:00', close: '20:00' }] },
    { name: 'Ramen House', category: 'restaurant', cuisine: ['ramen'], rating: 4.2, priceLevel: 2, diet: ['vegetarian'] },
    { name: 'Steakhouse Prime', category: 'restaurant', cuisine: ['steak'], rating: 4.5, priceLevel: 4, diet: [] }, // no vegetarian -> dropped
    { name: 'Late Night Diner', category: 'restaurant', cuisine: ['american'], priceLevel: 1, diet: ['vegetarian'], openingHours: [{ open: '22:00', close: '02:00' }] }, // outside 09:00-19:00 -> dropped
  ],
}

// --- Group B: budget-conscious outdoorsy quartet, tight budget, half day ---
// Exercises: fairness injection (Nadia's birdwatching interest is niche and
// low-scoring), an activity dropped for blowing the absolute budget, and
// restaurants dropped for both budget and vegan diet (Jess).
const groupB = {
  trip: { startTime: '10:00', endTime: '16:00', maxBudgetPerPerson: 25 },
  members: [
    { name: 'Sam', startLocation: { latitude: 37.7801, longitude: -122.4644 }, interestTags: ['park', 'hiking', 'viewpoint'], foodPrefs: ['mexican'] },
    { name: 'Jess', startLocation: { latitude: 37.7801, longitude: -122.4644 }, interestTags: ['park', 'garden'], foodPrefs: ['vegan'], diet: ['vegan'] },
    { name: 'Tom', startLocation: { latitude: 37.7599, longitude: -122.4869 }, interestTags: ['park'], foodPrefs: ['mexican'] },
    { name: 'Nadia', startLocation: { latitude: 37.7599, longitude: -122.4869 }, interestTags: ['birdwatching'], foodPrefs: [] },
  ],
  pins: [
    { name: 'Golden Gate Park', category: 'park', interests: ['park', 'garden'], rating: 4.8, priceLevel: 0, openingHours: [{ open: '05:00', close: '22:00' }] },
    { name: 'Japanese Tea Garden', category: 'garden', interests: ['garden', 'park'], rating: 4.6, priceLevel: 1, openingHours: [{ open: '09:00', close: '18:00' }] },
    { name: 'Lands End Trail', category: 'viewpoint', interests: ['hiking', 'viewpoint', 'park'], rating: 4.9, priceLevel: 0 },
    { name: 'Sutro Baths', category: 'viewpoint', interests: ['viewpoint', 'history'], rating: 4.7, priceLevel: 0, openingHours: [{ open: '06:00', close: '20:00' }] },
    { name: 'Presidio Park', category: 'park', interests: ['park', 'hiking'], priceLevel: 0, openingHours: [{ open: '06:00', close: '20:00' }] },
    { name: 'Stow Lake', category: 'park', interests: ['park'], rating: 4.5, priceLevel: 0, openingHours: [{ open: '05:00', close: '22:00' }] },
    { name: 'Conservatory of Flowers', category: 'garden', interests: ['garden'], rating: 4.4, priceLevel: 2, openingHours: [{ open: '10:00', close: '16:00' }] },
    { name: 'Golden Gate Park Bird Sanctuary', category: 'park', interests: ['birdwatching'] }, // Nadia's only match — niche, low coverage
    { name: 'Helicopter Tour', category: 'tour', interests: ['viewpoint'], priceLevel: 4 }, // $80 > $25 budget -> dropped outright

    { name: 'Taco Truck', category: 'restaurant', cuisine: ['mexican'], rating: 4.3, priceLevel: 1, diet: ['vegan', 'vegetarian'], openingHours: [{ open: '11:00', close: '20:00' }] },
    { name: 'Burrito Bros', category: 'restaurant', cuisine: ['mexican'], rating: 4.0, priceLevel: 1, diet: ['vegan'] },
    { name: 'Vegan Taco Spot', category: 'restaurant', cuisine: ['mexican', 'vegan'], rating: 4.6, priceLevel: 2, diet: ['vegan', 'vegetarian'], openingHours: [{ open: '10:00', close: '21:00' }] },
    { name: 'Green Bowl', category: 'restaurant', cuisine: ['vegan'], rating: 4.5, priceLevel: 2, diet: ['vegan'], openingHours: [{ open: '09:00', close: '19:00' }] },
    { name: 'Salad Stop', category: 'restaurant', cuisine: ['vegan'], priceLevel: 1, diet: ['vegan', 'vegetarian'] },
    { name: 'Ocean Beach Cafe', category: 'restaurant', cuisine: ['american'], rating: 4.1, priceLevel: 2, diet: ['vegan'] },
    { name: 'Sunset Diner', category: 'restaurant', cuisine: ['american'], rating: 4.2, priceLevel: 2, diet: ['vegan', 'vegetarian'], openingHours: [{ open: '07:00', close: '15:00' }] },
    { name: 'Mystery Burger', category: 'restaurant', cuisine: ['american'], rating: 4.0, priceLevel: 1 }, // diet unknown -> kept
    { name: 'Fancy Steakhouse', category: 'restaurant', cuisine: ['steak'], rating: 4.8, priceLevel: 4, diet: [] }, // dropped by budget AND diet
    { name: 'Richmond Ramen', category: 'restaurant', cuisine: ['ramen'], rating: 4.4, priceLevel: 2, diet: [] }, // no vegan -> dropped
  ],
}

// --- Group C: coffee-loving duo, generous window, tie-break + missing data -
// Exercises: two identically-tagged cafes that differ only by rating (proves
// ratings break ties), treats that don't count against the food quota, and
// pins with partially/fully missing data whose flags must survive into the
// final shortlist rather than being silently dropped.
const groupC = {
  trip: { startTime: '10:00', endTime: '18:00', maxBudgetPerPerson: 50 },
  members: [
    { name: 'Alex', startLocation: { latitude: 37.8030, longitude: -122.4360 }, interestTags: ['coffee', 'dessert', 'boba'], foodPrefs: ['ramen'] },
    { name: 'Jordan', startLocation: { latitude: 37.8030, longitude: -122.4360 }, interestTags: ['coffee'], foodPrefs: ['ramen'] },
  ],
  pins: [
    { name: 'Cafe Presidio', category: 'cafe', interests: ['coffee'], rating: 4.8, priceLevel: 1, openingHours: [{ open: '07:00', close: '18:00' }] }, // tie-break winner
    { name: 'Blue Bottle Coffee', category: 'cafe', interests: ['coffee'], priceLevel: 1, openingHours: [{ open: '07:00', close: '18:00' }] }, // identical interests, no rating -> should score lower
    { name: 'Boba Guys', category: 'dessert', interests: ['boba', 'dessert'], rating: 4.5, priceLevel: 1, openingHours: [{ open: '11:00', close: '21:00' }] },
    { name: "Bob's Donuts", category: 'dessert', interests: ['dessert'], rating: 4.9, priceLevel: 0 }, // no hours -> hoursUnknown
    { name: 'Third Wave Coffee', category: 'cafe', interests: ['coffee'], rating: 4.3, openingHours: [{ open: '08:00', close: '17:00' }] }, // no priceLevel -> priceUnknown
    { name: 'Mystery Cafe', category: 'cafe', interests: ['coffee'] }, // fully missing rating/price/hours

    { name: 'Ramen Yokocho', category: 'restaurant', cuisine: ['ramen'], rating: 4.7, priceLevel: 2, openingHours: [{ open: '11:00', close: '22:00' }] },
    { name: 'Marina Ramen House', category: 'restaurant', cuisine: ['ramen'], rating: 4.4, priceLevel: 2 },
    { name: 'Noodle Bar', category: 'restaurant', cuisine: ['ramen', 'noodles'], rating: 4.2, priceLevel: 1, openingHours: [{ open: '11:00', close: '20:00' }] },
    { name: 'Pho Real', category: 'restaurant', cuisine: ['vietnamese'], rating: 4.5, priceLevel: 2, openingHours: [{ open: '10:00', close: '21:00' }] },
    { name: 'Pizza Marina', category: 'restaurant', cuisine: ['pizza'], rating: 4.0, priceLevel: 2 },
    { name: 'Sushi Marina', category: 'restaurant', cuisine: ['sushi'], rating: 4.6, priceLevel: 3 },
    { name: 'Burger Joint', category: 'restaurant', cuisine: ['american'], rating: 4.1, priceLevel: 2 },
    { name: 'Fine Dining Marina', category: 'restaurant', cuisine: ['french'], rating: 4.9, priceLevel: 4 }, // $80 > $50 budget -> dropped
  ],
}

export { groupA, groupB, groupC }
