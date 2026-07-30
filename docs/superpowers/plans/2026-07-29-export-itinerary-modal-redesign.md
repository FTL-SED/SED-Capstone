# Export Itinerary Modal Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace member-derived email export with an Export modal where any viewer types an ad-hoc recipient list and sends the itinerary via Gmail SMTP; remove all email collection from the itinerary form.

**Architecture:** Frontend gains an `ExportModal` component (chip/tag email input + bottom-center copy button) that replaces the `ExportButton` dropdown. The backend `POST /itineraries/:id/export/email` endpoint switches from deriving recipients off `member.email` to accepting `{ emails: [...] }` in the body, drops the owner gate (any viewer of a visible itinerary can send), and uses a generic greeting. The `member.email` column is removed from the schema (destructive migration, gated on user approval).

**Tech Stack:** React 19 + Vite (frontend), Express 5 + Prisma 6 on Supabase Postgres, nodemailer (Gmail SMTP), `node:test` (backend tests).

## Global Constraints

- Backend is ES modules (`import`/`export`, `.js` extensions required in import paths).
- Backend layering: route → controller → model → Prisma. Controllers are the only layer touching `req`/`res`; only `lib/` reads `process.env`.
- Frontend has NO Supabase client and NO frontend test harness — frontend changes are verified manually.
- Frontend `CLAUDE.md`: do not add files beyond what the spec requires. The spec requires exactly `frontend/src/pages/ItineraryPage/ExportModal/{ExportModal.jsx,ExportModal.css}` and the deletion of `ExportButton/`.
- Shared Supabase DB: NEVER run `prisma migrate reset` or `--force-reset`. The column-drop migration is generated and committed but only APPLIED after explicit user go-ahead; teammates must `git pull` the migration folder.
- All backend responses are JSON, including errors.
- The user makes all git commits themselves — do NOT run `git commit`. "Commit" steps below are checkpoints where the user commits; agents stop and hand off instead of committing.

---

## Task 1: Backend endpoint accepts `{ emails }`, drops owner gate, generic greeting

**Files:**
- Modify: `backend/controllers/exportController.js`
- Test: `backend/controllers/exportController.test.js`

**Interfaces:**
- Consumes: `itineraries.findByIdBasic(id) => Promise<{id,userId,isPublic,title,...}|null>` and `itineraries.findById(id, { forOwner }) => Promise<reshaped|null>` (both already exist in `models/itineraries.js`); `buildItineraryPdf(itinerary) => Promise<Buffer>`; `sendMail({subject,text,html,to,attachments}) => Promise`.
- Produces: `exportItineraryEmail(req, res, deps?)` where `req.body = { emails: string[] }`; responds `{ sent: [{email}], failed: [{email}] }` on 200, or `{ error }` on 400/404/502. `DEFAULT_DEPS = { findBasic, findForExport, buildPdf, sendMail }`.

- [ ] **Step 1: Rewrite the test file to the new contract**

Replace the entire contents of `backend/controllers/exportController.test.js` with:

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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && node --test controllers/exportController.test.js`
Expected: FAIL — the current controller reads `member.email`, gates on `loadOwned`, and returns `skipped`, so the new assertions (`400` on missing emails, `Hi there,` greeting, `findBasic` dep, deduping) do not hold.

- [ ] **Step 3: Rewrite the controller**

Replace the entire contents of `backend/controllers/exportController.js` with:

```js
// backend/controllers/exportController.js
// POST /itineraries/:id/export/email — any viewer of a VISIBLE itinerary (public,
// or one they own) can email a PDF of it to an ad-hoc list of addresses supplied in
// the request body ({ emails: [...] }). Recipients are no longer derived from group
// members, so each message uses a generic greeting. One personalized-To: message per
// address (no BCC blast — far less spam-prone).
import * as itineraries from '../models/itineraries.js'
import { parseIdParam, loadOrNotFound } from './helpers.js'
import { buildItineraryPdf } from '../services/export/itineraryPdf.js'
import { sendMail as realSendMail } from '../lib/mailer.js'

