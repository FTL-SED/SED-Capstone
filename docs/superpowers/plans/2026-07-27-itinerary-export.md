# Itinerary Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Export feature to the itinerary page: copy the itinerary as text to the clipboard (any viewer), and email a PDF of it to the itinerary's group members (owner only).

**Architecture:** A pure summary generator produces structured text data; it is duplicated (frontend copy for clipboard, backend copy for the PDF) since each side already holds the data. The backend renders the PDF with pdfkit and emails it with nodemailer over the existing Gmail SMTP credentials. Member emails are collected in the generation wizard and persisted on `ItineraryMember`.

**Tech Stack:** Node ESM, Express 5, Prisma 6 (Supabase Postgres), `pdfkit`, `nodemailer`; React 19, axios; `node --test` on both sides.

## Global Constraints

- Backend is ESM (`"type": "module"`): use `import`/`export`, `.js` extensions in import paths.
- Layering: route → middleware → controller → model → Prisma; `lib/` is the ONLY place `process.env` is read; `utils/` is pure and dependency-free; `services/` holds multi-step domain logic. Never touch `req`/`res` outside controllers.
- Tests are co-located `*.test.js`; run with `npm test` (`node --test`) from `backend/` or `frontend/`.
- Shared Supabase DB: NEVER `prisma migrate reset` / `db push --force-reset`. `git pull` before creating a migration; commit the generated `prisma/migrations/<name>/` folder. **PAUSE and get the user's explicit go-ahead before running any Prisma command against the DB.**
- Do NOT run `git commit` automatically — the user commits their own work. Each "Commit" step below means: stage nothing on the user's behalf beyond what the step says and leave committing to the user, OR run the commit only if the user has said to. Default: prepare changes and tell the user they're ready.
- Frontend `CLAUDE.md`: follow the spec's file structure; the new files below ARE the spec's structure, so creating them is authorized. Don't add files beyond those listed.
- Never print or commit `.env` values (`GMAIL_USER`, `GMAIL_APP_PASSWORD`).

## File Structure

**Backend**
- Create `backend/utils/itinerarySummary.js` — pure: itinerary → `{ title, subtitle, lines[] }`.
- Create `backend/utils/itinerarySummary.test.js`.
- Create `backend/services/export/itineraryPdf.js` — pdfkit: itinerary → PDF `Buffer`.
- Create `backend/services/export/itineraryPdf.test.js`.
- Create `backend/lib/mailer.js` — nodemailer Gmail transport + `sendMail`.
- Create `backend/controllers/exportController.js` — owner-only email export handler.
- Create `backend/controllers/exportController.test.js`.
- Modify `backend/models/itineraries.js` — add `findByIdForExport(id)`.
- Modify `backend/routes/itineraryRoutes.js` — mount `POST /:id/export/email`.
- Modify `backend/prisma/schema.prisma` — add `ItineraryMember.email String?`.
- Modify `backend/services/itinerary/persist.js` — `memberRows` carries `email`.
- Modify `backend/services/itinerary/persist.test.js` — assert email mapping.

**Frontend**
- Create `frontend/src/utils/itinerarySummary.js` — pure: itinerary → text string.
- Create `frontend/src/utils/itinerarySummary.test.js`.
- Create `frontend/src/pages/ItineraryPage/ExportButton/ExportButton.jsx` + `.css`.
- Modify `frontend/src/api/itinerary.js` — add `emailItinerary(id)`.
- Modify `frontend/src/pages/ItineraryPage/ActionBar/ActionBar.jsx` — render ExportButton.
- Modify `frontend/src/pages/ItineraryPage/ItineraryPanel/ItineraryPanel.jsx` — thread props.
- Modify `frontend/src/pages/ItineraryPage/ItineraryPage.jsx` — copy + email handlers.
- Modify `frontend/src/pages/CreateItineraryPage/memberModel.js` — `email: ''`.
- Modify `frontend/src/pages/CreateItineraryPage/MemberCard/MemberCard.jsx` — email input.
- Modify `frontend/src/pages/CreateItineraryPage/buildRequest.js` — carry email.
- Modify `frontend/src/pages/CreateItineraryPage/buildRequest.test.js` — assert email.

---

## Task 1: Backend summary generator (`utils/itinerarySummary.js`)

Pure function shared in spirit with the frontend copy. Input is the reshaped itinerary
shape returned by `models/itineraries.js` (`.pins[]` flattened, ISO Pacific times).

**Files:**
- Create: `backend/utils/itinerarySummary.js`
- Test: `backend/utils/itinerarySummary.test.js`

**Interfaces:**
- Consumes: nothing (pure).
- Produces: `buildItinerarySummary(itinerary) -> { title: string, subtitle: string, lines: string[] }`
  where `itinerary = { title, location, tripDate?, dayStart?, dayEnd?, maxBudgetPerPerson?, transport?, pins?: [{ name, startTime, endTime, tags?, travelTimeToNextMinutes? }] }`.
  `lines` is one entry per stop (numbered, with a `↳` continuation folded into the same string when travel time is present).

