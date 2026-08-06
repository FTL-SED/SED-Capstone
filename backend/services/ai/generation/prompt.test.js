import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildMessages, SYSTEM_PROMPT, toPromptPlace } from './prompt.js'

const PLACES = [
  { id: 1, name: 'SFMOMA', category: 'activity', area: 'SoMa', durationMinutes: 120, mealBlock: null, tags: ['art'] },
  { id: 10, name: 'La Taqueria', category: 'restaurant', area: 'Mission', durationMinutes: 60, mealBlock: 'lunch', tags: ['mexican'] },
]

test('buildMessages returns a [system, user] pair', () => {
  const [systemMsg, userMsg] = buildMessages(PLACES, {})
  assert.equal(systemMsg.role, 'system')
  assert.equal(userMsg.role, 'user')
  assert.ok(typeof systemMsg.content === 'string')
  assert.ok(typeof userMsg.content === 'string')
})

test('user message lists the places to arrange (id, area, mealBlock)', () => {
  const [, userMsg] = buildMessages(PLACES, {})
  assert.match(userMsg.content, /Places to arrange:/)
  assert.match(userMsg.content, /"id":1/)
  assert.match(userMsg.content, /"area":"SoMa"/)
  assert.match(userMsg.content, /"mealBlock":"lunch"/)
})

test('user message includes the trip window when supplied', () => {
  const [, userMsg] = buildMessages(PLACES, { timeWindow: { startTime: '10:00', endTime: '18:00' } })
  assert.match(userMsg.content, /Trip window: 10:00-18:00/)
})

test('system prompt is order+narrate only: no self-check, no schedule fields', () => {
  assert.match(SYSTEM_PROMPT, /ordered list of ids/)
  assert.match(SYSTEM_PROMPT, /Output ONLY this JSON/)
  // The narrator must NOT be asked to produce times or verify its own work.
  assert.doesNotMatch(SYSTEM_PROMPT, /VERIFY/)
  assert.doesNotMatch(SYSTEM_PROMPT, /arriveTime|departTime/)
})

test('system prompt has at most 10 numbered rules', () => {
  const ruleNumbers = [...SYSTEM_PROMPT.matchAll(/^\d+\./gm)].length
  assert.ok(ruleNumbers <= 10, `expected <=10 rules, got ${ruleNumbers}`)
})

test('toPromptPlace caps an over-long name and tag', () => {
  const out = toPromptPlace({
    id: 3,
    name: 'x'.repeat(500),
    category: 'activity',
    area: 'SoMa',
    durationMinutes: 60,
    mealBlock: null,
    tags: ['y'.repeat(200)],
  })
  assert.equal(out.name.length, 120)
  assert.equal(out.tags[0].length, 40)
})
