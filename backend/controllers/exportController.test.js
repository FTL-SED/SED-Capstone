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

// deps = { findBasic, findForExport, buildPdf, sendMail }.
const publicRow = async () => ({ id: 1, userId: 7, isPublic: true, title: 'SF Day' })
const privateOwnedRow = async () => ({ id: 1, userId: 7, isPublic: false, title: 'SF Day' })
const exportData = async () => ({ id: 1, title: 'SF Day', pins: [] })

test('400 when emails is missing', async () => {
  const req = { params: { id: '1' }, user: { id: 7 }, body: {} }
  const res = makeRes()
  await exportItineraryEmail(req, res, {
    findBasic: publicRow,
    findForExport: exportData,
    buildPdf: async () => Buffer.from('%PDF-'),
    sendMail: async () => { throw new Error('should not send') },
  })
  assert.equal(res.statusCode, 400)
})

test('400 when emails is empty after filtering invalid entries', async () => {
  const req = { params: { id: '1' }, user: { id: 7 }, body: { emails: ['nope', ''] } }
  const res = makeRes()
  await exportItineraryEmail(req, res, {
    findBasic: publicRow,
    findForExport: exportData,
    buildPdf: async () => Buffer.from('%PDF-'),
    sendMail: async () => { throw new Error('should not send') },
  })
  assert.equal(res.statusCode, 400)
})

test('404 when the itinerary does not exist', async () => {
  const req = { params: { id: '1' }, user: { id: 7 }, body: { emails: ['a@x.com'] } }
  const res = makeRes()
  await exportItineraryEmail(req, res, {
    findBasic: async () => null,
    findForExport: exportData,
    buildPdf: async () => Buffer.from('%PDF-'),
    sendMail: async () => { throw new Error('should not send') },
  })
  assert.equal(res.statusCode, 404)
})

test('404 when a non-owner requests a private itinerary', async () => {
  const req = { params: { id: '1' }, user: { id: 99 }, body: { emails: ['a@x.com'] } }
  const res = makeRes()
  await exportItineraryEmail(req, res, {
    findBasic: privateOwnedRow, // owned by 7, requester is 99
    findForExport: exportData,
    buildPdf: async () => Buffer.from('%PDF-'),
    sendMail: async () => { throw new Error('should not send') },
  })
  assert.equal(res.statusCode, 404)
})

test('200 a non-owner CAN email a public itinerary', async () => {
  const req = { params: { id: '1' }, user: { id: 99 }, body: { emails: ['a@x.com'] } }
  const res = makeRes()
  const calls = []
  await exportItineraryEmail(req, res, {
    findBasic: publicRow, // public, requester 99 is not the owner
    findForExport: exportData,
    buildPdf: async () => Buffer.from('%PDF-1.4'),
    sendMail: async (args) => { calls.push(args); return { messageId: 'm1' } },
  })
  assert.equal(res.statusCode, 200)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].to, 'a@x.com')
})

test('200 sends one email per address, dedupes, generic greeting, no bcc', async () => {
  const req = { params: { id: '1' }, user: { id: 7 }, body: { emails: ['ana@x.com', 'ana@x.com', 'bo@x.com'] } }
  const res = makeRes()
  const calls = []
  await exportItineraryEmail(req, res, {
    findBasic: publicRow,
    findForExport: exportData,
    buildPdf: async () => Buffer.from('%PDF-1.4'),
    sendMail: async (args) => { calls.push(args); return { messageId: 'm1' } },
  })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body.sent, [{ email: 'ana@x.com' }, { email: 'bo@x.com' }])
  assert.deepEqual(res.body.failed, [])
  assert.equal(res.body.skipped, undefined) // dropped from the contract
  assert.equal(calls.length, 2) // deduped
  assert.deepEqual(calls.map((c) => c.to), ['ana@x.com', 'bo@x.com'])
  assert.ok(calls.every((c) => c.bcc === undefined))
  assert.ok(calls.every((c) => c.attachments?.[0]?.content instanceof Buffer))
  // Generic greeting, no per-recipient name.
  assert.ok(calls.every((c) => /Hi there,/.test(c.html)))
})

test('email HTML escapes a malicious itinerary title', async () => {
  const req = { params: { id: '1' }, user: { id: 7 }, body: { emails: ['ana@x.com'] } }
  const res = makeRes()
  const calls = []
  await exportItineraryEmail(req, res, {
    findBasic: publicRow,
    findForExport: async () => ({ id: 1, title: '<script>alert(1)</script>', pins: [] }),
    buildPdf: async () => Buffer.from('%PDF-1.4'),
    sendMail: async (args) => { calls.push(args); return { messageId: 'm1' } },
  })
  assert.equal(res.statusCode, 200)
  assert.doesNotMatch(calls[0].html, /<script>/)
  assert.match(calls[0].html, /&lt;script&gt;/)
})

test('200 with partial failure: some addresses fail, others succeed', async () => {
  const req = { params: { id: '1' }, user: { id: 7 }, body: { emails: ['ana@x.com', 'bo@x.com'] } }
  const res = makeRes()
  await exportItineraryEmail(req, res, {
    findBasic: publicRow,
    findForExport: exportData,
    buildPdf: async () => Buffer.from('%PDF-1.4'),
    sendMail: async (args) => {
      if (args.to === 'bo@x.com') throw new Error('smtp down')
      return { messageId: 'm1' }
    },
  })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body.sent, [{ email: 'ana@x.com' }])
  assert.deepEqual(res.body.failed, [{ email: 'bo@x.com' }])
})

test('502 when every send fails', async () => {
  const req = { params: { id: '1' }, user: { id: 7 }, body: { emails: ['ana@x.com'] } }
  const res = makeRes()
  await exportItineraryEmail(req, res, {
    findBasic: publicRow,
    findForExport: exportData,
    buildPdf: async () => Buffer.from('%PDF-'),
    sendMail: async () => { throw new Error('smtp down') },
  })
  assert.equal(res.statusCode, 502)
})

test('502 when the PDF build fails', async () => {
  const req = { params: { id: '1' }, user: { id: 7 }, body: { emails: ['ana@x.com'] } }
  const res = makeRes()
  await exportItineraryEmail(req, res, {
    findBasic: publicRow,
    findForExport: exportData,
    buildPdf: async () => { throw new Error('pdfkit blew up') },
    sendMail: async () => { throw new Error('should not send') },
  })
  assert.equal(res.statusCode, 502)
})
