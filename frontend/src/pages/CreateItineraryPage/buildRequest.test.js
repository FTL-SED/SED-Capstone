import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildRecommendationBody } from './buildRequest.js'

const baseForm = {
  startTime: '09:00',
  endTime: '18:00',
  transport: 'transit',
  travelRadius: '5',
  budget: '120',
  isPublic: true,
  members: [
    {
      name: 'Ava',
      location: { label: 'Ferry Building', latitude: 37.7955, longitude: -122.3934 },
      interestTags: ['art', 'nature'],
      foodPrefs: ['italian'],
    },
    {
      name: 'Ben',
      location: { label: 'de Young', latitude: 37.7715, longitude: -122.4686 },
      interestTags: ['museum'],
      foodPrefs: ['seafood'],
    },
  ],
}

test('maps a full form to { trip, members } with coerced numbers', () => {
  const { trip, members } = buildRecommendationBody(baseForm)
  assert.equal(trip.startTime, '09:00')
  assert.equal(trip.maxBudgetPerPerson, 120) // number, not "120"
  assert.equal(trip.transport, 'transit')
  assert.equal(trip.travelRadius, 5)
  assert.equal(members.length, 2)
  assert.equal(members[0].name, 'Ava')
  assert.deepEqual(members[0].startLocation, { latitude: 37.7955, longitude: -122.3934 })
  assert.deepEqual(members[0].interestTags, ['art', 'nature'])
  assert.deepEqual(members[1].foodPrefs, ['seafood'])
})

test('strips the picker label from each member startLocation', () => {
  const { members } = buildRecommendationBody(baseForm)
  assert.equal('label' in members[0].startLocation, false)
})

test('falls back to "Member N" when a name is blank', () => {
  const form = {
    ...baseForm,
    members: [{ ...baseForm.members[0], name: '   ' }],
  }
  const { members } = buildRecommendationBody(form)
  assert.equal(members[0].name, 'Member 1')
})

test('omits travelRadius when blank, zero, or negative', () => {
  assert.equal('travelRadius' in buildRecommendationBody({ ...baseForm, travelRadius: '' }).trip, false)
  assert.equal('travelRadius' in buildRecommendationBody({ ...baseForm, travelRadius: '0' }).trip, false)
  assert.equal('travelRadius' in buildRecommendationBody({ ...baseForm, travelRadius: '-3' }).trip, false)
})

test('omits transport when not chosen', () => {
  const { trip } = buildRecommendationBody({ ...baseForm, transport: '' })
  assert.equal('transport' in trip, false)
})

test('splits member foodPrefs into cuisines (foodPrefs) and diet tags (diet)', () => {
  // The MemberCard stores cuisines + dietary needs in one flat foodPrefs array;
  // the backend wants them separated (foodPrefs = cuisine matching, diet = diet
  // safety). buildRequest must route diet tags to their own field, or diet-safety
  // filtering never runs.
  const form = {
    ...baseForm,
    members: [
      {
        name: 'Ava',
        location: { latitude: 37.79, longitude: -122.39 },
        interestTags: ['art'],
        foodPrefs: ['italian', 'vegan', 'seafood', 'halal'],
      },
    ],
  }
  const { members } = buildRecommendationBody(form)
  assert.deepEqual(members[0].foodPrefs, ['italian', 'seafood'], 'only real cuisines stay in foodPrefs')
  assert.deepEqual(members[0].diet, ['vegan', 'halal'], 'diet tags routed to diet')
})

test('member diet is an empty array when no dietary tags are selected', () => {
  const { members } = buildRecommendationBody(baseForm)
  assert.deepEqual(members[0].diet, [])
})

test('includes trip.includeMeals from the form', () => {
  const base = {
    startTime: '10:00', endTime: '20:30', budget: '100', transport: '', travelRadius: '',
    members: [{ name: 'A', location: { latitude: 37.78, longitude: -122.4 }, interestTags: [], foodPrefs: [] }],
  }
  assert.equal(buildRecommendationBody({ ...base, includeMeals: true }).trip.includeMeals, true)
  assert.equal(buildRecommendationBody({ ...base, includeMeals: false }).trip.includeMeals, false)
})

