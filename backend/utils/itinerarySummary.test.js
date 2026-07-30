import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildItinerarySummary, buildItinerarySummaryData } from './itinerarySummary.js'

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

test('buildItinerarySummaryData: structured parts per stop for the PDF renderer', () => {
  const d = buildItinerarySummaryData(itinerary)
  assert.equal(d.brand, 'NavQuest')
  assert.equal(d.title, 'Weekend in SF') // no "NavQuest — " prefix; the PDF draws the wordmark
  assert.match(d.subtitle, /San Francisco/)
  assert.equal(d.stops.length, 2)
  assert.deepEqual(d.stops[0], {
    index: 1,
    time: d.stops[0].time, // Pacific-rendered; exact clock value not asserted
    name: 'Blue Bottle',
    category: 'cafe',
    travelToNext: 12,
  })
  assert.match(d.stops[0].time, /–/) // start–end range
  assert.equal(d.stops[1].name, 'Golden Gate Park')
  assert.equal(d.stops[1].category, 'park')
  assert.equal(d.stops[1].travelToNext, null) // no travel time on the last stop
})

test('buildItinerarySummaryData: missing fields degrade to empty/null, no crash on empty', () => {
  const d = buildItinerarySummaryData({ title: 'Bare', location: 'SF', pins: [] })
  assert.equal(d.title, 'Bare')
  assert.equal(d.stops.length, 0)

  const one = buildItinerarySummaryData({
    title: 'Sparse',
    pins: [{ name: 'Mystery Spot' }],
  })
  assert.deepEqual(one.stops[0], {
    index: 1,
    time: '',
    name: 'Mystery Spot',
    category: '',
    travelToNext: null,
  })
})

test('buildItinerarySummaryData: falls back to "Itinerary" when title missing', () => {
  const d = buildItinerarySummaryData({ pins: [] })
  assert.equal(d.title, 'Itinerary')
})
