// Step 8 — locks in recommend()'s behavior on three representative mock
// groups (A/B/C, see mockGroups.js) before the engine is wired to HTTP.
// Asserts the exact checklist from the roadmap: every member covered, ≥3
// categories, food quota bounds, ratings breaking ties, missing-data flags
// surviving (not dropped), and per-person budget sanity at the shortlist level.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { recommend } from './recommend.js'
import { memberLikes } from '../score/score.js'
import { estPricePerPerson } from '../helpers/helpers.js'
import { FOOD_MIN, FOOD_MAX } from '../../../config/recommendation.js'
import { groupA, groupB, groupC } from './mockGroups.js'

const groups = { A: groupA, B: groupB, C: groupC }

for (const [label, group] of Object.entries(groups)) {
  const { shortlist } = recommend(group.trip, group.members, group.pins)

  test(`Group ${label}: every member is covered by ≥1 liked pin`, () => {
    for (const member of group.members) {
      assert.ok(
        shortlist.some((pin) => memberLikes(pin, member)),
        `${member.name} has no liked pin in the Group ${label} shortlist`
      )
    }
  })

  test(`Group ${label}: shortlist spans ≥3 categories (no all-one-category failure mode)`, () => {
    const categories = new Set(shortlist.map((p) => p.category))
    assert.ok(categories.size >= 3, `only saw categories: ${[...categories]}`)
  })

  test(`Group ${label}: food quota stays within [FOOD_MIN, FOOD_MAX]`, () => {
    const foodCount = shortlist.filter((p) => p.category === 'restaurant').length
    assert.ok(
      foodCount >= FOOD_MIN && foodCount <= FOOD_MAX,
      `Group ${label} foodCount was ${foodCount}`
    )
  })

  test(`Group ${label}: per-person budget sanity holds for every shortlisted pin`, () => {
    for (const pin of shortlist) {
      const price = estPricePerPerson(pin)
      assert.ok(
        price == null || price <= group.trip.maxBudgetPerPerson,
        `${pin.name} costs $${price}, over Group ${label}'s $${group.trip.maxBudgetPerPerson} budget`
      )
    }
  })
}

test('Group A: hours and relevance hard filters still drop disqualified pins', () => {
  const { shortlist } = recommend(groupA.trip, groupA.members, groupA.pins)
  const names = shortlist.map((p) => p.name)
  // Diet is no longer a whole-group drop: Meat & Grill BBQ / Steakhouse Prime
  // can serve Priya & Marcus (no diet) even though vegetarian Wei can't eat
  // there, so they're eligible now — see the diet-coverage test below.
  assert.ok(!names.includes('Late Night Diner')) // open only outside the trip window
  assert.ok(!names.includes('Golden Gate Park')) // no interest overlap with the group
})

test('Group A: vegetarian Wei still gets a restaurant she can eat at', () => {
  const { shortlist } = recommend(groupA.trip, groupA.members, groupA.pins)
  const wei = groupA.members.find((m) => m.name === 'Wei')
  const eatable = shortlist.filter(
    (p) => p.category === 'restaurant' && (!p.diet || p.diet.includes('vegetarian'))
  )
  assert.ok(eatable.length > 0, 'Wei (vegetarian) has no restaurant she can eat at')
})

test("Group B: Nadia's niche birdwatching interest is covered via the fairness guarantee", () => {
  const { shortlist } = recommend(groupB.trip, groupB.members, groupB.pins)
  assert.ok(shortlist.some((p) => p.name === 'Golden Gate Park Bird Sanctuary'))
})

test('Group B: absolute-budget drops still hold under a tight budget', () => {
  const { shortlist } = recommend(groupB.trip, groupB.members, groupB.pins)
  const names = shortlist.map((p) => p.name)
  assert.ok(!names.includes('Helicopter Tour')) // $80 > $25 budget, dropped outright
  assert.ok(!names.includes('Fancy Steakhouse')) // still over budget (diet aside)
  // Richmond Ramen (diet: []) is no longer dropped for diet — Jess's companions
  // have no diet, so it's a valid meal for them; Jess's vegan coverage is
  // guaranteed separately (asserted below).
})

test('Group B: vegan Jess still gets a restaurant she can eat at', () => {
  const { shortlist } = recommend(groupB.trip, groupB.members, groupB.pins)
  const eatable = shortlist.filter(
    (p) => p.category === 'restaurant' && (!p.diet || p.diet.includes('vegan'))
  )
  assert.ok(eatable.length > 0, 'Jess (vegan) has no restaurant she can eat at')
})

test('Group C: ratings break ties between identically-tagged cafes', () => {
  const { shortlist } = recommend(groupC.trip, groupC.members, groupC.pins)
  const presidio = shortlist.find((p) => p.name === 'Cafe Presidio')
  const blueBottle = shortlist.find((p) => p.name === 'Blue Bottle Coffee')

  assert.ok(presidio, 'Cafe Presidio (rated) should be in the shortlist')
  if (blueBottle) {
    assert.ok(
      presidio.score > blueBottle.score,
      'the rated cafe should outscore its unrated, identically-tagged twin'
    )
  }
})

test('Group C: missing-data flags survive to the final shortlist instead of being dropped', () => {
  const { shortlist } = recommend(groupC.trip, groupC.members, groupC.pins)
  const donuts = shortlist.find((p) => p.name === "Bob's Donuts")
  const thirdWave = shortlist.find((p) => p.name === 'Third Wave Coffee')
  const mysteryCafe = shortlist.find((p) => p.name === 'Mystery Cafe')

  assert.ok(donuts, "Bob's Donuts should not be dropped for missing hours")
  assert.equal(donuts.hoursUnknown, true)

  assert.ok(thirdWave, 'Third Wave Coffee should not be dropped for missing price')
  assert.equal(thirdWave.priceUnknown, true)

  assert.ok(mysteryCafe, 'Mystery Cafe should not be dropped despite fully missing data')
  assert.equal(mysteryCafe.priceUnknown, true)
  assert.equal(mysteryCafe.hoursUnknown, true)
})

test('Group C: over-budget fine dining is dropped, and treats never count against the food quota', () => {
  const { shortlist } = recommend(groupC.trip, groupC.members, groupC.pins)
  assert.ok(!shortlist.some((p) => p.name === 'Fine Dining Marina')) // $80 > $50 budget

  const treats = shortlist.filter((p) => p.category === 'cafe' || p.category === 'dessert')
  assert.ok(treats.length > 0, 'expected some treats in the shortlist')
  const foodCount = shortlist.filter((p) => p.category === 'restaurant').length
  assert.ok(foodCount <= FOOD_MAX, 'treats should not have inflated the food count past FOOD_MAX')
})
