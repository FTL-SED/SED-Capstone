// backend/controllers/exportController.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { exportItineraryEmail } from './exportController.js'

// Minimal req/res doubles.
function makeRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.body = payload; return this },
    send() { return this },
  }
}

// Stub the model by pre-seeding via the injected deps. exportItineraryEmail takes
// (req, res, deps) where deps = { loadOwned, findForExport, buildPdf, sendMail }.
const okOwned = async () => ({ id: 1, userId: 7, title: 'SF Day' })

test('422 when no member has an email', async () => {
  const req = { params: { id: '1' }, user: { id: 7 }, body: {} }
  const res = makeRes()
  await exportItineraryEmail(req, res, {
    loadOwned: okOwned,
    findForExport: async () => ({ id: 1, title: 'SF Day', pins: [], members: [{ name: 'Ana', email: null }] }),
    buildPdf: async () => Buffer.from('%PDF-'),
    sendMail: async () => { throw new Error('should not send') },
  })
  assert.equal(res.statusCode, 422)
})

test('200 sends one email per recipient with a real To: and reports sent/skipped', async () => {
  const req = { params: { id: '1' }, user: { id: 7, email: 'owner@x.com' }, body: {} }
  const res = makeRes()
  const calls = []
  await exportItineraryEmail(req, res, {
    loadOwned: okOwned,
    findForExport: async () => ({
      id: 1, title: 'SF Day', pins: [],
      members: [{ name: 'Ana', email: 'ana@x.com' }, { name: 'Bo', email: null }],
    }),
    buildPdf: async () => Buffer.from('%PDF-1.4'),
    sendMail: async (args) => { calls.push(args); return { messageId: 'm1' } },
  })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body.sent, [{ name: 'Ana', email: 'ana@x.com' }])
  assert.deepEqual(res.body.failed, [])
  assert.deepEqual(res.body.skipped, [{ name: 'Bo' }])
  // Exactly one message went out — to the only member with an email.
  assert.equal(calls.length, 1)
  assert.equal(calls[0].to, 'ana@x.com')
  assert.equal(calls[0].bcc, undefined)
  assert.ok(calls[0].attachments?.[0]?.content instanceof Buffer)
})

test('email is deliverability-friendly: one To: per recipient, replyTo owner, multipart HTML', async () => {
  const req = { params: { id: '1' }, user: { id: 7, email: 'owner@x.com' }, body: {} }
  const res = makeRes()
  const calls = []
  await exportItineraryEmail(req, res, {
    loadOwned: okOwned,
    findForExport: async () => ({
      id: 1, title: 'SF Day', pins: [],
      members: [{ name: 'Ana', email: 'ana@x.com' }, { name: 'Bo', email: 'bo@x.com' }],
    }),
    buildPdf: async () => Buffer.from('%PDF-1.4'),
    sendMail: async (args) => { calls.push(args); return { messageId: 'm1' } },
  })
  assert.equal(res.statusCode, 200)
  // One personalized message per recipient, each with its own real To: header
  // (no BCC blast — far less spam-prone).
  assert.equal(calls.length, 2)
  assert.deepEqual(calls.map((c) => c.to), ['ana@x.com', 'bo@x.com'])
  assert.ok(calls.every((c) => c.bcc === undefined))
  // No Reply-To: it exposed the organizer's personal email to every recipient
  // and created a From≠Reply-To mismatch that spam filters penalize.
  assert.ok(calls.every((c) => c.replyTo === undefined))
  // A proper multipart body: both text and HTML present, greeting by name.
  assert.ok(calls.every((c) => typeof c.text === 'string' && c.text.length > 0))
  assert.ok(calls.every((c) => /NavQuest/.test(c.html)))
  assert.match(calls[0].html, /Hi Ana,/)
  assert.match(calls[1].html, /Hi Bo,/)
})

test('email HTML escapes a malicious itinerary title', async () => {
  const req = { params: { id: '1' }, user: { id: 7, email: 'owner@x.com' }, body: {} }
  const res = makeRes()
  const calls = []
  await exportItineraryEmail(req, res, {
    loadOwned: okOwned,
    findForExport: async () => ({
      id: 1, title: '<script>alert(1)</script>', pins: [],
      members: [{ name: 'Ana', email: 'ana@x.com' }],
    }),
    buildPdf: async () => Buffer.from('%PDF-1.4'),
    sendMail: async (args) => { calls.push(args); return { messageId: 'm1' } },
  })
  assert.equal(res.statusCode, 200)
  assert.doesNotMatch(calls[0].html, /<script>/)
  assert.match(calls[0].html, /&lt;script&gt;/)
})

test('200 with partial failure: some recipients fail, others succeed', async () => {
  const req = { params: { id: '1' }, user: { id: 7, email: 'owner@x.com' }, body: {} }
  const res = makeRes()
  await exportItineraryEmail(req, res, {
    loadOwned: okOwned,
    findForExport: async () => ({
      id: 1, title: 'SF Day', pins: [],
      members: [{ name: 'Ana', email: 'ana@x.com' }, { name: 'Bo', email: 'bo@x.com' }],
    }),
    buildPdf: async () => Buffer.from('%PDF-1.4'),
    sendMail: async (args) => {
      if (args.to === 'bo@x.com') throw new Error('smtp down')
      return { messageId: 'm1' }
    },
  })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body.sent, [{ name: 'Ana', email: 'ana@x.com' }])
  assert.deepEqual(res.body.failed, [{ name: 'Bo', email: 'bo@x.com' }])
})

test('502 when every send fails', async () => {
  const req = { params: { id: '1' }, user: { id: 7 }, body: {} }
  const res = makeRes()
  await exportItineraryEmail(req, res, {
    loadOwned: okOwned,
    findForExport: async () => ({ id: 1, title: 'SF Day', pins: [], members: [{ name: 'Ana', email: 'ana@x.com' }] }),
    buildPdf: async () => Buffer.from('%PDF-'),
    sendMail: async () => { throw new Error('smtp down') },
  })
  assert.equal(res.statusCode, 502)
})

test('502 when the PDF build fails', async () => {
  const req = { params: { id: '1' }, user: { id: 7 }, body: {} }
  const res = makeRes()
  await exportItineraryEmail(req, res, {
    loadOwned: okOwned,
    findForExport: async () => ({ id: 1, title: 'SF Day', pins: [], members: [{ name: 'Ana', email: 'ana@x.com' }] }),
    buildPdf: async () => { throw new Error('pdfkit blew up') },
    sendMail: async () => { throw new Error('should not send') },
  })
  assert.equal(res.statusCode, 502)
})
