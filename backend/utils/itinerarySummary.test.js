import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildItinerarySummary } from './itinerarySummary.js'

// Times are ISO in Pacific wall-clock (see WrittenItinerary.formatTime).
const itinerary = {
  title: 'Weekend in SF',
  location: 'San Francisco',
  tripDate: '2026-08-02T00:00:00.000Z',
  dayStart: '09:00',
  dayEnd: '21:00',
  maxBudgetPerPerson: 80,
  transport: 'transit',
  pins: [
    { name: 'Blue Bottle', startTime: '2026-08-02T16:00:00.000Z', endTime: '2026-08-02T17:30:00.000Z', tags: ['cafe'], travelTimeToNextMinutes: 12 },
    { name: 'Golden Gate Park', startTime: '2026-08-02T18:00:00.000Z', endTime: '2026-08-02T20:00:00.000Z', tags: ['park'] },
  ],
}

test('buildItinerarySummary: title, subtitle, and one line per stop', () => {
  const s = buildItinerarySummary(itinerary)
  assert.equal(s.title, 'NavQuest — Weekend in SF')
  assert.match(s.subtitle, /San Francisco/)
  assert.match(s.subtitle, /09:00.*21:00/)
  assert.match(s.subtitle, /transit/)
  assert.match(s.subtitle, /\$80\/person/)
  assert.equal(s.lines.length, 2)
  assert.match(s.lines[0], /^1\. .*Blue Bottle/)
  assert.match(s.lines[0], /12 min to next stop/)
  assert.match(s.lines[1], /^2\. .*Golden Gate Park/)
})

test('buildItinerarySummary: missing budget/transport/travel omitted, no crash on empty', () => {
  const s = buildItinerarySummary({ title: 'Bare', location: 'SF', pins: [] })
  assert.equal(s.title, 'NavQuest — Bare')
  assert.doesNotMatch(s.subtitle, /person/)
  assert.doesNotMatch(s.subtitle, /undefined/)
  assert.equal(s.lines.length, 0)
})
