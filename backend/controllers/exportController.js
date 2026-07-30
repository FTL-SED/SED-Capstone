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