// Escapes user-controlled text before it goes into the HTML email body.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// A conservative well-formed-email check: non-empty local part, an @, a dotted
// domain, no spaces. Intentionally simple — the mail server is the real validator.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Normalize the request's emails: coerce to array, trim, lowercase, keep only
// well-formed addresses, dedupe (preserving first-seen order).
function normalizeEmails(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const out = []
  for (const entry of raw) {
    if (typeof entry !== 'string') continue
    const email = entry.trim().toLowerCase()
    if (!EMAIL_RE.test(email) || seen.has(email)) continue
    seen.add(email)
    out.push(email)
  }
  return out
}

// A small branded HTML body so the message is a proper multipart/alternative
// (text + HTML). The header bar matches the website navbar (cream #f6efe1
// background, moss #33402a text). A generic greeting — recipients are ad-hoc
// addresses with no associated name.
function buildEmailHtml(title, text) {
  const safeTitle = escapeHtml(title)
  const safeText = escapeHtml(text)
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#2b2b2b;line-height:1.5">
  <div style="background:#f6efe1;color:#33402a;padding:16px 20px;font-size:20px;font-weight:bold">NavQuest</div>
  <div style="padding:20px">
    <p style="margin:0 0 12px">Hi there,</p>
    <h2 style="color:#33402a;margin:0 0 8px">${safeTitle}</h2>
    <p style="margin:0 0 12px">${safeText}</p>
    <p style="color:#6e6656;font-size:13px;margin:0">The full itinerary is attached as a PDF.</p>
  </div>
</div>`
}

// Deps are injectable so the unit test can run without a DB or live SMTP.
const DEFAULT_DEPS = {
  findBasic: itineraries.findByIdBasic,
  findForExport: (id) => itineraries.findById(id, { forOwner: false }),
  buildPdf: buildItineraryPdf,
  sendMail: realSendMail,
}

async function exportItineraryEmail(req, res, deps = {}) {
  const { findBasic, findForExport, buildPdf, sendMail } = { ...DEFAULT_DEPS, ...deps }

  const id = parseIdParam(req, res, 'itinerary id')
  if (id === null) return

  // Validate the recipient list up front.
  const emails = normalizeEmails(req.body?.emails)
  if (emails.length === 0) {
    return res.status(400).json({ error: 'Provide at least one valid email address.' })
  }

  // Existence (404) + visibility. Any viewer of a VISIBLE itinerary may send:
  // public itineraries, or one the requester owns. A private itinerary owned by
  // someone else is treated as not found (don't reveal its existence).
  const row = await loadOrNotFound(res, findBasic, id, 'Itinerary')
  if (!row) return
  if (!row.isPublic && row.userId !== req.user.id) {
    return res.status(404).json({ error: 'Itinerary not found' })
  }

  // Load the export shape (pins for the PDF) with owner-only fields stripped.
  const itinerary = await findForExport(id)

  // Build the PDF once and reuse the same Buffer for every recipient.
  let pdf
  try {
    pdf = await buildPdf(itinerary)
  } catch (err) {
    console.error('exportItineraryEmail: PDF build failed:', err)
    return res.status(502).json({ error: 'Failed to build itinerary PDF' })
  }

  const filename = `${(itinerary.title || 'itinerary').replace(/[^\w.-]+/g, '_')}.pdf`
  const text = `Here's our plan for ${itinerary.title}. The full itinerary is attached as a PDF.`
  const html = buildEmailHtml(itinerary.title, text)

  const sent = []
  const failed = []
  for (const email of emails) {
    try {
      await sendMail({
        subject: `Your NavQuest itinerary: ${itinerary.title}`,
        text,
        html,
        to: email,
        attachments: [{ filename, content: pdf, contentType: 'application/pdf' }],
      })
      sent.push({ email })
    } catch (err) {
      console.error(`exportItineraryEmail: send to ${email} failed:`, err)
      failed.push({ email })
    }
  }

  if (sent.length === 0) {
    return res.status(502).json({ error: 'Failed to send itinerary email' })
  }

  return res.status(200).json({ sent, failed })
}

