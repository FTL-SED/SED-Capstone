import { test } from 'node:test'
import assert from 'node:assert/strict'

import { ensureEveryMemberCovered, ensureEveryFoodPrefCovered } from './fairness.js'

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

// --- ensureEveryFoodPrefCovered: guarantee a cuisine match per member ---

test('injects a cuisine match when a member is covered by interest but has no matching restaurant', () => {
  // Member B likes nightlife (activity in shortlist) AND mexican food — the old
  // memberLikes-based coverage marks B "covered" via the nightlife activity and
  // never adds a mexican restaurant. This pass fixes that.
  const members = [
    { name: 'A', interestTags: ['art'], foodPrefs: ['japanese'], diet: [] },
    { name: 'B', interestTags: ['nightlife'], foodPrefs: ['mexican'], diet: [] },
  ]
  const shortlist = [
    { name: 'MoMA', category: 'museum', interests: ['art'], score: 0.9 },
    { name: 'Club', category: 'nightlife', interests: ['nightlife'], score: 0.8 },
    { name: 'Sushi', category: 'restaurant', cuisine: ['japanese'], score: 0.5 },
  ]
  const candidates = [
    ...shortlist,
    { name: 'Taqueria', category: 'restaurant', cuisine: ['mexican'], score: 0.2 },
  ]
  const result = ensureEveryFoodPrefCovered(shortlist, members, candidates)
  assert.ok(result.some((p) => p.name === 'Taqueria'), 'should inject the mexican match for B')
})

test('does nothing when every member already has a cuisine match in the shortlist', () => {
  const members = [{ name: 'A', foodPrefs: ['japanese'], diet: [] }]
  const shortlist = [{ name: 'Sushi', category: 'restaurant', cuisine: ['japanese'], score: 0.5 }]
  const candidates = [...shortlist, { name: 'Other', category: 'restaurant', cuisine: ['japanese'], score: 0.9 }]
  const result = ensureEveryFoodPrefCovered(shortlist, members, candidates)
  assert.equal(result.length, 1) // nothing injected
})

test('skips members with no food prefs', () => {
  const members = [{ name: 'A', interestTags: ['art'], foodPrefs: [], diet: [] }]
  const shortlist = []
  const candidates = [{ name: 'Sushi', category: 'restaurant', cuisine: ['japanese'], score: 0.5 }]
  const result = ensureEveryFoodPrefCovered(shortlist, members, candidates)
  assert.equal(result.length, 0)
})

test('injected cuisine match must also respect the member diet', () => {
  // A vegan wanting mexican: a non-vegan mexican place must NOT be injected;
  // the vegan-safe one (or unknown-diet, permissive) should be.
  const members = [{ name: 'A', foodPrefs: ['mexican'], diet: ['vegan'] }]
  const shortlist = []
  const candidates = [
    { name: 'MeatTaco', category: 'restaurant', cuisine: ['mexican'], diet: ['halal'], score: 0.9 },
    { name: 'VeganTaco', category: 'restaurant', cuisine: ['mexican'], diet: ['vegan'], score: 0.3 },
  ]
  const result = ensureEveryFoodPrefCovered(shortlist, members, candidates)
  assert.ok(result.some((p) => p.name === 'VeganTaco'), 'should inject the vegan-safe mexican')
  assert.ok(!result.some((p) => p.name === 'MeatTaco'), 'must not inject the non-vegan mexican')
})

test('no cuisine match anywhere ⇒ injects nothing (data gap, not fixable here)', () => {
  const members = [{ name: 'A', foodPrefs: ['ethiopian'], diet: [] }]
  const shortlist = []
  const candidates = [{ name: 'Sushi', category: 'restaurant', cuisine: ['japanese'], score: 0.5 }]
  const result = ensureEveryFoodPrefCovered(shortlist, members, candidates)
  assert.equal(result.length, 0)
})

test('injects only once when members share the same unmatched cuisine', () => {
  const members = [
    { name: 'A', foodPrefs: ['thai'], diet: [] },
    { name: 'B', foodPrefs: ['thai'], diet: [] },
  ]
  const shortlist = []
  const candidates = [{ name: 'Thai Place', category: 'restaurant', cuisine: ['thai'], score: 0.4 }]
  const result = ensureEveryFoodPrefCovered(shortlist, members, candidates)
  assert.equal(result.length, 1)
})

test('does not mutate the input shortlist array', () => {
  const members = [{ name: 'A', foodPrefs: ['thai'], diet: [] }]
  const shortlist = [{ name: 'MoMA', category: 'museum', interests: ['art'], score: 0.9 }]
  const originalLength = shortlist.length
  const candidates = [...shortlist, { name: 'Thai Place', category: 'restaurant', cuisine: ['thai'], score: 0.4 }]
  ensureEveryFoodPrefCovered(shortlist, members, candidates)
  assert.equal(shortlist.length, originalLength)
})
