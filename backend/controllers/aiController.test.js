// Controller-level tests for POST /ai-agent/banner's request handling: input
// validation (types + length caps), the FLAGGED->400 content-policy mapping,
// generic failure -> 500, and the success shape. The banner service is injected
// via createPostBanner({ generate }) so these run with no OpenAI key or network.
// Auth + rate limiting are separate middleware (not exercised here).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createPostBanner } from './aiController.js'

// Minimal fake Response capturing status + json, mirroring Express's chainable
// res.status(n).json(body).
function fakeRes() {
  return {
    statusCode: undefined,
    body: undefined,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }
}

const req = (body) => ({ body, user: { id: 1 } })

test('postBanner: rejects a non-string field with 400', async () => {
  const handler = createPostBanner({ generate: async () => ({ image: 'x', mediaType: 'image/png' }) })
  const res = fakeRes()
  await handler(req({ title: 123 }), res)
  assert.equal(res.statusCode, 400)
  assert.match(res.body.error, /title must be a string/)
})

test('postBanner: rejects an over-long promptText with 400', async () => {
  const handler = createPostBanner({ generate: async () => ({ image: 'x', mediaType: 'image/png' }) })
  const res = fakeRes()
  await handler(req({ promptText: 'a'.repeat(501) }), res)
  assert.equal(res.statusCode, 400)
  assert.match(res.body.error, /promptText must be 500 characters or fewer/)
})

test('postBanner: rejects an over-long title with 400', async () => {
  const handler = createPostBanner({ generate: async () => ({ image: 'x', mediaType: 'image/png' }) })
  const res = fakeRes()
  await handler(req({ title: 'a'.repeat(201) }), res)
  assert.equal(res.statusCode, 400)
  assert.match(res.body.error, /title must be 200 characters or fewer/)
})

test('postBanner: does not call the service when validation fails', async () => {
  let called = false
  const handler = createPostBanner({
    generate: async () => {
      called = true
      return { image: 'x', mediaType: 'image/png' }
    },
  })
  await handler(req({ promptText: 42 }), fakeRes())
  assert.equal(called, false, 'invalid input must be rejected before the service is called')
})

test('postBanner: maps a FLAGGED service error to a 400 content-policy message', async () => {
  const handler = createPostBanner({
    generate: async () => {
      const err = new Error('Prompt failed content moderation')
      err.code = 'FLAGGED'
      throw err
    },
  })
  const res = fakeRes()
  await handler(req({ promptText: 'something disallowed' }), res)
  assert.equal(res.statusCode, 400)
  assert.match(res.body.error, /can.t be used for a banner/i)
})

test('postBanner: maps an unexpected service error to a generic 500', async () => {
  const handler = createPostBanner({
    generate: async () => {
      throw new Error('OpenAI exploded')
    },
  })
  const res = fakeRes()
  await handler(req({ promptText: 'sunset' }), res)
  assert.equal(res.statusCode, 500)
  assert.match(res.body.error, /Failed to generate banner/)
  // The raw error must NOT leak to the client.
  assert.doesNotMatch(res.body.error, /OpenAI exploded/)
})

test('postBanner: returns 200 with the image + mediaType on success', async () => {
  const handler = createPostBanner({
    generate: async (details, promptText) => {
      assert.equal(details.location, 'San Francisco') // details threaded through
      assert.equal(promptText, 'cozy sunset')
      return { image: 'BASE64DATA', mediaType: 'image/png' }
    },
  })
  const res = fakeRes()
  await handler(req({ location: 'San Francisco', promptText: 'cozy sunset' }), res)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body, { image: 'BASE64DATA', mediaType: 'image/png' })
})

test('postBanner: tolerates a missing body without throwing', async () => {
  const handler = createPostBanner({ generate: async () => ({ image: 'x', mediaType: 'image/png' }) })
  const res = fakeRes()
  await handler({ user: { id: 1 } }, res) // no `body` at all
  assert.equal(res.statusCode, 200)
})