export { exportItineraryEmail }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && node --test controllers/exportController.test.js`
Expected: PASS (all tests green).

- [ ] **Step 5: Run the full backend suite to confirm no regressions**

Run: `cd backend && npm test`
Expected: PASS. If another test referenced `findByIdForExport` only via this controller, it stays green (the model function still exists; it's just no longer used here). Note the pre-existing count from the roadmap was 243 tests — expect a comparable green run.

- [ ] **Step 6: Checkpoint — hand off for commit**

Stop and let the user commit. Suggested message:
`refactor(export): email endpoint takes { emails }, drops owner gate, generic greeting`

---

## Task 2: Frontend API client — `emailItinerary(id, emails)`

**Files:**
- Modify: `frontend/src/api/itinerary.js:62-67`

**Interfaces:**
- Consumes: shared axios `api` client.
- Produces: `emailItinerary(id, emails) => Promise<{ sent, failed }>` sending body `{ emails }`.

- [ ] **Step 1: Update the API function and its comment**

In `frontend/src/api/itinerary.js`, replace lines 62-67:

```js
// POST /itineraries/:id/export/email — owner-only. Emails a PDF of the itinerary to
// its group members (BCC). Returns { sent: [{name,email}], skipped: [{name}] }.
export async function emailItinerary(id) {
  const { data } = await api.post(`/itineraries/${id}/export/email`)
  return data
}
```

with:

```js
// POST /itineraries/:id/export/email — emails a PDF of the itinerary to an ad-hoc
// list of addresses (any viewer of a visible itinerary). `emails` is a string[].
// Returns { sent: [{email}], failed: [{email}] }.
export async function emailItinerary(id, emails) {
  const { data } = await api.post(`/itineraries/${id}/export/email`, { emails })
  return data
}
```

- [ ] **Step 2: Verify the frontend still builds**

Run: `cd frontend && npm run build`
Expected: PASS (no usages break yet — `handleEmail` in ItineraryPage still compiles; it's rewired in Task 4).

- [ ] **Step 3: Checkpoint — hand off for commit**

Suggested message: `refactor(export): emailItinerary takes an ad-hoc emails list`

---

## Task 3: `ExportModal` component (chip input + bottom-center copy)

**Files:**
- Create: `frontend/src/pages/ItineraryPage/ExportModal/ExportModal.jsx`
- Create: `frontend/src/pages/ItineraryPage/ExportModal/ExportModal.css`

**Interfaces:**
- Consumes: nothing from other tasks (self-contained UI). Props described below.
- Produces: default-exported `ExportModal({ open, onClose, onSend, onCopy })`:
  - `open: boolean` — whether the overlay renders.
  - `onClose: () => void` — called on backdrop click, X, Escape, and after a successful send.
  - `onSend: (emails: string[]) => Promise<{ sent: [{email}], failed: [{email}] }>` — sends; the modal shows a status from the result.
  - `onCopy: () => Promise<void> | void` — copies the itinerary summary to the clipboard.

- [ ] **Step 1: Create `ExportModal.jsx`**

Create `frontend/src/pages/ItineraryPage/ExportModal/ExportModal.jsx` with:

```jsx
import './ExportModal.css'
import { useEffect, useRef, useState } from 'react'

