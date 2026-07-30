import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildItineraryPdf } from './itineraryPdf.js'

const itinerary = {
  title: 'Weekend in SF',
  location: 'San Francisco',
  dayStart: '09:00',
  dayEnd: '21:00',
  pins: [
    { name: 'Blue Bottle', startTime: '2026-08-02T16:00:00.000Z', endTime: '2026-08-02T17:30:00.000Z', tags: ['cafe'] },
  ],
}

test('buildItineraryPdf returns a non-empty PDF buffer', async () => {
  const buf = await buildItineraryPdf(itinerary)
  assert.ok(Buffer.isBuffer(buf))
  assert.ok(buf.length > 0)
  // Every PDF starts with the "%PDF-" magic header.
  assert.equal(buf.subarray(0, 5).toString('ascii'), '%PDF-')
})

test('buildItineraryPdf handles an itinerary with no stops', async () => {
  const buf = await buildItineraryPdf({ title: 'Empty', location: 'SF', pins: [] })
  assert.ok(Buffer.isBuffer(buf) && buf.length > 0)
})

test('buildItineraryPdf paginates a long itinerary without throwing', async () => {
  // Enough stops to overflow one A4 page and exercise the page-break + footer paging.
  const pins = Array.from({ length: 30 }, (_, i) => ({
    name: `Stop ${i + 1}`,
    startTime: '2026-08-02T16:00:00.000Z',
    endTime: '2026-08-02T17:00:00.000Z',
    tags: ['activity'],
    travelTimeToNextMinutes: 10,
  }))
  const buf = await buildItineraryPdf({ title: 'Big Day', location: 'SF', pins })
  assert.ok(Buffer.isBuffer(buf) && buf.length > 0)
  assert.equal(buf.subarray(0, 5).toString('ascii'), '%PDF-')
})

test('buildItineraryPdf tolerates missing optional fields on stops', async () => {
  const buf = await buildItineraryPdf({ title: 'Sparse', pins: [{ name: 'Mystery Spot' }] })
  assert.ok(Buffer.isBuffer(buf) && buf.length > 0)
  assert.equal(buf.subarray(0, 5).toString('ascii'), '%PDF-')
})

test('buildItineraryPdf still builds when the map fetch fails (returns null)', async () => {
  const getMap = async () => null
  const buf = await buildItineraryPdf(itinerary, { getMap })
  assert.ok(Buffer.isBuffer(buf) && buf.length > 0)
  assert.equal(buf.subarray(0, 5).toString('ascii'), '%PDF-')
})

test('buildItineraryPdf calls the map fetcher with the itinerary stops', async () => {
  const calls = []
  const getMap = async (stops) => {
    calls.push(stops)
    return null
  }
  await buildItineraryPdf(itinerary, { getMap })
  assert.equal(calls.length, 1)
  assert.ok(Array.isArray(calls[0]))
  assert.equal(calls[0][0].name, 'Blue Bottle')
})

test('buildItineraryPdf degrades to text-only when the map image is corrupt', async () => {
  // A non-PNG buffer: pdfkit's image() would throw, but drawMap must catch it and
  // still return a valid PDF (fail-soft — a bad map never fails the export).
  const getMap = async () => Buffer.from('not a real image')
  const buf = await buildItineraryPdf(itinerary, { getMap })
  assert.ok(Buffer.isBuffer(buf) && buf.length > 0)
  assert.equal(buf.subarray(0, 5).toString('ascii'), '%PDF-')
})
