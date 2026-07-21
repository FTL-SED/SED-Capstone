// Controlled vocabulary — the canonical set of tag values the app accepts for a
// venue's category / cuisines / diets / interests. This is the single source of
// truth for "which tags are valid", used to:
//   • show users the accepted options when they tag a venue, and
//   • normalize messy inbound tags (scraped OSM / Google Places / AI-generated)
//     down to one canonical word, so "tex-mex", "taqueria", "Mexican" all become
//     'mexican' before the value is stored.
//
// Shape: each bucket maps a CANONICAL tag -> an array of accepted VARIANTS
// (synonyms / alternate spellings) that should normalize to it. Variants are
// intentionally sparse today — add them as real scraping surfaces new spellings,
// rather than guessing them up front. The canonical key is always itself an
// accepted value (you don't need to list it as its own variant).
//
// NOTE: nothing consumes this at request time yet — venue data is currently
// hand-curated with already-canonical tags (prisma/data/sfPlaces/*, prisma/seed.js).
// It exists as the contract for the scraping / normalization / user-facing-options
// work; wire normalizeTag() into that ingestion path (and/or a GET options
// endpoint) when it lands.

// Restaurant vs. everything-else. The engine only treats 'restaurant' specially
// (the diet-gated meal pool); all other categories are activities.
export const CATEGORIES = {
  restaurant: [],
  activity: [],
}

// What a restaurant serves. Doubles as the accepted values for a Pin's
// `cuisines` column (score/score.js matches member foodPrefs against these).
export const CUISINES = {
  american: [
    'burger',
    'cheeseburger',
    'buffalo wings',
    'barbecue',
    'brisket',
    'pulled pork',
    'mac and cheese',
    'fried chicken',
    'biscuits',
  ],

  chinese: [
    'dim sum',
    'xiao long bao',
    'wonton',
    'chow mein',
    'hand-pulled noodles',
    'peking duck',
    'mapo tofu',
    'hot pot',
  ],

  french: [
    'croissant',
    'escargot',
    'coq au vin',
    'steak frites',
    'crème brûlée',
    'bistro',
  ],

  indian: [
    'butter chicken',
    'tikka masala',
    'biryani',
    'tandoori',
    'naan',
    'samosa',
    'curry',
    'chai',
  ],

  italian: [
    'pizza',
    'pasta',
    'risotto',
    'gnocchi',
    'lasagna',
    'carbonara',
    'gelato',
    'trattoria',
  ],

  japanese: [
    'sushi',
    'ramen',
    'udon',
    'soba',
    'tempura',
    'yakitori',
    'izakaya',
    'omakase',
  ],

  korean: [
    'kbbq',
    'bibimbap',
    'kimchi',
    'tteokbokki',
    'bulgogi',
    'japchae',
    'soju',
  ],

  mediterranean: [
    'falafel',
    'hummus',
    'shawarma',
    'gyro',
    'tabbouleh',
    'mezze',
    'olive oil',
  ],

  mexican: [
    'tacos',
    'burritos',
    'quesadillas',
    'enchiladas',
    'tamales',
    'guacamole',
    'salsa',
    'tex-mex',
  ],

  seafood: [
    'oysters',
    'lobster',
    'crab',
    'shrimp',
    'clam chowder',
    'fish and chips',
    'raw bar',
  ],

  steakhouse: [
    'ribeye',
    'filet mignon',
    'new york strip',
    'prime rib',
    'wagyu',
    'dry aged',
  ],

  thai: [
    'pad thai',
    'pad see ew',
    'tom yum',
    'green curry',
    'red curry',
    'mango sticky rice',
    'thai iced tea',
  ],

  vietnamese: [
    'pho',
    'banh mi',
    'bun bo hue',
    'bun cha',
    'spring rolls',
    'fish sauce',
  ],
}

// Dietary needs a restaurant can accommodate. Accepted values for a Pin's
// `diets` column (helpers.js's passesDiet). 'vegan' is both a cuisine and a diet
// on purpose — a place can BE vegan and SERVE vegans.
export const DIETS = {
  vegan: [
    'plant based',
    'no meat',
    'no dairy',
    'no eggs',
    'animal free',
  ],

  vegetarian: [
    'meatless',
    'no meat',
    'eggs',
    'dairy',
    'vegetarian friendly',
  ],

  'gluten-free': [
    'gluten free',
    'gf',
    'wheat free',
    'celiac friendly',
    'no wheat',
  ],

  halal: [
    'halal certified',
    'zabiha',
    'islamic dietary laws',
    'halal meat',
  ],

  kosher: [
    'kosher certified',
    'jewish dietary laws',
    'kosher kitchen',
  ],

  'dairy-free': [
    'dairy free',
    'lactose free',
    'no milk',
    'no cheese',
    'no butter',
  ],

  pescatarian: [
    'fish',
    'seafood',
    'no meat',
    'no poultry',
  ],
}

// Activity / vibe tags. Accepted values for a Pin's `interests` column
// (score/score.js matches member interestTags against these). Grown from the
// curated SF catalog; extend as new interests appear.
export const INTERESTS = {
  architecture: ['historic buildings', 'design', 'skyscrapers'],
  art: ['galleries', 'murals', 'street art'],
  coffee: ['cafe', 'coffee shop'],
  desserts: ['ice cream', 'pastries', 'sweet treats'],
  entertainment: ['arcades', 'comedy', 'shows'],
  fitness: ['gym', 'sports', 'active'],
  food: ['restaurants', 'local food', 'foodie'],
  history: ['historic', 'heritage', 'landmarks'],
  markets: ['farmers market', 'night market'],
  museums: ['exhibits', 'science', 'culture'],
  nature: ['parks', 'gardens', 'beaches', 'green spaces'],
  nightlife: ['bars', 'clubs', 'cocktails'],
  photography: ['photo spots', 'instagrammable'],
  scenic: ['viewpoints', 'city views', 'sunset'],
  shopping: ['boutiques', 'malls', 'vintage'],
  liveMusic: ['concerts', 'jazz', 'performances'],
  outdoors: ['walking', 'hiking', 'trails'],
  wellness: ['spa', 'relaxation', 'meditation'],
}

// Build a variant -> canonical lookup once per bucket, so normalizeTag is O(1).
// Every canonical key maps to itself; every listed variant maps to its canonical.
function buildLookup(vocab) {
  const lookup = new Map()
  for (const [canonical, variants] of Object.entries(vocab)) {
    lookup.set(canonical, canonical)
    for (const v of variants) lookup.set(v, canonical)
  }
  return lookup
}

const LOOKUPS = {
  category: buildLookup(CATEGORIES),
  cuisine: buildLookup(CUISINES),
  diet: buildLookup(DIETS),
  interest: buildLookup(INTERESTS),
}

// Normalize one inbound tag to its canonical form within a bucket
// ('category' | 'cuisine' | 'diet' | 'interest'). Case-insensitive, trims
// whitespace. Returns the canonical string, or null when the tag isn't
// recognized (caller decides whether to drop it or surface it for review).
export function normalizeTag(bucket, tag) {
  const lookup = LOOKUPS[bucket]
  if (!lookup || typeof tag !== 'string') return null
  return lookup.get(tag.trim().toLowerCase()) ?? null
}

// The accepted canonical values for a bucket, e.g. for showing users their
// options or validating a stored value.
export function acceptedTags(bucket) {
  const vocab = { category: CATEGORIES, cuisine: CUISINES, diet: DIETS, interest: INTERESTS }[bucket]
  return vocab ? Object.keys(vocab) : []
}