- [ ] **Step 1: Write the failing test**

```js
// backend/utils/itinerarySummary.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildItinerarySummary } from './itinerarySummary.js'

// Times are ISO in Pacific wall-clock (see WrittenItinerary.formatTime).
const itinerary = {
  title: 'Weekend in SF',
  location: 'San Francisco',
  tripDate: '2026-08-02T00:00:00.000Z',
  dayStart: '09:00',
  dayEnd: '21:00',
  maxBudgetPerPerson: 80,
  transport: 'transit',
  pins: [
    { name: 'Blue Bottle', startTime: '2026-08-02T16:00:00.000Z', endTime: '2026-08-02T17:30:00.000Z', tags: ['cafe'], travelTimeToNextMinutes: 12 },
    { name: 'Golden Gate Park', startTime: '2026-08-02T18:00:00.000Z', endTime: '2026-08-02T20:00:00.000Z', tags: ['park'] },
  ],
}

test('buildItinerarySummary: title, subtitle, and one line per stop', () => {
  const s = buildItinerarySummary(itinerary)
  assert.equal(s.title, 'NavQuest — Weekend in SF')
  assert.match(s.subtitle, /San Francisco/)
  assert.match(s.subtitle, /09:00.*21:00/)
  assert.match(s.subtitle, /transit/)
  assert.match(s.subtitle, /\$80\/person/)
  assert.equal(s.lines.length, 2)
  assert.match(s.lines[0], /^1\. .*Blue Bottle/)
  assert.match(s.lines[0], /12 min to next stop/)
  assert.match(s.lines[1], /^2\. .*Golden Gate Park/)
})

test('buildItinerarySummary: missing budget/transport/travel omitted, no crash on empty', () => {
  const s = buildItinerarySummary({ title: 'Bare', location: 'SF', pins: [] })
  assert.equal(s.title, 'NavQuest — Bare')
  assert.doesNotMatch(s.subtitle, /person/)
  assert.doesNotMatch(s.subtitle, /undefined/)
  assert.equal(s.lines.length, 0)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && node --test utils/itinerarySummary.test.js`
Expected: FAIL — `Cannot find module './itinerarySummary.js'`.

- [ ] **Step 3: Write minimal implementation**

```js
// backend/utils/itinerarySummary.js
// Pure, dependency-free. Turns a reshaped itinerary (models/itineraries.js shape)
// into structured text data. Consumers own final formatting: the PDF service draws
// each line; a clipboard consumer would join them with "\n". Missing fields are
// omitted rather than rendered as "undefined" (matches the engine's don't-punish
// convention). Stop times are ISO in Pacific wall-clock, shown as HH:MM in that zone.

const TIME_ZONE = 'America/Los_Angeles'

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TIME_ZONE,
  })
}

function fmtDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: TIME_ZONE,
  })
}

function buildSubtitle(itinerary) {
  const segments = []
  const date = fmtDate(itinerary.tripDate)
  if (date) segments.push(date)
  if (itinerary.location) segments.push(itinerary.location)
  if (itinerary.dayStart && itinerary.dayEnd) {
    segments.push(`${itinerary.dayStart}–${itinerary.dayEnd}`)
  }
  if (itinerary.transport) segments.push(itinerary.transport)
  if (typeof itinerary.maxBudgetPerPerson === 'number') {
    segments.push(`~$${itinerary.maxBudgetPerPerson}/person`)
  }
  return segments.join(' · ')
}

function buildLine(pin, index) {
  const times = [fmtTime(pin.startTime), fmtTime(pin.endTime)].filter(Boolean).join('–')
  const category = Array.isArray(pin.tags) && pin.tags.length > 0 ? `  (${pin.tags[0]})` : ''
  let line = `${index + 1}. ${times ? times + '  ' : ''}${pin.name}${category}`
  if (typeof pin.travelTimeToNextMinutes === 'number') {
    line += `\n   ↳ ${pin.travelTimeToNextMinutes} min to next stop`
  }
  return line
}

export function buildItinerarySummary(itinerary) {
  const pins = Array.isArray(itinerary?.pins) ? itinerary.pins : []
  return {
    title: `NavQuest — ${itinerary?.title ?? 'Itinerary'}`,
    subtitle: buildSubtitle(itinerary ?? {}),
    lines: pins.map(buildLine),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && node --test utils/itinerarySummary.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

Prepare the change and tell the user it's ready to commit (do NOT auto-commit):
```bash
git add backend/utils/itinerarySummary.js backend/utils/itinerarySummary.test.js
# leave the commit to the user:
# git commit -m "feat(export): pure itinerary text-summary generator (backend)"
```

---

## Task 2: PDF service (`services/export/itineraryPdf.js`)

**Files:**
- Create: `backend/services/export/itineraryPdf.js`
- Test: `backend/services/export/itineraryPdf.test.js`

**Interfaces:**
- Consumes: `buildItinerarySummary` from `../../utils/itinerarySummary.js`.
- Produces: `buildItineraryPdf(itinerary) -> Promise<Buffer>` — a complete PDF document in memory.

- [ ] **Step 1: Install pdfkit**

Run: `cd backend && npm install pdfkit`
Expected: `pdfkit` appears in `dependencies`.

- [ ] **Step 2: Write the failing test**

```js
// backend/services/export/itineraryPdf.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildItineraryPdf } from './itineraryPdf.js'

