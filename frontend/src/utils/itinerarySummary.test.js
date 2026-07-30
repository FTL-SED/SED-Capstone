import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildItinerarySummaryText } from './itinerarySummary.js'

const itinerary = {
  title: 'Weekend in SF',
  location: 'San Francisco',
  dayStart: '09:00',
  dayEnd: '21:00',
  maxBudgetPerPerson: 80,
  transport: 'transit',
  pins: [
    { name: 'Blue Bottle', startTime: '2026-08-02T16:00:00.000Z', endTime: '2026-08-02T17:30:00.000Z', tags: ['cafe'], travelTimeToNextMinutes: 12 },
    { name: 'Golden Gate Park', startTime: '2026-08-02T18:00:00.000Z', endTime: '2026-08-02T20:00:00.000Z', tags: ['park'] },
  ],
}

test('buildItinerarySummaryText: single string with header and stops', () => {
  const text = buildItinerarySummaryText(itinerary)
  assert.match(text, /^NavQuest — Weekend in SF/)
  assert.match(text, /San Francisco/)
  assert.match(text, /\$80\/person/)
  assert.match(text, /1\. .*Blue Bottle/)
  assert.match(text, /12 min to next stop/)
  assert.match(text, /2\. .*Golden Gate Park/)
})

test('buildItinerarySummaryText: no crash on empty pins / missing fields', () => {
  const text = buildItinerarySummaryText({ title: 'Bare', location: 'SF', pins: [] })
  assert.match(text, /NavQuest — Bare/)
  assert.doesNotMatch(text, /undefined/)
})
