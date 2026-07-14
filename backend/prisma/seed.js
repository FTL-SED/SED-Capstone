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
      coverImageUrl: 'https://images.navquest.dev/sf-cover.jpg',
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
            locationImageUrl: 'https://images.navquest.dev/ggb.jpg',
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
            locationImageUrl: 'https://images.navquest.dev/ferry-building.jpg',
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
            locationImageUrl: 'https://images.navquest.dev/tea-garden.jpg',
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
      coverImageUrl: 'https://images.navquest.dev/mission-tacos.jpg',
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
            locationImageUrl: 'https://images.navquest.dev/la-taqueria.jpg',
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
            locationImageUrl: 'https://images.navquest.dev/el-farolito.jpg',
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
            tags: ['hiking', 'scenic_views'],
            pricePerPerson: 0,
            latitude: 37.826,
            longitude: -122.4997,
            startTime: '08:00',
            endTime: '09:30',
            locationImageUrl: 'https://images.navquest.dev/hawk-hill.jpg',
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
      coverImageUrl: 'https://images.navquest.dev/sf-cover.jpg',
      isPublic: true,
      pins: {
        create: [
          pin(1, {
            name: 'Golden Gate Bridge Vista Point',
            tags: ['scenic_views', 'landmark'],
            pricePerPerson: 0,
            latitude: 37.8078,
            longitude: -122.4753,
            startTime: '09:00',
            endTime: '10:00',
            locationImageUrl: 'https://images.navquest.dev/ggb.jpg',
          }),
          pin(2, {
            name: 'de Young Museum',
            tags: ['art', 'museum', 'indoor'],
            pricePerPerson: 20,
            latitude: 37.7715,
            longitude: -122.4686,
            startTime: '13:00',
            endTime: '15:00',
            locationImageUrl: 'https://images.navquest.dev/de-young.jpg',
          }),
        ],
      },
    },
  })

  console.log('Seeding likes and bookmarks...')

  // Likes: Jordan and Mina both like Avery's SF day; Avery likes the taco crawl.
  await prisma.like.createMany({
    data: [
      { userId: users.jordan_eats.id, itineraryId: sfDay.id },
      { userId: users.mina_offgrid.id, itineraryId: sfDay.id },
      { userId: users.avery_wanders.id, itineraryId: foodCrawl.id },
    ],
  })

  // Bookmarks: Avery saves the taco crawl to try later.
  await prisma.bookmark.createMany({
    data: [{ userId: users.avery_wanders.id, itineraryId: foodCrawl.id }],
  })

  // Keep the denormalized likeCount in sync with the Like rows we just made.
  for (const itineraryId of [sfDay.id, foodCrawl.id]) {
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
