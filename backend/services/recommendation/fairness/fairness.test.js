import { test } from 'node:test'
import assert from 'node:assert/strict'

import { ensureEveryMemberCovered } from './fairness.js'

test('injects a member\'s best match when their niche interest ranked too low to make the shortlist', () => {
  const members = [
    { name: 'A', interestTags: ['art'] },
    { name: 'B', interestTags: ['stamps'] }, // niche — nothing in the shortlist matches
  ]
  const shortlist = [{ name: 'MoMA', category: 'museum', interests: ['art'], score: 0.9 }]
  const candidates = [
    ...shortlist,
    { name: 'Stamp Museum', category: 'museum', interests: ['stamps'], score: 0.1 }, // ranked low, didn't make the cut
  ]

  const result = ensureEveryMemberCovered(shortlist, members, candidates)

  assert.ok(result.some((p) => p.name === 'Stamp Museum'))
  assert.equal(result.length, 2)
})

test('does not inject anything when every member is already covered', () => {
  const members = [{ name: 'A', interestTags: ['art'] }]
  const shortlist = [{ name: 'MoMA', category: 'museum', interests: ['art'], score: 0.9 }]
  const candidates = shortlist

  const result = ensureEveryMemberCovered(shortlist, members, candidates)

  assert.equal(result.length, 1)
})

test('picks the highest-scoring matching candidate, not just the first one', () => {
  const members = [{ name: 'B', interestTags: ['stamps'] }]
  const shortlist = []
  const candidates = [
    { name: 'Dusty Stamp Shop', category: 'shop', interests: ['stamps'], score: 0.2 },
    { name: 'Grand Stamp Museum', category: 'museum', interests: ['stamps'], score: 0.5 },
  ]

  const result = ensureEveryMemberCovered(shortlist, members, candidates)

  assert.equal(result.length, 1)
  assert.equal(result[0].name, 'Grand Stamp Museum')
})

test('leaves a member uncovered without crashing when no candidate matches at all', () => {
  const members = [{ name: 'B', interestTags: ['underwater basket weaving'] }]
  const shortlist = [{ name: 'MoMA', category: 'museum', interests: ['art'], score: 0.9 }]
  const candidates = shortlist

  const result = ensureEveryMemberCovered(shortlist, members, candidates)

  assert.equal(result.length, 1) // nothing injected — no match exists to inject
})

test('injects only once when multiple members share the same unrepresented interest', () => {
  const members = [
    { name: 'A', interestTags: ['stamps'] },
    { name: 'B', interestTags: ['stamps'] },
  ]
  const shortlist = []
  const candidates = [{ name: 'Stamp Museum', category: 'museum', interests: ['stamps'], score: 0.5 }]

  const result = ensureEveryMemberCovered(shortlist, members, candidates)

  assert.equal(result.length, 1)
})

test('does not mutate the input shortlist array', () => {
  const members = [{ name: 'B', interestTags: ['stamps'] }]
  const shortlist = [{ name: 'MoMA', category: 'museum', interests: ['art'], score: 0.9 }]
  const originalLength = shortlist.length
  const candidates = [...shortlist, { name: 'Stamp Museum', category: 'museum', interests: ['stamps'], score: 0.5 }]

  ensureEveryMemberCovered(shortlist, members, candidates)

  assert.equal(shortlist.length, originalLength)
})

test('restaurants are covered via cuisine/foodPrefs, not interests', () => {
  const members = [{ name: 'A', interestTags: [], foodPrefs: ['ramen'] }]
  const shortlist = []
  const candidates = [
    { name: 'Ramen Bar', category: 'restaurant', cuisine: ['ramen'], score: 0.4 },
  ]

  const result = ensureEveryMemberCovered(shortlist, members, candidates)

  assert.equal(result.length, 1)
  assert.equal(result[0].name, 'Ramen Bar')
})
