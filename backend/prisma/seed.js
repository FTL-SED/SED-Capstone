import 'dotenv/config'

import { PrismaClient } from '@prisma/client'

// Self-contained client for the seed so it doesn't depend on the app's
// lib/prisma.js (which uses a driver adapter — a preview feature under Prisma
// 6.7). Passing the connection string directly works with the default engine.
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL })

// Deterministic dev seed. Every record mirrors a model in schema.prisma:
// User -> Itinerary -> Pin, plus the Like / Bookmark join tables and the
// self-referential fork relation (Itinerary.sourceItineraryId).
//
// Run with: npx prisma db seed

async function clearDatabase() {
  // Delete in dependency order so foreign keys never block a wipe.
  await prisma.like.deleteMany()
  await prisma.bookmark.deleteMany()
  await prisma.pin.deleteMany()
  await prisma.itinerary.deleteMany()
  await prisma.user.deleteMany()
}

async function seedUsers() {
  const users = [
    { authUserId: 'seed-auth-avery', email: 'avery@navquest.dev', username: 'avery_wanders' },
    { authUserId: 'seed-auth-jordan', email: 'jordan@navquest.dev', username: 'jordan_eats' },
    { authUserId: 'seed-auth-mina', email: 'mina@navquest.dev', username: 'mina_offgrid' },
  ]

  const created = {}
  for (const data of users) {
    const user = await prisma.user.create({ data })
    created[user.username] = user
  }
  return created
}

// A pin matches the Pin model exactly. startTime/endTime are same-day Dates.
function pin(order, overrides) {
  const day = '2026-08-15'
  return {
    orderInItinerary: order,
    tags: [],
    address: null,
    description: null,
    travelTimeToNextMinutes: null,
    distanceToNextMeters: null,
    ...overrides,
    startTime: new Date(`${day}T${overrides.startTime}:00-07:00`),
    endTime: new Date(`${day}T${overrides.endTime}:00-07:00`),
  }
}

