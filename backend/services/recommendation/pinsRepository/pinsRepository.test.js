import { test } from 'node:test'
import assert from 'node:assert/strict'

test('getAllPins queries catalog-only and maps via mapVenue', async (t) => {
  const rows = [
    {
      id: 1,
      name: 'Taqueria',
      category: 'restaurant',
      tags: ['food', 'mexican'],
      interests: [],
      cuisines: ['mexican'],
      diets: [],
      rating: 4.5,
      pricePerPerson: 14,
      latitude: 37.75,
      longitude: -122.41,
      address: 'SF',
      locationImageUrl: null,
      hoursOpen: {
        mon: '08:00-22:00',
        tue: '08:00-22:00',
        wed: '08:00-22:00',
        thu: '08:00-22:00',
        fri: '08:00-22:00',
        sat: '08:00-22:00',
        sun: '08:00-22:00',
      },
    },
  ]
  let capturedArgs
  const prismaMock = {
    pin: {
      findMany: async (args) => {
        capturedArgs = args
        return rows
      },
    },
  }
  const { makeGetAllPins } = await import('./pinsRepository.js')
  const getAllPins = makeGetAllPins(prismaMock)
  const result = await getAllPins('2026-01-01')

  // All pins are now catalog venues, no filter needed
  assert.deepEqual(capturedArgs, undefined)
  assert.equal(result.length, 1)
  assert.equal(result[0].category, 'restaurant')
  assert.deepEqual(result[0].cuisine, ['mexican'])
  assert.equal(result[0].diet, undefined) // [] -> undefined
  assert.deepEqual(result[0].openingHours, [{ open: '08:00', close: '22:00' }])
})
