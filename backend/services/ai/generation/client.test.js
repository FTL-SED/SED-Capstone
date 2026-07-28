// Unit tests for the AI client's pure/injectable logic (no live model, no
// network): JSON-fence stripping, retry classification, the callAI retry/parse
// loop with an injected request fn, and the toPromptPin input caps. The live
// gateway call (requestOnce) is intentionally not tested — it's a thin SDK
// wrapper — but everything around it is.
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { callAI, stripCodeFence, worthRetrying, extractJson } from './client.js'
import { toPromptPin } from './prompt.js'

test('stripCodeFence: unwraps a ```json fence', () => {
  const wrapped = '```json\n{"feasible":true}\n```'
  assert.equal(stripCodeFence(wrapped), '{"feasible":true}')
})

test('stripCodeFence: unwraps a bare ``` fence', () => {
  assert.equal(stripCodeFence('```\n{"a":1}\n```'), '{"a":1}')
})

test('stripCodeFence: returns plain text unchanged', () => {
  assert.equal(stripCodeFence('{"a":1}'), '{"a":1}')
})

test('extractJson: parses clean JSON', () => {
  assert.deepEqual(extractJson('{"feasible":true,"stops":[]}'), { feasible: true, stops: [] })
})

test('extractJson: unwraps a ```json fence', () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 })
})

test('extractJson: recovers JSON when the model prepends prose', () => {
  // The exact failure mode reported: "Looking at the shortlist, here is ... {json}".
  const reply = 'Looking at the shortlist, here is a good day:\n{"feasible":true,"stops":[{"pinId":1,"arriveTime":"10:00","departTime":"11:00"}]}'
  const out = extractJson(reply)
  assert.equal(out.feasible, true)
  assert.equal(out.stops[0].pinId, 1)
})

test('extractJson: recovers JSON with trailing prose after the object', () => {
  const reply = '{"feasible":true,"stops":[]}\n\nHope this helps!'
  assert.deepEqual(extractJson(reply), { feasible: true, stops: [] })
})

test('extractJson: throws when there is no JSON object at all', () => {
  assert.throws(() => extractJson('I cannot help with that.'))
})

test('callAI: recovers when the model wraps JSON in prose (no crash to fallback)', async () => {
  const request = async () => 'Looking at the options:\n{"feasible":true,"stops":[]}'
  const result = await callAI([{ role: 'user', content: 'hi' }], request)
  assert.deepEqual(result, { feasible: true, stops: [] })
})

test('worthRetrying: 5xx and network (no status) retry, 4xx does not', () => {
  assert.equal(worthRetrying({ status: 500 }), true)
  assert.equal(worthRetrying({ status: 503 }), true)
  assert.equal(worthRetrying(new Error('socket hang up')), true) // no status
  assert.equal(worthRetrying({ status: 400 }), false)
  assert.equal(worthRetrying({ status: 401 }), false)
})

test('callAI: rejects an empty messages array', async () => {
  await assert.rejects(() => callAI([]), /non-empty messages array/)
})

test('callAI: parses the reply JSON from the injected request', async () => {
  const request = async () => '```json\n{"feasible":true,"stops":[]}\n```'
  const result = await callAI([{ role: 'user', content: 'hi' }], request)
  assert.deepEqual(result, { feasible: true, stops: [] })
})

test('callAI: retries on a 5xx then succeeds', async () => {
  let calls = 0
  const request = async () => {
    calls += 1
    if (calls === 1) {
      const err = new Error('server busy')
      err.status = 503
      throw err
    }
    return '{"feasible":false,"reason":"nope"}'
  }
  const result = await callAI([{ role: 'user', content: 'hi' }], request)
  assert.equal(calls, 2)
  assert.deepEqual(result, { feasible: false, reason: 'nope' })
})

test('callAI: does NOT retry a 4xx — fails fast', async () => {
  let calls = 0
  const request = async () => {
    calls += 1
    const err = new Error('bad request')
    err.status = 400
    throw err
  }
  await assert.rejects(() => callAI([{ role: 'user', content: 'hi' }], request), /bad request/)
  assert.equal(calls, 1) // no retry
})

test('callAI: surfaces a parse error when the reply is not JSON', async () => {
  const request = async () => 'not json at all'
  // A SyntaxError has no .status, so worthRetrying treats it as retryable; it
  // exhausts retries and throws the last error rather than hanging.
  await assert.rejects(() => callAI([{ role: 'user', content: 'hi' }], request))
})

test('toPromptPin: caps an over-long name and floods of tags', () => {
  const pin = {
    id: 1,
    name: 'x'.repeat(500),
    category: 'activity',
    interests: Array.from({ length: 30 }, (_, i) => `tag${i}`),
    cuisine: ['mexican'],
    diet: ['vegan'],
    latitude: 37.7,
    longitude: -122.4,
    pricePerPerson: 10,
  }
  const out = toPromptPin(pin)
  assert.equal(out.name.length, 120)
  assert.ok(out.tags.length <= 12, `expected <=12 tags, got ${out.tags.length}`)
})

test('toPromptPin: caps an individual over-long tag', () => {
  const out = toPromptPin({
    id: 2,
    name: 'ok',
    category: 'activity',
    interests: ['y'.repeat(200)],
    latitude: 37.7,
    longitude: -122.4,
    pricePerPerson: 0,
  })
  assert.equal(out.tags[0].length, 40)
})