// Conservative well-formed-email check, mirrors the backend's EMAIL_RE.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// The export overlay: a chip/tag input for typing recipient emails and a Send
// button, with a Copy-to-clipboard button pinned bottom-center. Closes on
// backdrop click, the X, Escape, and after a successful send. All async work is
// owned by the parent (onSend/onCopy); this component owns only local UI state.
function ExportModal({ open, onClose, onSend, onCopy }) {
  const [draft, setDraft] = useState('')
  const [emails, setEmails] = useState([])
  const [hint, setHint] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef(null)

  // Reset all local state whenever the modal opens, and focus the input.
  useEffect(() => {
    if (!open) return
    setDraft('')
    setEmails([])
    setHint('')
    setStatus('')
    setBusy(false)
    setCopied(false)
    inputRef.current?.focus()
  }, [open])

  // Close on Escape while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  // Validate the current draft and, if good and not a duplicate, add it as a chip.
  const commitDraft = () => {
    const email = draft.trim().toLowerCase()
    if (!email) return
    if (!EMAIL_RE.test(email)) {
      setHint(`"${email}" is not a valid email address.`)
      return
    }
    if (emails.includes(email)) {
      setDraft('')
      setHint('')
      return
    }
    setEmails((prev) => [...prev, email])
    setDraft('')
    setHint('')
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitDraft()
    } else if (e.key === 'Backspace' && draft === '' && emails.length > 0) {
      // Backspace on an empty input removes the last chip.
      setEmails((prev) => prev.slice(0, -1))
    }
  }

  const removeEmail = (email) => setEmails((prev) => prev.filter((e) => e !== email))

  const send = async () => {
    // Fold a typed-but-not-yet-committed address into the list before sending.
    const pending = draft.trim().toLowerCase()
    let toSend = emails
    if (pending) {
      if (!EMAIL_RE.test(pending)) {
        setHint(`"${pending}" is not a valid email address.`)
        return
      }
      if (!emails.includes(pending)) toSend = [...emails, pending]
    }
    if (toSend.length === 0) {
      setHint('Add at least one email address.')
      return
    }
    setBusy(true)
    setStatus('Sending…')
    try {
      const res = await onSend(toSend)
      const sent = res?.sent?.length ?? 0
      const failed = res?.failed?.length ?? 0
      setStatus(failed > 0 ? `Sent to ${sent}, ${failed} failed` : `Sent to ${sent}`)
      if (failed === 0) setTimeout(onClose, 1200)
    } catch {
      setStatus('Could not send. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    await onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="export-modal__backdrop" onClick={onClose}>
      <div
        className="export-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Export itinerary"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="export-modal__close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 className="export-modal__title">Email this itinerary</h2>
        <p className="export-modal__subtitle">
          Add the email addresses you'd like to send it to.
        </p>

        <div className="export-modal__chips">
          {emails.map((email) => (
            <span key={email} className="export-modal__chip">
              {email}
              <button
                type="button"
                className="export-modal__chip-remove"
                onClick={() => removeEmail(email)}
                aria-label={`Remove ${email}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="email"
            className="export-modal__input"
            placeholder={emails.length ? 'Add another…' : 'name@example.com'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={commitDraft}
          />
        </div>
        {hint && <span className="export-modal__hint" role="status">{hint}</span>}

        <button
          type="button"
          className="export-modal__send"
          onClick={send}
          disabled={busy || (emails.length === 0 && draft.trim() === '')}
        >
          {busy ? 'Sending…' : 'Send'}
        </button>
        {status && <span className="export-modal__status" role="status">{status}</span>}

        <div className="export-modal__footer">
          <button type="button" className="export-modal__copy" onClick={copy}>
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportModal
```

- [ ] **Step 2: Create `ExportModal.css`**

Create `frontend/src/pages/ItineraryPage/ExportModal/ExportModal.css` with:

```css
/* frontend/src/pages/ItineraryPage/ExportModal/ExportModal.css */
.export-modal__backdrop {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.45); padding: 16px;
}
.export-modal {
  position: relative;
  width: 100%; max-width: 420px;
  background: var(--surface, #fff);
  border: 1px solid var(--border, #e2e2e2);
  border-radius: var(--radius, 12px);
  box-shadow: var(--shadow-lg, 0 12px 40px rgba(0, 0, 0, 0.18));
  padding: 24px 20px 16px;
}
.export-modal__close {
  position: absolute; top: 8px; right: 10px;
  background: none; border: none; cursor: pointer;
  font-size: 1.4rem; line-height: 1; color: #6e6656;
}
.export-modal__title { margin: 0 0 4px; font-size: 1.2rem; color: var(--text, #2b2b2b); }
.export-modal__subtitle { margin: 0 0 14px; font-size: 0.9rem; color: #6e6656; }
.export-modal__chips {
  display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
  border: 1px solid var(--border, #e2e2e2); border-radius: 8px;
  padding: 8px; min-height: 44px;
}
.export-modal__chip {
  display: inline-flex; align-items: center; gap: 6px;
  background: #f6efe1; color: #33402a;
  border-radius: 999px; padding: 4px 8px 4px 10px; font-size: 0.85rem;
}
.export-modal__chip-remove {
  background: none; border: none; cursor: pointer;
  font-size: 1rem; line-height: 1; color: #33402a; padding: 0;
}
.export-modal__input {
  flex: 1; min-width: 140px; border: none; outline: none;
  font-size: 0.9rem; padding: 4px; background: transparent;
}
.export-modal__hint { display: block; margin-top: 6px; font-size: 0.82rem; color: #b3261e; }
.export-modal__send {
  margin-top: 14px; width: 100%;
  padding: 10px 14px; border: none; border-radius: 8px; cursor: pointer;
  background: #33402a; color: #f6efe1; font-size: 0.95rem;
}
.export-modal__send:disabled { opacity: 0.5; cursor: default; }
.export-modal__status { display: block; margin-top: 8px; font-size: 0.85rem; color: #555; text-align: center; }
.export-modal__footer {
  margin-top: 16px; padding-top: 12px;
  border-top: 1px solid var(--border, #e2e2e2);
  display: flex; justify-content: center;
}
.export-modal__copy {
  background: none; border: 1px solid var(--border, #e2e2e2);
  border-radius: 8px; padding: 8px 16px; cursor: pointer;
  font-size: 0.9rem; color: var(--text, #2b2b2b);
}
.export-modal__copy:hover { background: #f5f5f5; }
```

- [ ] **Step 3: Verify the frontend builds with the new component**

Run: `cd frontend && npm run build`
Expected: PASS (component compiles; not yet imported anywhere, so no behavior change).

- [ ] **Step 4: Checkpoint — hand off for commit**

Suggested message: `feat(export): add ExportModal (chip email input + copy button)`

---

## Task 4: Wire `ExportModal` into ItineraryPage / ItineraryPanel / ActionBar; remove `ExportButton`

**Files:**
- Modify: `frontend/src/pages/ItineraryPage/ItineraryPage.jsx` (handler + render)
- Modify: `frontend/src/pages/ItineraryPage/ItineraryPanel/ItineraryPanel.jsx` (thread props → open the modal)
- Modify: `frontend/src/pages/ItineraryPage/ActionBar/ActionBar.jsx` (single Export button)
- Delete: `frontend/src/pages/ItineraryPage/ExportButton/ExportButton.jsx`
- Delete: `frontend/src/pages/ItineraryPage/ExportButton/ExportButton.css`

**Interfaces:**
- Consumes: `ExportModal` (Task 3); `emailItinerary(id, emails)` (Task 2); existing `handleCopyText`.
- Produces: `ActionBar` gets `onExport: () => void` (opens the modal) instead of `onCopyText`/`onEmail`; ItineraryPage renders `<ExportModal>` and owns `exportOpen` state and `handleEmail(emails)`.

- [ ] **Step 1: Update `ActionBar.jsx` — replace ExportButton with a single Export button**

In `frontend/src/pages/ItineraryPage/ActionBar/ActionBar.jsx`:

Remove the import on line 8:
```js
import ExportButton from '../ExportButton/ExportButton.jsx'
```

Change the destructured props — replace `onCopyText,` and `onEmail,` (lines 28-29) with:
```js
  onExport,
```

Replace the owner-branch `ExportButton` usage (line 58):
```js
          <ExportButton isOwner={isOwner} onCopy={onCopyText} onEmail={onEmail} />
```
with:
```js
          <button type="button" className="action-btn" onClick={onExport}>
            Export
          </button>
```

Replace the non-owner-branch `ExportButton` usage (line 66):
```js
          <ExportButton isOwner={isOwner} onCopy={onCopyText} onEmail={onEmail} />
```
with:
```js
          <button type="button" className="action-btn" onClick={onExport}>
            Export
          </button>
```

- [ ] **Step 2: Update `ItineraryPanel.jsx` — thread `onExport` instead of `onCopyText`/`onEmail`**

In `frontend/src/pages/ItineraryPage/ItineraryPanel/ItineraryPanel.jsx`:

In the props destructure (line 17), replace:
```js
  onCopyText, onEmail,
```
with:
```js
  onExport,
```

In the `<ActionBar ... />` render (lines 211-212), replace:
```js
        onCopyText={onCopyText}
        onEmail={onEmail}
```
with:
```js
        onExport={onExport}
```

- [ ] **Step 3: Update `ItineraryPage.jsx` — modal state, handler, render**

In `frontend/src/pages/ItineraryPage/ItineraryPage.jsx`:

Add the import near the other component imports (after line 6, the `MapView` import):
```js
import ExportModal from './ExportModal/ExportModal.jsx'
```

Add modal open state. Find the existing `const [activeTab, setActiveTab] = useState('written');` (line 354) and add directly after it:
```js
  // Whether the Export modal (ad-hoc email + copy) is open.
  const [exportOpen, setExportOpen] = useState(false);
```

Replace `handleEmail` (lines 377-386):
```js
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
with:
```js
  // Email the itinerary PDF to an ad-hoc list of addresses typed in the export
  // modal. Returns the raw { sent, failed } result; the modal renders the status.
  const handleEmail = async (emails) => emailItinerary(id, emails)
```

In the `<ItineraryPanel ... />` render, replace the two props (lines 461-462):
```js
        onCopyText={handleCopyText}
        onEmail={handleEmail}
```
with:
```js
        onExport={() => setExportOpen(true)}
```

Add the modal render. Replace the closing of the page container (lines 469-471):
```js
      <MapView pins={itinerary.pins} />
    </div>
  );
```
with:
```js
      <MapView pins={itinerary.pins} />
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onSend={handleEmail}
        onCopy={handleCopyText}
      />
    </div>
  );
```

- [ ] **Step 4: Delete the old `ExportButton` files**

Run:
```bash
cd frontend && rm src/pages/ItineraryPage/ExportButton/ExportButton.jsx src/pages/ItineraryPage/ExportButton/ExportButton.css && rmdir src/pages/ItineraryPage/ExportButton 2>/dev/null; true
```
Expected: files removed; `rmdir` removes the now-empty folder (the trailing `true` keeps the step non-fatal if the dir isn't empty for any reason).

- [ ] **Step 5: Verify build + lint (no stale ExportButton references)**

Run: `cd frontend && npm run lint && npm run build`
Expected: PASS. A failure here most likely means a leftover `ExportButton` import or an `onCopyText`/`onEmail` reference — grep and remove it:
`grep -rn "ExportButton\|onCopyText\|onEmail" frontend/src` should return no results.

- [ ] **Step 6: Manual verification**

Start the app (`cd frontend && npm run dev`, backend running per repo instructions) and on an itinerary page:
- Click **Export** → modal opens, input focused.
- Type an email + Enter → chip appears; type one + comma → chip appears; type an invalid one + Enter → inline hint, no chip.
- Backspace on empty input removes the last chip; the × on a chip removes it.
- **Send** with no chips is disabled; with chips it shows "Sending…" then "Sent to N"; modal closes on full success.
- **Copy to clipboard** (bottom-center) copies the summary; button flips to "Copied!".
- Close via the ×, the backdrop, and Escape.

- [ ] **Step 7: Checkpoint — hand off for commit**

Suggested message: `feat(export): open ExportModal from a single Export button; remove ExportButton`

---

## Task 5: Remove the email input from the Create-Itinerary wizard

**Files:**
- Modify: `frontend/src/pages/CreateItineraryPage/MemberCard/MemberCard.jsx:40-45`
- Modify: `frontend/src/pages/CreateItineraryPage/memberModel.js:7`
- Modify: `frontend/src/pages/CreateItineraryPage/buildRequest.js:34,37`

**Interfaces:**
- Consumes: nothing new.
- Produces: member objects and the recommendation request body no longer carry `email`.

- [ ] **Step 1: Remove the email `<TextInput>` from `MemberCard.jsx`**

In `frontend/src/pages/CreateItineraryPage/MemberCard/MemberCard.jsx`, delete the block at lines 40-45:
```jsx
      <TextInput
        type="email"
        placeholder="Email (optional — for sharing the itinerary)"
        value={member.email ?? ''}
        onChange={(e) => set('email', e.target.value)}
      />

```

- [ ] **Step 2: Remove `email` from the member factory in `memberModel.js`**

In `frontend/src/pages/CreateItineraryPage/memberModel.js`, delete line 7:
```js
  email: '', // optional; used by the itinerary email export
```

- [ ] **Step 3: Remove the `email` handling from `buildRequest.js`**

In `frontend/src/pages/CreateItineraryPage/buildRequest.js`, delete line 34:
```js
    const email = m.email?.trim();
```
and delete the spread on line 37:
```js
      ...(email ? { email } : {}),
```

- [ ] **Step 4: Verify build + lint + no stale references**

Run: `cd frontend && npm run lint && npm run build`
Expected: PASS.
Run: `grep -rn "\.email" frontend/src/pages/CreateItineraryPage`
Expected: no results (the only member email usage lived in these three files).

- [ ] **Step 5: Manual verification**

In the Create wizard's Members step: each member card shows Name, Starting location, Interests, Food preferences — and NO email field. Completing the wizard still creates an itinerary successfully.

- [ ] **Step 6: Checkpoint — hand off for commit**

Suggested message: `feat(create): remove per-member email field from the itinerary form`

---

## Task 6: Remove `member.email` from the backend (persist, model, schema, migration)

**Files:**
- Modify: `backend/services/itinerary/persist.js:144-148`
- Modify: `backend/models/itineraries.js` (comment on `findByIdForExport`; no code change to `OWNER_ONLY_FIELDS` — see below)
- Modify: `backend/prisma/schema.prisma` (drop `email` from `ItineraryMember`)
- Create: `backend/prisma/migrations/<generated>/migration.sql` (via prisma migrate)

**Interfaces:**
- Consumes: nothing.
- Produces: the `ItineraryMember` row and schema no longer have an `email` column.

- [ ] **Step 1: Remove `email` from `memberRows` in `persist.js`**

In `backend/services/itinerary/persist.js`, in the object returned by `memberRows` (lines ~137-148), delete the `email` property and its comment (lines 145-147):
```js
      // Optional per-member email, collected in the wizard; used by the email
      // export. Trim + normalize to null so blank strings never become recipients.
      email: typeof m.email === 'string' && m.email.trim() ? m.email.trim() : null,
```
Ensure the property before it (`diets: ...`) still ends correctly and the object closes with `}` — the resulting return object ends at `diets`.

- [ ] **Step 2: Update the stale comment on `findByIdForExport` in `models/itineraries.js`**

In `backend/models/itineraries.js`, replace the `findByIdForExport` doc comment (lines 131-134):
```js
// Full record for the email export: the owner shape (stops+pins for the PDF) plus
// members WITH their emails (the recipient list). Returns the reshaped itinerary
// (pins[] flattened) with `members` included (email is a scalar, so `members: true`
// carries it). Caller must have already confirmed ownership.
```
with:
```js
// Full owner-shape record (stops+pins + members) retained for any owner-only export
// path. The email endpoint no longer derives recipients from members — it uses
// findById({ forOwner: false }) — so this is not on the email-export hot path.
```
No code change to `OWNER_ONLY_FIELDS` (it lists `members`, `meetingPointLat`, `meetingPointLng` — all still valid; `members` no longer carries an email but is still owner-private).

- [ ] **Step 3: Run the backend suite (should still pass without the column)**

Run: `cd backend && npm test`
Expected: PASS. `persist.js` no longer writes `email`; nothing reads `member.email` anymore (Task 1 removed the last reader).

- [ ] **Step 4: Drop `email` from the Prisma schema**

In `backend/prisma/schema.prisma`, in `model ItineraryMember`, delete the line:
```prisma
  email         String?   // optional; collected in the wizard, used for email export
```

- [ ] **Step 5: Generate the migration WITHOUT applying it**

> ⚠️ SHARED-DB GATE: do not apply anything yet. `git pull` first per project CLAUDE.md.

Run: `cd backend && git pull` (sync any teammate migrations first), then create the migration file WITHOUT executing it against the DB:
Run: `cd backend && npx prisma migrate dev --create-only --name drop_member_email`
Expected: a new folder `backend/prisma/migrations/<timestamp>_drop_member_email/migration.sql` containing `ALTER TABLE "ItineraryMember" DROP COLUMN "email";`. `--create-only` writes the file but does NOT apply it.

- [ ] **Step 6: Inspect the generated SQL**

Read `backend/prisma/migrations/<timestamp>_drop_member_email/migration.sql` and confirm it is exactly the single `DROP COLUMN "email"` on `ItineraryMember` — no unexpected drops of other columns/tables. If it contains anything else (drift from a teammate's unpulled migration), STOP and reconcile with the team per project CLAUDE.md — do not apply.

- [ ] **Step 7: PAUSE — get explicit user go-ahead before applying**

Ask the user to approve applying the migration to the shared Supabase DB. Only after explicit approval:
Run: `cd backend && npx prisma migrate deploy`
Expected: the migration applies; `npx prisma generate` runs (Prisma may auto-run it). Do NOT use `migrate reset`/`--force-reset` under any circumstance.

- [ ] **Step 8: Verify after migration**

Run: `cd backend && npm test`
Expected: PASS. Boot the backend and confirm it starts clean.

- [ ] **Step 9: Checkpoint — hand off for commit**

Commit the schema change AND the generated migration folder together. Suggested message:
`feat(db): drop ItineraryMember.email (email export now takes ad-hoc recipients)`
Remind the user: teammates must `git pull` this migration folder; the column is already gone from the shared DB.

---

## Self-Review

**Spec coverage:**
- Remove email from form (frontend + DB): Tasks 5 (frontend) + 6 (backend/schema/migration). ✓
- Single Export button opens modal: Task 4. ✓
- Chip/tag email input: Task 3. ✓
- Copy-to-clipboard bottom-center: Task 3 (`.export-modal__footer` centered). ✓
- Backend `{ emails }` contract, 400 on invalid/empty, dedupe, generic greeting, `{ sent, failed }`: Task 1. ✓
- Drop owner gate; any viewer of a visible itinerary; 404 when not visible: Task 1. ✓
- Delete ExportButton: Task 4. ✓
- Migration gated on user approval, no reset: Task 6. ✓
- Tests updated: Task 1. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full content. ✓

**Type consistency:** `emailItinerary(id, emails)` (Task 2) matches `handleEmail(emails)` (Task 4) and `onSend(toSend)` → `{ sent, failed }` (Task 3). ActionBar prop renamed `onExport` consistently in Tasks 4 steps 1-3. Controller deps `{ findBasic, findForExport, buildPdf, sendMail }` match between the controller (Task 1 step 3) and its tests (Task 1 step 1). ✓
