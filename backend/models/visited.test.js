// DB-integration test for the Visited model. Skips (doesn't fail) when there's
// no reachable DB, matching services/recommendation/index.test.js so `npm test`
// stays green on a machine without Postgres.
import 'dotenv/config'
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import prisma from '../lib/prisma.js'
import * as visited from './visited.js'

let dbReason // undefined when the DB is reachable (node:test treats null as truthy)
try {
  await prisma.$queryRaw`SELECT 1`
} catch {
  dbReason = 'no DATABASE_URL / Postgres unreachable'
}

after(async () => {
  await prisma.$disconnect()
})

test('upsert is idempotent and refreshes visitedAt', { skip: dbReason }, async () => {
  // Unique-enough throwaway identifiers so parallel/other test data can't collide.
  const tag = `visited-test-${process.pid}`
  const user = await prisma.user.create({
    data: { authUserId: tag, email: `${tag}@example.com`, username: tag },
  })
  const itinerary = await prisma.itinerary.create({
    data: { userId: user.id, title: 'T', location: 'SF', isPublic: false },
  })

  try {
    const first = await visited.upsert(user.id, itinerary.id)
    // Second call must NOT create a second row, and must bump visitedAt.
    const second = await visited.upsert(user.id, itinerary.id)

    const count = await prisma.visited.count({ where: { itineraryId: itinerary.id } })
    assert.equal(count, 1, 'upsert must not create duplicate rows')
    assert.ok(
      second.visitedAt.getTime() >= first.visitedAt.getTime(),
      'visitedAt should refresh (or stay equal) on re-visit',
    )

    // remove is idempotent: first deletes the row, second is a no-op.
    const del1 = await visited.remove(user.id, itinerary.id)
    const del2 = await visited.remove(user.id, itinerary.id)
    assert.equal(del1.count, 1)
    assert.equal(del2.count, 0)
  } finally {
    // Cascade deletes the Visited/Itinerary rows with the user.
    await prisma.user.delete({ where: { id: user.id } })
  }
})
