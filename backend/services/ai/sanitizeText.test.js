import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeText, sanitizeItineraryText } from './sanitizeText.js'

test('rewrites 24-hour times to 12-hour am/pm', () => {
  assert.equal(sanitizeText('Start at 14:00'), 'Start at 2pm')
  assert.equal(sanitizeText('Doors at 09:30'), 'Doors at 9:30am')
  assert.equal(sanitizeText('Ends by 20:15'), 'Ends by 8:15pm')
  assert.equal(sanitizeText('Midnight snack at 00:00'), 'Midnight snack at 12am')
  assert.equal(sanitizeText('Noon meetup at 12:00'), 'Noon meetup at 12pm')
})

test('leaves an already-12-hour time alone', () => {
  assert.equal(sanitizeText('Meet at 2:30'), 'Meet at 2:30')
  assert.equal(sanitizeText('Meet at 2:30pm'), 'Meet at 2:30pm')
  // Zero-padded morning hour is still rewritten (it reads as military time).
  assert.equal(sanitizeText('Meet at 08:30'), 'Meet at 8:30am')
})

test('does not double-convert a time already carrying am/pm', () => {
  assert.equal(sanitizeText('at 10:00am'), 'at 10:00am')
  assert.equal(sanitizeText('at 8:00 pm'), 'at 8:00 pm')
})

test('replaces em/en dashes with a comma', () => {
  assert.equal(sanitizeText('Lunch — then a walk'), 'Lunch, then a walk')
  assert.equal(sanitizeText('a park – a museum'), 'a park, a museum')
})

test('turns a numeric dash range into "to"', () => {
  assert.equal(sanitizeText('Open 10:00–14:00'), 'Open 10am to 2pm')
  assert.equal(sanitizeText('spots 3–5'), 'spots 3 to 5')
})

test('leaves a plain hyphen inside a word alone', () => {
  assert.equal(sanitizeText('a budget-friendly day'), 'a budget-friendly day')
})

test('passes non-string values through', () => {
  assert.equal(sanitizeText(null), null)
  assert.equal(sanitizeText(42), 42)
})

test('sanitizeItineraryText cleans title/location/description and stop notes', () => {
  const out = sanitizeItineraryText({
    feasible: true,
    title: 'A day 9:00–17:00',
    location: 'SF — Mission',
    description: 'Start at 08:00 — grab coffee.',
    stops: [
      { pinId: 1, arriveTime: '08:00', note: 'Arrive by 14:30 — enjoy.' },
      { pinId: 2, arriveTime: '15:00' }, // no note
    ],
  })
  assert.equal(out.title, 'A day 9am to 5pm')
  assert.equal(out.location, 'SF, Mission')
  assert.equal(out.description, 'Start at 8am, grab coffee.')
  assert.equal(out.stops[0].note, 'Arrive by 2:30pm, enjoy.')
  assert.equal(out.stops[1].note, undefined)
  // Structured time fields (arriveTime) are untouched — only free text is cleaned.
  assert.equal(out.stops[0].arriveTime, '08:00')
})

test('sanitizeItineraryText leaves an infeasible result untouched', () => {
  const infeasible = { feasible: false, reason: 'No itinerary fits 09:00–10:00.' }
  assert.deepEqual(sanitizeItineraryText(infeasible), infeasible)
})