const itinerary = {
  title: 'Weekend in SF',
  location: 'San Francisco',
  dayStart: '09:00',
  dayEnd: '21:00',
  pins: [
    { name: 'Blue Bottle', startTime: '2026-08-02T16:00:00.000Z', endTime: '2026-08-02T17:30:00.000Z', tags: ['cafe'] },
  ],
}

test('buildItineraryPdf returns a non-empty PDF buffer', async () => {
  const buf = await buildItineraryPdf(itinerary)
  assert.ok(Buffer.isBuffer(buf))
  assert.ok(buf.length > 0)
  // Every PDF starts with the "%PDF-" magic header.
  assert.equal(buf.subarray(0, 5).toString('ascii'), '%PDF-')
})

test('buildItineraryPdf handles an itinerary with no stops', async () => {
  const buf = await buildItineraryPdf({ title: 'Empty', location: 'SF', pins: [] })
  assert.ok(Buffer.isBuffer(buf) && buf.length > 0)
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && node --test services/export/itineraryPdf.test.js`
Expected: FAIL — `Cannot find module './itineraryPdf.js'`.

- [ ] **Step 4: Write minimal implementation**

```js
// backend/services/export/itineraryPdf.js
// Renders an itinerary to a PDF Buffer with pdfkit. Owns only DRAWING (layout,
// fonts, spacing); WHAT to say comes from buildItinerarySummary so the PDF and the
// clipboard text stay in sync. Returns an in-memory Buffer (no temp files) so the
// mailer can attach it directly.
import PDFDocument from 'pdfkit'
import { buildItinerarySummary } from '../../utils/itinerarySummary.js'

export function buildItineraryPdf(itinerary) {
  const { title, subtitle, lines } = buildItinerarySummary(itinerary)

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 54 })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(20).text(title)
    if (subtitle) doc.moveDown(0.3).fontSize(11).fillColor('#555').text(subtitle)
    doc.moveDown(1).fillColor('#000')

    doc.fontSize(12)
    for (const line of lines) {
      doc.text(line)
      doc.moveDown(0.5)
    }

    doc.end()
  })
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && node --test services/export/itineraryPdf.test.js`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

Prepare and hand off to the user (do NOT auto-commit):
```bash
git add backend/package.json backend/package-lock.json backend/services/export/itineraryPdf.js backend/services/export/itineraryPdf.test.js
# git commit -m "feat(export): render itinerary PDF with pdfkit"
```

---

## Task 3: Mail client (`lib/mailer.js`)

No unit test (it wraps an external service and reads env); it is exercised through the
controller test in Task 5 via dependency injection.

**Files:**
- Create: `backend/lib/mailer.js`

**Interfaces:**
- Consumes: `process.env.GMAIL_USER`, `process.env.GMAIL_APP_PASSWORD`, `nodemailer`.
- Produces: `sendMail({ to, bcc, subject, text, attachments }) -> Promise<info>` and default export `transporter`.

- [ ] **Step 1: Install nodemailer**

Run: `cd backend && npm install nodemailer`
Expected: `nodemailer` appears in `dependencies`.

- [ ] **Step 2: Write the implementation**

```js
// backend/lib/mailer.js
// Gmail SMTP client. lib/ is the only layer that reads process.env (backend rules).
// Uses an app password (GMAIL_APP_PASSWORD) — no OAuth. Created once as a module
// singleton, like lib/prisma.js and lib/supabase.js.
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

// Sends one message. `from` defaults to the configured Gmail account.
// attachments: [{ filename, content: Buffer, contentType }].
export function sendMail({ to, bcc, subject, text, attachments }) {
  return transporter.sendMail({
    from: process.env.GMAIL_USER,
    to,
    bcc,
    subject,
    text,
    attachments,
  })
}

