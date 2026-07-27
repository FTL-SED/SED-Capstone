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

test('200 sends one BCC email and reports sent/skipped', async () => {
  const req = { params: { id: '1' }, user: { id: 7 }, body: {} }
  const res = makeRes()
  let sentArgs
  await exportItineraryEmail(req, res, {
    loadOwned: okOwned,
    findForExport: async () => ({
      id: 1, title: 'SF Day', pins: [],
      members: [{ name: 'Ana', email: 'ana@x.com' }, { name: 'Bo', email: null }],
    }),
    buildPdf: async () => Buffer.from('%PDF-1.4'),
    sendMail: async (args) => { sentArgs = args; return { messageId: 'm1' } },
  })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body.sent, [{ name: 'Ana', email: 'ana@x.com' }])
  assert.deepEqual(res.body.skipped, [{ name: 'Bo' }])
  assert.deepEqual(sentArgs.bcc, ['ana@x.com'])
  assert.ok(sentArgs.attachments?.[0]?.content instanceof Buffer)
})

test('502 when sending fails', async () => {
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