async function main() {
  console.log('Clearing existing data...')
  await clearDatabase()

  console.log('Seeding users...')
  const users = await seedUsers()

  console.log('Seeding itineraries and pins...')

  // Itinerary 1: a public San Francisco day, authored by Avery.
  const sfDay = await prisma.itinerary.create({
    data: {
      userId: users.avery_wanders.id,
      title: 'A Perfect Day in San Francisco',
      location: 'San Francisco, CA',
      description:
        'Coastal views, dim sum, and a sunset over the bay — an easy, walkable first day in the city.',
      coverImageUrl: 'https://picsum.photos/seed/sf-cover/640/400',
      isPublic: true,
      pins: {
        create: [
          pin(1, {
            name: 'Golden Gate Bridge Vista Point',
            description: 'Start with the classic view before the fog rolls in.',
            tags: ['scenic_views', 'landmark', 'photography'],
            pricePerPerson: 0,
            latitude: 37.8078,
            longitude: -122.4753,
            address: 'Golden Gate Bridge, San Francisco, CA 94129',
            startTime: '09:00',
            endTime: '10:00',
            travelTimeToNextMinutes: 20,
            distanceToNextMeters: 6500,
            locationImageUrl: 'https://picsum.photos/seed/ggb/640/400',
          }),
          pin(2, {
            name: 'Ferry Building Marketplace',
            description: 'Grab coffee and pastries from the local vendors.',
            tags: ['food', 'market', 'coffee'],
            pricePerPerson: 18.5,
            latitude: 37.7955,
            longitude: -122.3937,
            address: '1 Ferry Building, San Francisco, CA 94111',
            startTime: '10:30',
            endTime: '11:45',
            travelTimeToNextMinutes: 12,
            distanceToNextMeters: 2100,
            locationImageUrl: 'https://picsum.photos/seed/ferry-building/640/400',
          }),
          pin(3, {
            name: 'Golden Gate Park & Japanese Tea Garden',
            description: 'Wander the gardens and rest with a pot of tea.',
            tags: ['nature', 'garden', 'relaxing'],
            pricePerPerson: 12,
            latitude: 37.7702,
            longitude: -122.4703,
            address: '75 Hagiwara Tea Garden Dr, San Francisco, CA 94118',
            startTime: '13:00',
            endTime: '15:30',
            travelTimeToNextMinutes: 15,
            distanceToNextMeters: 4200,
            locationImageUrl: 'https://picsum.photos/seed/tea-garden/640/400',
          }),
          pin(4, {
            name: 'Lands End Coastal Trail',
            description: 'An easy cliffside walk with views of the bridge and the ruins of Sutro Baths.',
            tags: ['hiking', 'scenic_views', 'nature'],
            pricePerPerson: 0,
            latitude: 37.7802,
            longitude: -122.5111,
            address: '680 Point Lobos Ave, San Francisco, CA 94121',
            startTime: '16:00',
            endTime: '17:15',
            travelTimeToNextMinutes: 18,
            distanceToNextMeters: 5300,
            locationImageUrl: 'https://picsum.photos/seed/lands-end/640/400',
          }),
          pin(5, {
            name: 'Dinner at Nopa',
            description: 'California comfort food and a lively room to end the day.',
            tags: ['food', 'dinner', 'californian'],
            pricePerPerson: 45,
            latitude: 37.7748,
            longitude: -122.4376,
            address: '560 Divisadero St, San Francisco, CA 94117',
            startTime: '18:00',
            endTime: '19:30',
            travelTimeToNextMinutes: 14,
            distanceToNextMeters: 3800,
            locationImageUrl: 'https://picsum.photos/seed/nopa/640/400',
          }),
          pin(6, {
            name: 'Twin Peaks Sunset',
            description: 'Cap the night with a panorama of the whole city lighting up.',
            tags: ['scenic_views', 'sunset', 'photography'],
            pricePerPerson: 0,
            latitude: 37.7544,
            longitude: -122.4477,
            address: '501 Twin Peaks Blvd, San Francisco, CA 94114',
            startTime: '20:00',
            endTime: '20:45',
            locationImageUrl: 'https://picsum.photos/seed/twin-peaks/640/400',
          }),
        ],
      },
    },
    include: { pins: true },
  })

  // Itinerary 2: a public foodie crawl, authored by Jordan.
  const foodCrawl = await prisma.itinerary.create({
    data: {
      userId: users.jordan_eats.id,
      title: 'Mission District Taco Crawl',
      location: 'San Francisco, CA',
      description: 'Three stops, three styles of tacos, one very happy afternoon.',
      coverImageUrl: 'https://picsum.photos/seed/mission-tacos/640/400',
      isPublic: true,
      pins: {
        create: [
          pin(1, {
            name: 'La Taqueria',
            description: 'Famous for its no-rice burritos and crispy tacos.',
            tags: ['food', 'mexican', 'casual'],
            pricePerPerson: 14,
            latitude: 37.7509,
            longitude: -122.418,
            address: '2889 Mission St, San Francisco, CA 94110',
            startTime: '12:00',
            endTime: '13:00',
            travelTimeToNextMinutes: 8,
            distanceToNextMeters: 900,
            locationImageUrl: 'https://picsum.photos/seed/la-taqueria/640/400',
          }),
          pin(2, {
            name: 'El Farolito',
            description: 'Late-night favorite with legendary super quesadillas.',
            tags: ['food', 'mexican'],
            pricePerPerson: 13,
            latitude: 37.7521,
            longitude: -122.4181,
            address: '2779 Mission St, San Francisco, CA 94110',
            startTime: '13:30',
            endTime: '14:30',
            travelTimeToNextMinutes: 6,
            distanceToNextMeters: 650,
            locationImageUrl: 'https://picsum.photos/seed/el-farolito/640/400',
          }),
          pin(3, {
            name: 'Taqueria Cancún',
            description: 'The al pastor with a squeeze of lime is the move here.',
            tags: ['food', 'mexican', 'casual'],
            pricePerPerson: 12,
            latitude: 37.7621,
            longitude: -122.4194,
            address: '2288 Mission St, San Francisco, CA 94110',
            startTime: '15:00',
            endTime: '16:00',
            travelTimeToNextMinutes: 5,
            distanceToNextMeters: 500,
            locationImageUrl: 'https://picsum.photos/seed/taqueria-cancun/640/400',
          }),
          pin(4, {
            name: 'Bi-Rite Creamery',
            description: 'Cool down with salted caramel ice cream to finish the crawl.',
            tags: ['food', 'dessert', 'ice_cream'],
            pricePerPerson: 8,
            latitude: 37.7615,
            longitude: -122.4257,
            address: '3692 18th St, San Francisco, CA 94110',
            startTime: '16:15',
            endTime: '16:45',
            locationImageUrl: 'https://picsum.photos/seed/bi-rite/640/400',
          }),
        ],
      },
    },
    include: { pins: true },
  })

  // Itinerary 3: a private draft, authored by Mina (isPublic defaults handled explicitly).
  await prisma.itinerary.create({
    data: {
      userId: users.mina_offgrid.id,
      title: 'Weekend Draft: Marin Headlands',
      location: 'Marin County, CA',
      description: 'Still planning this one — rough order of trailheads.',
      isPublic: false,
      pins: {
        create: [
          pin(1, {
            name: 'Hawk Hill',
            description: 'Best raptor-watching spot in the headlands, with a wide bay view.',
            tags: ['hiking', 'scenic_views'],
            pricePerPerson: 0,
            latitude: 37.826,
            longitude: -122.4997,
            address: 'Conzelman Rd, Sausalito, CA 94965',
            startTime: '08:00',
            endTime: '09:30',
            travelTimeToNextMinutes: 12,
            distanceToNextMeters: 3400,
            locationImageUrl: 'https://picsum.photos/seed/hawk-hill/640/400',
          }),
          pin(2, {
            name: 'Point Bonita Lighthouse',
            description: 'Cross the little suspension bridge out to the lighthouse.',
            tags: ['landmark', 'scenic_views', 'history'],
            pricePerPerson: 0,
            latitude: 37.8158,
            longitude: -122.5296,
            address: 'Field Rd, Sausalito, CA 94965',
            startTime: '10:00',
            endTime: '11:15',
            travelTimeToNextMinutes: 10,
            distanceToNextMeters: 2600,
            locationImageUrl: 'https://picsum.photos/seed/point-bonita/640/400',
          }),
          pin(3, {
            name: 'Rodeo Beach',
            description: 'Pebbly beach and lagoon — a good spot to eat a packed lunch.',
            tags: ['beach', 'nature', 'relaxing'],
            pricePerPerson: 0,
            latitude: 37.8324,
            longitude: -122.5395,
            address: 'Mitchell Rd, Sausalito, CA 94965',
            startTime: '11:45',
            endTime: '13:00',
            travelTimeToNextMinutes: 16,
            distanceToNextMeters: 6100,
            locationImageUrl: 'https://picsum.photos/seed/rodeo-beach/640/400',
          }),
          pin(4, {
            name: 'Tennessee Valley Trail',
            description: 'Flat out-and-back trail that ends at a quiet cove.',
            tags: ['hiking', 'nature', 'scenic_views'],
            pricePerPerson: 0,
            latitude: 37.8598,
            longitude: -122.5363,
            address: 'Tennessee Valley Rd, Mill Valley, CA 94941',
            startTime: '13:30',
            endTime: '15:30',
            locationImageUrl: 'https://picsum.photos/seed/tennessee-valley/640/400',
          }),
        ],
      },
    },
  })

  console.log('Seeding a forked itinerary (fork relation)...')

  // Mina forks Avery's public SF day. sourceItineraryId points back to the original.
  await prisma.itinerary.create({
    data: {
      userId: users.mina_offgrid.id,
      sourceItineraryId: sfDay.id,
      title: 'My Take on a Perfect Day in San Francisco',
      location: 'San Francisco, CA',
      description: 'Forked from Avery — swapped the afternoon for a museum stop.',
      coverImageUrl: 'https://picsum.photos/seed/sf-cover/640/400',
      isPublic: true,
      pins: {
        create: [
          pin(1, {
            name: 'Golden Gate Bridge Vista Point',
            description: 'Same classic start as the original plan.',
            tags: ['scenic_views', 'landmark'],
            pricePerPerson: 0,
            latitude: 37.8078,
            longitude: -122.4753,
            address: 'Golden Gate Bridge, San Francisco, CA 94129',
            startTime: '09:00',
            endTime: '10:00',
            travelTimeToNextMinutes: 22,
            distanceToNextMeters: 7000,
            locationImageUrl: 'https://picsum.photos/seed/ggb/640/400',
          }),
          pin(2, {
            name: 'de Young Museum',
            description: 'Swapped the tea garden for an afternoon of art.',
            tags: ['art', 'museum', 'indoor'],
            pricePerPerson: 20,
            latitude: 37.7715,
            longitude: -122.4686,
            address: '50 Hagiwara Tea Garden Dr, San Francisco, CA 94118',
            startTime: '13:00',
            endTime: '15:00',
            travelTimeToNextMinutes: 20,
            distanceToNextMeters: 5600,
            locationImageUrl: 'https://picsum.photos/seed/de-young/640/400',
          }),
          pin(3, {
            name: 'Ocean Beach Sunset',
            description: 'End at the coast as the sun drops into the Pacific.',
            tags: ['beach', 'sunset', 'scenic_views'],
            pricePerPerson: 0,
            latitude: 37.7594,
            longitude: -122.5107,
            address: 'Great Hwy, San Francisco, CA 94122',
            startTime: '18:30',
            endTime: '19:30',
            locationImageUrl: 'https://picsum.photos/seed/ocean-beach/640/400',
          }),
        ],
      },
    },
  })

  console.log('Seeding more public itineraries...')

  // Itinerary 4: a public Oakland arts-and-eats day, authored by Jordan.
  const oaklandDay = await prisma.itinerary.create({
    data: {
      userId: users.jordan_eats.id,
      title: 'Arts & Eats Around Lake Merritt',
      location: 'Oakland, CA',
      description: 'A relaxed East Bay loop: a lakeside walk, a museum, and some of Oakland\u2019s best comfort food.',
      coverImageUrl: 'https://picsum.photos/seed/oakland-cover/640/400',
      isPublic: true,
      pins: {
        create: [
          pin(1, {
            name: 'Lake Merritt Loop',
            description: 'Start with an easy 3-mile loop around the tidal lagoon.',
            tags: ['nature', 'walking', 'scenic_views'],
            pricePerPerson: 0,
            latitude: 37.8044,
            longitude: -122.2573,
            address: 'Lakeshore Ave, Oakland, CA 94610',
            startTime: '09:30',
            endTime: '10:45',
            travelTimeToNextMinutes: 8,
            distanceToNextMeters: 1200,
            locationImageUrl: 'https://picsum.photos/seed/lake-merritt/640/400',
          }),
          pin(2, {
            name: 'Oakland Museum of California',
            description: 'Art, history, and natural science under one roof.',
            tags: ['art', 'museum', 'history', 'indoor'],
            pricePerPerson: 16,
            latitude: 37.7975,
            longitude: -122.2646,
            address: '1000 Oak St, Oakland, CA 94607',
            startTime: '11:00',
            endTime: '12:45',
            travelTimeToNextMinutes: 9,
            distanceToNextMeters: 1600,
            locationImageUrl: 'https://picsum.photos/seed/omca/640/400',
          }),
          pin(3, {
            name: 'Grand Lake Farmers Market',
            description: 'Graze your way through stalls for a build-your-own lunch.',
            tags: ['food', 'market', 'casual'],
            pricePerPerson: 20,
            latitude: 37.8113,
            longitude: -122.2469,
            address: 'Grand Ave, Oakland, CA 94610',
            startTime: '13:00',
            endTime: '14:00',
            travelTimeToNextMinutes: 4,
            distanceToNextMeters: 550,
            locationImageUrl: 'https://picsum.photos/seed/grand-lake-market/640/400',
          }),
          pin(4, {
            name: 'Fentons Creamery',
            description: 'A century-old ice cream parlor — the black-and-tan sundae is iconic.',
            tags: ['food', 'dessert', 'ice_cream'],
            pricePerPerson: 12,
            latitude: 37.8265,
            longitude: -122.2477,
            address: '4226 Piedmont Ave, Oakland, CA 94611',
            startTime: '14:15',
            endTime: '15:00',
            travelTimeToNextMinutes: 18,
            distanceToNextMeters: 7400,
            locationImageUrl: 'https://picsum.photos/seed/fentons/640/400',
          }),
          pin(5, {
            name: 'Redwood Regional Park',
            description: 'Finish among towering coast redwoods on the Stream Trail.',
            tags: ['hiking', 'nature', 'scenic_views'],
            pricePerPerson: 0,
            latitude: 37.8095,
            longitude: -122.1636,
            address: '7867 Redwood Rd, Oakland, CA 94619',
            startTime: '15:30',
            endTime: '17:00',
            locationImageUrl: 'https://picsum.photos/seed/redwood-regional/640/400',
          }),
        ],
      },
    },
    include: { pins: true },
  })

  // Itinerary 5: a public Berkeley hills-and-bites day, authored by Mina.
  const berkeleyDay = await prisma.itinerary.create({
    data: {
      userId: users.mina_offgrid.id,
      title: 'Berkeley Hills & Bites',
      location: 'Berkeley, CA',
      description: 'Campus views, a big regional park, and a legendary cheese-and-pizza stop.',
      coverImageUrl: 'https://picsum.photos/seed/berkeley-cover/640/400',
      isPublic: true,
      pins: {
        create: [
          pin(1, {
            name: 'UC Berkeley Campanile',
            description: 'Ride to the top of Sather Tower for a view over the bay.',
            tags: ['landmark', 'scenic_views', 'photography'],
            pricePerPerson: 5,
            latitude: 37.8721,
            longitude: -122.2578,
            address: 'Sather Tower, Berkeley, CA 94720',
            startTime: '10:00',
            endTime: '11:00',
            travelTimeToNextMinutes: 15,
            distanceToNextMeters: 5200,
            locationImageUrl: 'https://picsum.photos/seed/campanile/640/400',
          }),
          pin(2, {
            name: 'Tilden Regional Park',
            description: 'Wander the botanical garden and the shore of Lake Anza.',
            tags: ['nature', 'hiking', 'garden'],
            pricePerPerson: 0,
            latitude: 37.9061,
            longitude: -122.2453,
            address: 'Tilden Regional Park, Berkeley, CA 94708',
            startTime: '11:30',
            endTime: '13:15',
            travelTimeToNextMinutes: 16,
            distanceToNextMeters: 5800,
            locationImageUrl: 'https://picsum.photos/seed/tilden/640/400',
          }),
          pin(3, {
            name: 'Cheese Board Collective',
            description: 'Worker-owned spot serving one inventive vegetarian pizza a day.',
            tags: ['food', 'pizza', 'vegetarian'],
            pricePerPerson: 15,
            latitude: 37.8797,
            longitude: -122.2691,
            address: '1512 Shattuck Ave, Berkeley, CA 94709',
            startTime: '13:45',
            endTime: '14:45',
            travelTimeToNextMinutes: 10,
            distanceToNextMeters: 2300,
            locationImageUrl: 'https://picsum.photos/seed/cheese-board/640/400',
          }),
          pin(4, {
            name: 'Indian Rock Park',
            description: 'Scramble up the rock outcrop for a sunset over the Golden Gate.',
            tags: ['scenic_views', 'sunset', 'nature'],
            pricePerPerson: 0,
            latitude: 37.8916,
            longitude: -122.2725,
            address: 'Indian Rock Ave, Berkeley, CA 94707',
            startTime: '18:00',
            endTime: '19:00',
            locationImageUrl: 'https://picsum.photos/seed/indian-rock/640/400',
          }),
        ],
      },
    },
    include: { pins: true },
  })

  console.log('Seeding likes and bookmarks...')

  // Likes across the public itineraries so the "popular" sort has something to
  // order by and the dashboard's liked list isn't empty.
  await prisma.like.createMany({
    data: [
      { userId: users.jordan_eats.id, itineraryId: sfDay.id },
      { userId: users.mina_offgrid.id, itineraryId: sfDay.id },
      { userId: users.avery_wanders.id, itineraryId: foodCrawl.id },
      { userId: users.mina_offgrid.id, itineraryId: foodCrawl.id },
      { userId: users.avery_wanders.id, itineraryId: oaklandDay.id },
      { userId: users.mina_offgrid.id, itineraryId: oaklandDay.id },
      { userId: users.jordan_eats.id, itineraryId: oaklandDay.id },
      { userId: users.avery_wanders.id, itineraryId: berkeleyDay.id },
    ],
  })

  // Bookmarks: users save a few public itineraries to their "Saved" list.
  await prisma.bookmark.createMany({
    data: [
      { userId: users.avery_wanders.id, itineraryId: foodCrawl.id },
      { userId: users.jordan_eats.id, itineraryId: berkeleyDay.id },
      { userId: users.avery_wanders.id, itineraryId: berkeleyDay.id },
    ],
  })

  // Keep the denormalized likeCount in sync with the Like rows we just made.
  for (const itineraryId of [sfDay.id, foodCrawl.id, oaklandDay.id, berkeleyDay.id]) {
    const likeCount = await prisma.like.count({ where: { itineraryId } })
    await prisma.itinerary.update({ where: { id: itineraryId }, data: { likeCount } })
  }

  console.log('Seed complete.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