export default transporter
```

- [ ] **Step 3: Verify it imports without throwing**

Run: `cd backend && node -e "import('./lib/mailer.js').then(() => console.log('ok'))"`
Expected: prints `ok` (transport is created lazily; no connection is opened on import).

- [ ] **Step 4: Commit**

Prepare and hand off to the user (do NOT auto-commit):
```bash
git add backend/package.json backend/package-lock.json backend/lib/mailer.js
# git commit -m "feat(export): add Gmail SMTP mailer client"
```

---

## Task 4: Persist member emails (schema + `memberRows`)

**Files:**
- Modify: `backend/prisma/schema.prisma` (ItineraryMember model)
- Modify: `backend/services/itinerary/persist.js:130-147` (`memberRows`)
- Modify: `backend/services/itinerary/persist.test.js:95-110`

**Interfaces:**
- Consumes: member objects now optionally carrying `email` (string).
- Produces: `memberRows` output rows gain `email: string | null`.

- [ ] **Step 1: Write the failing test (update `memberRows` expectations)**

In `backend/services/itinerary/persist.test.js`, update the first `memberRows` test's
input and expected row to include email:

```js
test('memberRows maps group members onto ItineraryMember rows', () => {
  const members = [
    { name: 'Ana', startLocation: { latitude: 37.78, longitude: -122.41, label: 'SoMa, SF' }, interestTags: ['art'], foodPrefs: ['sushi'], diet: ['vegan'], email: 'ana@example.com' },
    { name: '  ', startLocation: { latitude: 37.76, longitude: -122.42 }, interestTags: [], foodPrefs: [] },
  ]
  const rows = memberRows(members)
  assert.equal(rows.length, 2)
  assert.deepEqual(rows[0], {
    name: 'Ana', startLabel: 'SoMa, SF', startLat: 37.78, startLng: -122.41,
    interestTags: ['art'], foodPrefs: ['sushi'], diets: ['vegan'], email: 'ana@example.com',
  })
  // Blank name falls back; missing label/diet/email default cleanly.
  assert.equal(rows[1].name, 'Member')
  assert.equal(rows[1].startLabel, null)
  assert.deepEqual(rows[1].diets, [])
  assert.equal(rows[1].email, null)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && node --test services/itinerary/persist.test.js`
Expected: FAIL — `rows[0]` lacks `email`; `rows[1].email` is `undefined`, not `null`.

- [ ] **Step 3: Update `memberRows` to carry email**

In `backend/services/itinerary/persist.js`, inside the object returned by `memberRows`
(after the `diets:` line), add:

```js
      diets: Array.isArray(m.diet) ? m.diet : [],
      // Optional per-member email, collected in the wizard; used by the email
      // export. Trim + normalize to null so blank strings never become recipients.
      email: typeof m.email === 'string' && m.email.trim() ? m.email.trim() : null,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && node --test services/itinerary/persist.test.js`
Expected: PASS.

- [ ] **Step 5: Add the schema column**

In `backend/prisma/schema.prisma`, add to `model ItineraryMember` (after `diets`):

```prisma
  diets         String[]  // this member's dietary requirements
  email         String?   // optional; collected in the wizard, used for email export
```

- [ ] **Step 6: PAUSE — get the user's go-ahead, then create the migration**

Per the shared-DB rules, do NOT run this unprompted. Tell the user the schema is ready
and ask them to confirm before running:

Run (only after `git pull` and explicit approval):
`cd backend && npx prisma migrate dev --name add_itinerary_member_email`
Expected: creates `prisma/migrations/<timestamp>_add_itinerary_member_email/migration.sql`
containing `ALTER TABLE "ItineraryMember" ADD COLUMN "email" TEXT;`, regenerates the client.

- [ ] **Step 7: Verify client + tests**

Run: `cd backend && node --test services/itinerary/persist.test.js`
Expected: PASS. `npx prisma generate` has run (via migrate dev) so `email` is a known field.

- [ ] **Step 8: Commit**

Prepare and hand off to the user (do NOT auto-commit); the generated migration folder MUST be included:
```bash
git add backend/prisma/schema.prisma backend/prisma/migrations backend/services/itinerary/persist.js backend/services/itinerary/persist.test.js
# git commit -m "feat(export): persist optional member email"
```

---

## Task 5: Email-export endpoint (`POST /itineraries/:id/export/email`)

Owner-only. Fetches the itinerary + members, builds the PDF, BCC-emails members that have
an address, returns `{ sent, skipped }`.

**Files:**
- Modify: `backend/models/itineraries.js` (add `findByIdForExport`)
- Create: `backend/controllers/exportController.js`
- Create: `backend/controllers/exportController.test.js`
- Modify: `backend/routes/itineraryRoutes.js`

**Interfaces:**
- Consumes: `loadOwned` from `./helpers.js`; `buildItineraryPdf` from `../services/export/itineraryPdf.js`; `sendMail` from `../lib/mailer.js`; `findByIdForExport`, `findByIdBasic` from `../models/itineraries.js`.
- Produces: `exportItineraryEmail(req, res, { sendMail, buildPdf })` — a controller with injectable seams (default to the real `sendMail`/`buildItineraryPdf`). Route handler passes no overrides. Response `200 { sent: [{ name, email }], skipped: [{ name }] }`; `422` if no member has an email; `502` on SMTP failure; `403`/`404` via `loadOwned`.

- [ ] **Step 1: Add the model fetch**

In `backend/models/itineraries.js`, add before the `export {` block:

```js
// Full record for the email export: the owner shape (stops+pins for the PDF) plus
// members WITH their emails (the recipient list). Returns the reshaped itinerary
// (pins[] flattened) with `members` included (email is a scalar, so `members: true`
// carries it). Caller must have already confirmed ownership.
async function findByIdForExport(id) {
  const itinerary = await prisma.itinerary.findUnique({
    where: { id },
    include: detailInclude(true),
  })
  return reshapeItinerary(itinerary, { forOwner: true })
}
```

Add `findByIdForExport` to the `export { ... }` list.

- [ ] **Step 2: Write the failing controller test**

```js
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && node --test controllers/exportController.test.js`
Expected: FAIL — `Cannot find module './exportController.js'`.

- [ ] **Step 4: Write the controller**

```js
// backend/controllers/exportController.js
// POST /itineraries/:id/export/email — owner-only. Builds a PDF of the itinerary
// and BCC-emails it to the group members that have an email address. Member emails
// are private owner-only data, so this mirrors the owner-gating used elsewhere.
import * as itineraries from '../models/itineraries.js'
import { parseIdParam, loadOwned } from './helpers.js'
import { buildItineraryPdf } from '../services/export/itineraryPdf.js'
import { sendMail as realSendMail } from '../lib/mailer.js'

// Deps are injectable so the unit test can run without a DB or live SMTP.
const DEFAULT_DEPS = {
  loadOwned,
  findForExport: itineraries.findByIdForExport,
  buildPdf: buildItineraryPdf,
  sendMail: realSendMail,
}

async function exportItineraryEmail(req, res, deps = {}) {
  const { loadOwned: owned, findForExport, buildPdf, sendMail } = { ...DEFAULT_DEPS, ...deps }

  const id = parseIdParam(req, res, 'itinerary id')
  if (id === null) return

  // 404 if missing, 403 if not the owner (sets the response itself).
  const ownedRow = await owned(res, itineraries.findByIdBasic, id, req.user.id, {
    label: 'Itinerary',
    action: 'export',
  })
  if (!ownedRow) return

  const itinerary = await findForExport(id)
  const members = Array.isArray(itinerary.members) ? itinerary.members : []

  const recipients = members.filter((m) => typeof m.email === 'string' && m.email.trim())
  const skipped = members
    .filter((m) => !(typeof m.email === 'string' && m.email.trim()))
    .map((m) => ({ name: m.name }))

  if (recipients.length === 0) {
    return res.status(422).json({ error: 'No group members have an email address to send to.' })
  }

  try {
    const pdf = await buildPdf(itinerary)
    const filename = `${(itinerary.title || 'itinerary').replace(/[^\w.-]+/g, '_')}.pdf`

    await sendMail({
      subject: `Your NavQuest itinerary: ${itinerary.title}`,
      text: `Here's our plan for ${itinerary.title}. The full itinerary is attached as a PDF.`,
      bcc: recipients.map((m) => m.email.trim()),
      attachments: [{ filename, content: pdf, contentType: 'application/pdf' }],
    })

    return res.status(200).json({
      sent: recipients.map((m) => ({ name: m.name, email: m.email.trim() })),
      skipped,
    })
  } catch (err) {
    console.error('exportItineraryEmail failed:', err)
    return res.status(502).json({ error: 'Failed to send itinerary email' })
  }
}

export { exportItineraryEmail }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && node --test controllers/exportController.test.js`
Expected: PASS (3 tests).

- [ ] **Step 6: Mount the route**

In `backend/routes/itineraryRoutes.js`, add the import and route (the handler ignores the
3rd arg on a normal request, so pass it directly):

```js
import { exportItineraryEmail } from '../controllers/exportController.js'
```
```js
router.post('/:id/export/email', requireAuth, exportItineraryEmail)
```

- [ ] **Step 7: Run the full backend suite**

Run: `cd backend && npm test`
Expected: all tests pass (previous count + the new export tests).

- [ ] **Step 8: Commit**

Prepare and hand off to the user (do NOT auto-commit):
```bash
git add backend/models/itineraries.js backend/controllers/exportController.js backend/controllers/exportController.test.js backend/routes/itineraryRoutes.js
# git commit -m "feat(export): owner-only email-to-group endpoint"
```

---

## Task 6: Frontend summary generator (`utils/itinerarySummary.js`)

Mirrors Task 1 but returns a single ready-to-copy string (the clipboard consumer). Same
input shape as the loaded itinerary object on `ItineraryPage`.

**Files:**
- Create: `frontend/src/utils/itinerarySummary.js`
- Test: `frontend/src/utils/itinerarySummary.test.js`

**Interfaces:**
- Consumes: nothing (pure).
- Produces: `buildItinerarySummaryText(itinerary) -> string` (title + subtitle + one block per stop, joined with newlines). Input shape identical to Task 1's.

- [ ] **Step 1: Write the failing test**

```js
// frontend/src/utils/itinerarySummary.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildItinerarySummaryText } from './itinerarySummary.js'

const itinerary = {
  title: 'Weekend in SF',
  location: 'San Francisco',
  dayStart: '09:00',
  dayEnd: '21:00',
  maxBudgetPerPerson: 80,
  transport: 'transit',
  pins: [
    { name: 'Blue Bottle', startTime: '2026-08-02T16:00:00.000Z', endTime: '2026-08-02T17:30:00.000Z', tags: ['cafe'], travelTimeToNextMinutes: 12 },
    { name: 'Golden Gate Park', startTime: '2026-08-02T18:00:00.000Z', endTime: '2026-08-02T20:00:00.000Z', tags: ['park'] },
  ],
}

test('buildItinerarySummaryText: single string with header and stops', () => {
  const text = buildItinerarySummaryText(itinerary)
  assert.match(text, /^NavQuest — Weekend in SF/)
  assert.match(text, /San Francisco/)
  assert.match(text, /\$80\/person/)
  assert.match(text, /1\. .*Blue Bottle/)
  assert.match(text, /12 min to next stop/)
  assert.match(text, /2\. .*Golden Gate Park/)
})

test('buildItinerarySummaryText: no crash on empty pins / missing fields', () => {
  const text = buildItinerarySummaryText({ title: 'Bare', location: 'SF', pins: [] })
  assert.match(text, /NavQuest — Bare/)
  assert.doesNotMatch(text, /undefined/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && node --test src/utils/itinerarySummary.test.js`
Expected: FAIL — `Cannot find module './itinerarySummary.js'`.

- [ ] **Step 3: Write minimal implementation**

```js
// frontend/src/utils/itinerarySummary.js
// Pure, dependency-free. Formats the loaded itinerary (the GET /itineraries/:id
// reshaped shape) into a plain-text summary for the clipboard. Kept separate from
// the backend's copy (which feeds the PDF) — each side already has the data, so a
// small duplicated pure function avoids a network round-trip just to copy. Times
// are ISO in Pacific wall-clock; shown as HH:MM in that zone (matches WrittenItinerary).

const TIME_ZONE = 'America/Los_Angeles'

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TIME_ZONE,
  })
}

function buildSubtitle(itinerary) {
  const segments = []
  if (itinerary.location) segments.push(itinerary.location)
  if (itinerary.dayStart && itinerary.dayEnd) segments.push(`${itinerary.dayStart}–${itinerary.dayEnd}`)
  if (itinerary.transport) segments.push(itinerary.transport)
  if (typeof itinerary.maxBudgetPerPerson === 'number') segments.push(`~$${itinerary.maxBudgetPerPerson}/person`)
  return segments.join(' · ')
}

function buildLine(pin, index) {
  const times = [fmtTime(pin.startTime), fmtTime(pin.endTime)].filter(Boolean).join('–')
  const category = Array.isArray(pin.tags) && pin.tags.length > 0 ? `  (${pin.tags[0]})` : ''
  let line = `${index + 1}. ${times ? times + '  ' : ''}${pin.name}${category}`
  if (typeof pin.travelTimeToNextMinutes === 'number') line += `\n   ↳ ${pin.travelTimeToNextMinutes} min to next stop`
  return line
}

export function buildItinerarySummaryText(itinerary) {
  const pins = Array.isArray(itinerary?.pins) ? itinerary.pins : []
  const header = [`NavQuest — ${itinerary?.title ?? 'Itinerary'}`, buildSubtitle(itinerary ?? {})]
    .filter(Boolean)
    .join('\n')
  const body = pins.map(buildLine).join('\n')
  return body ? `${header}\n\n${body}` : header
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && node --test src/utils/itinerarySummary.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

Prepare and hand off to the user (do NOT auto-commit):
```bash
git add frontend/src/utils/itinerarySummary.js frontend/src/utils/itinerarySummary.test.js
# git commit -m "feat(export): pure itinerary text-summary generator (frontend)"
```

---

## Task 7: Export UI (ExportButton + copy/email handlers)

**Files:**
- Modify: `frontend/src/api/itinerary.js`
- Create: `frontend/src/pages/ItineraryPage/ExportButton/ExportButton.jsx`
- Create: `frontend/src/pages/ItineraryPage/ExportButton/ExportButton.css`
- Modify: `frontend/src/pages/ItineraryPage/ActionBar/ActionBar.jsx`
- Modify: `frontend/src/pages/ItineraryPage/ItineraryPanel/ItineraryPanel.jsx`
- Modify: `frontend/src/pages/ItineraryPage/ItineraryPage.jsx`

**Interfaces:**
- Consumes: `buildItinerarySummaryText` from `../../../utils/itinerarySummary.js`; `emailItinerary(id)` from the api.
- Produces: `emailItinerary(id) -> Promise<{ sent, skipped }>`; `<ExportButton isOwner onCopy onEmail />` rendering a small dropdown with "Copy as text" (all) and "Email to group" (owner only).

- [ ] **Step 1: Add the API call**

In `frontend/src/api/itinerary.js`, add after `copyItinerary`:

```js
// POST /itineraries/:id/export/email — owner-only. Emails a PDF of the itinerary to
// its group members (BCC). Returns { sent: [{name,email}], skipped: [{name}] }.
export async function emailItinerary(id) {
  const { data } = await api.post(`/itineraries/${id}/export/email`)
  return data
}
```

- [ ] **Step 2: Create the ExportButton component**

```jsx
// frontend/src/pages/ItineraryPage/ExportButton/ExportButton.jsx
import './ExportButton.css'
import { useState } from 'react'

// A small "Export" control that opens a menu with two actions: copy the itinerary
// as text (any viewer) and email it to the group (owner only). onCopy/onEmail are
// async handlers owned by ItineraryPage; this component only manages menu open
// state and a short-lived status message.
function ExportButton({ isOwner, onCopy, onEmail }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const runCopy = async () => {
    await onCopy()
    setStatus('Copied!')
    setTimeout(() => setStatus(''), 2000)
  }

  const runEmail = async () => {
    if (busy) return
    setBusy(true)
    setStatus('Sending…')
    try {
      const msg = await onEmail()
      setStatus(msg)
    } catch {
      setStatus('Could not send. Please try again.')
    } finally {
      setBusy(false)
      setTimeout(() => setStatus(''), 4000)
    }
  }

  return (
    <div className="export-button">
      <button className="action-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        Export
      </button>
      {open && (
        <div className="export-button__menu" role="menu">
          <button type="button" role="menuitem" onClick={runCopy}>Copy as text</button>
          {isOwner && (
            <button type="button" role="menuitem" onClick={runEmail} disabled={busy}>
              Email to group
            </button>
          )}
        </div>
      )}
      {status && <span className="export-button__status" role="status">{status}</span>}
    </div>
  )
}

export default ExportButton
```

```css
/* frontend/src/pages/ItineraryPage/ExportButton/ExportButton.css */
.export-button { position: relative; display: inline-flex; align-items: center; gap: 8px; }
.export-button__menu {
  position: absolute; top: calc(100% + 6px); left: 0; z-index: 10;
  display: flex; flex-direction: column; min-width: 160px;
  background: #fff; border: 1px solid #e2e2e2; border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12); overflow: hidden;
}
.export-button__menu button {
  padding: 10px 14px; text-align: left; background: none; border: none;
  cursor: pointer; font-size: 0.9rem;
}
.export-button__menu button:hover { background: #f5f5f5; }
.export-button__menu button:disabled { opacity: 0.5; cursor: default; }
.export-button__status { font-size: 0.85rem; color: #555; }
```

- [ ] **Step 3: Render ExportButton in ActionBar**

In `frontend/src/pages/ItineraryPage/ActionBar/ActionBar.jsx`, import it and add `onCopyText`,
`onEmail` to the props, then render `<ExportButton>` in BOTH branches (owner and viewer):

```jsx
import ExportButton from '../ExportButton/ExportButton.jsx'
```
Add to the destructured props: `onCopyText, onEmail,`. In the owner branch and the viewer
branch, add before the closing `</>`:
```jsx
          <ExportButton isOwner={isOwner} onCopy={onCopyText} onEmail={onEmail} />
```

- [ ] **Step 4: Thread props through ItineraryPanel**

In `frontend/src/pages/ItineraryPage/ItineraryPanel/ItineraryPanel.jsx`, add `onCopyText, onEmail`
to the destructured props and pass them to `<ActionBar ... onCopyText={onCopyText} onEmail={onEmail} />`.

- [ ] **Step 5: Add handlers in ItineraryPage and pass down**

In `frontend/src/pages/ItineraryPage/ItineraryPage.jsx`, import the util:
```js
import { buildItinerarySummaryText } from '../../utils/itinerarySummary.js'
import { emailItinerary } from '../../api/itinerary.js'
```
Add the two handlers (before the `return`):
```jsx
  // Any viewer: copy the itinerary as plain text. Uses the Clipboard API with a
  // hidden-textarea fallback for non-HTTPS / older browsers.
  const handleCopyText = async () => {
    const text = buildItinerarySummaryText(itinerary)
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
    } catch (err) {
      console.error('Copy failed:', err)
      window.alert('Could not copy. Here is the text:\n\n' + text)
    }
  }

  // Owner-only: email the itinerary PDF to the group. Returns a status string for
  // the ExportButton to show.
  const handleEmail = async () => {
    const res = await emailItinerary(id)
    const sent = res.sent?.length ?? 0
    const skipped = res.skipped?.length ?? 0
    return skipped > 0
      ? `Sent to ${sent} member${sent === 1 ? '' : 's'}, ${skipped} skipped — no email on file`
      : `Sent to ${sent} member${sent === 1 ? '' : 's'}`
  }
```
Add both to the `<ItineraryPanel>` props: `onCopyText={handleCopyText} onEmail={handleEmail}`.

- [ ] **Step 6: Lint + build**

Run: `cd frontend && npm run lint && npm run build`
Expected: no lint errors, build succeeds.

- [ ] **Step 7: Run the frontend util test**

Run: `cd frontend && node --test src/utils/itinerarySummary.test.js`
Expected: PASS.

- [ ] **Step 8: Commit**

Prepare and hand off to the user (do NOT auto-commit):
```bash
git add frontend/src/api/itinerary.js frontend/src/pages/ItineraryPage/ExportButton frontend/src/pages/ItineraryPage/ActionBar/ActionBar.jsx frontend/src/pages/ItineraryPage/ItineraryPanel/ItineraryPanel.jsx frontend/src/pages/ItineraryPage/ItineraryPage.jsx
# git commit -m "feat(export): itinerary export UI (copy + email to group)"
```

---

## Task 8: Collect member emails in the wizard

**Files:**
- Modify: `frontend/src/pages/CreateItineraryPage/memberModel.js`
- Modify: `frontend/src/pages/CreateItineraryPage/MemberCard/MemberCard.jsx`
- Modify: `frontend/src/pages/CreateItineraryPage/buildRequest.js`
- Modify: `frontend/src/pages/CreateItineraryPage/buildRequest.test.js`

**Interfaces:**
- Consumes: the wizard `form.members[].email` string.
- Produces: each member in `buildRecommendationBody`'s output carries `email` (trimmed, or omitted when blank). `LoadingPage` already forwards `recommendationBody.members` to `/ai-agent`, and Task 4's `memberRows` persists it — no change needed there.

- [ ] **Step 1: Add email to the blank-member factory**

In `frontend/src/pages/CreateItineraryPage/memberModel.js`:

```js
export const newMember = () => ({
  name: '',
  email: '', // optional; used by the itinerary email export
  location: null, // { label, latitude, longitude }
  interestTags: [],
  foodPrefs: [],
})
```

- [ ] **Step 2: Add the email input to MemberCard**

In `frontend/src/pages/CreateItineraryPage/MemberCard/MemberCard.jsx`, add an email
`TextInput` right after the name input (line ~38):

```jsx
      <TextInput
        placeholder="Name"
        value={member.name}
        onChange={(e) => set('name', e.target.value)}
      />

      <TextInput
        type="email"
        placeholder="Email (optional — for sharing the itinerary)"
        value={member.email ?? ''}
        onChange={(e) => set('email', e.target.value)}
      />
```

- [ ] **Step 3: Update the failing buildRequest test**

In `frontend/src/pages/CreateItineraryPage/buildRequest.test.js`, add an `email` to the
first member in `baseForm` and assert it survives mapping. Add near the existing assertions:

```js
// (add email to baseForm.members[0])
//   name: 'Ava', email: 'ava@example.com', location: {...}, ...

test('carries member email through, omitting blanks', () => {
  const body = buildRecommendationBody({
    ...baseForm,
    members: [
      { name: 'Ava', email: ' ava@example.com ', location: { latitude: 1, longitude: 2 }, interestTags: [], foodPrefs: [] },
      { name: 'Bo', email: '', location: { latitude: 3, longitude: 4 }, interestTags: [], foodPrefs: [] },
    ],
  })
  assert.equal(body.members[0].email, 'ava@example.com')
  assert.equal(body.members[1].email, undefined)
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd frontend && node --test src/pages/CreateItineraryPage/buildRequest.test.js`
Expected: FAIL — `body.members[0].email` is `undefined`.

- [ ] **Step 5: Carry email through buildRequest**

In `frontend/src/pages/CreateItineraryPage/buildRequest.js`, inside the `members.map`, add
an `email` field (trimmed, omitted when blank):

```js
  const members = form.members.map((m, i) => {
    const email = m.email?.trim()
    return {
      name: m.name?.trim() || `Member ${i + 1}`,
      ...(email ? { email } : {}),
      startLocation: {
        latitude: m.location.latitude,
        longitude: m.location.longitude,
      },
      interestTags: m.interestTags,
      foodPrefs: m.foodPrefs,
    }
  });
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd frontend && node --test src/pages/CreateItineraryPage/buildRequest.test.js`
Expected: PASS.

- [ ] **Step 7: Lint + build**

Run: `cd frontend && npm run lint && npm run build`
Expected: clean.

- [ ] **Step 8: Commit**

Prepare and hand off to the user (do NOT auto-commit):
```bash
git add frontend/src/pages/CreateItineraryPage/memberModel.js frontend/src/pages/CreateItineraryPage/MemberCard/MemberCard.jsx frontend/src/pages/CreateItineraryPage/buildRequest.js frontend/src/pages/CreateItineraryPage/buildRequest.test.js
# git commit -m "feat(export): collect optional member email in the wizard"
```

---

## Manual verification (after all tasks)

1. `cd backend && npm test` — all green (including the 3 export controller tests + updated persist test).
2. `cd frontend && npm test && npm run lint && npm run build` — all green.
3. Run the app: create an itinerary in the wizard, give at least one member a real email.
4. Open the itinerary → Export → "Copy as text" → paste into a note; confirm the summary reads correctly.
5. Export → "Email to group" (as owner) → confirm the status shows sent/skipped and the email with the PDF arrives.
6. As a non-owner viewing a public itinerary, confirm "Email to group" is not shown but "Copy as text" is.
```
