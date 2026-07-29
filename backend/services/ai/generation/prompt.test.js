import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildMessages, SYSTEM_PROMPT, toPromptPin } from './prompt.js'

test('buildMessages returns a [system, user] pair', () => {
  const [systemMsg, userMsg] = buildMessages([], {})
  assert.equal(systemMsg.role, 'system')
  assert.equal(userMsg.role, 'user')
  assert.ok(typeof systemMsg.content === 'string')
  assert.ok(typeof userMsg.content === 'string')
})

test('user message includes a computed targetStops for the window', () => {
  const shortlist = [{ id: 1, name: 'X', category: 'activity', latitude: 37.78, longitude: -122.4, pricePerPerson: 0 }]
  const constraints = { timeWindow: { startTime: '10:00', endTime: '20:30' }, maxBudgetPerPerson: 100, groupSize: 2 }
  const [, userMsg] = buildMessages(shortlist, constraints)
  // 630-min window / 60-min stops = 10
  assert.match(userMsg.content, /"targetStops":\s*10/)
})

test('user message includes perStopBudget when the engine supplies it', () => {
  const shortlist = [{ id: 1, name: 'X', category: 'activity', latitude: 37.78, longitude: -122.4, pricePerPerson: 0 }]
  const constraints = { timeWindow: { startTime: '10:00', endTime: '20:30' }, maxBudgetPerPerson: 100, perStopBudget: 14, groupSize: 2 }
  const [, userMsg] = buildMessages(shortlist, constraints)
  assert.match(userMsg.content, /"perStopBudget":\s*14/)
})

test('system prompt states the hard day-coverage rules and self-check', () => {
  const [systemMsg] = buildMessages([], {})
  assert.match(systemMsg.content, /DAY COVERAGE/)
  assert.match(systemMsg.content, /LAST stop must depart within one stop-length of the window end/)
  assert.match(systemMsg.content, /Before you output, VERIFY/)
})
