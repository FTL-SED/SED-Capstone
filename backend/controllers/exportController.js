// backend/controllers/exportController.js
// POST /itineraries/:id/export/email — owner-only. Builds a PDF of the itinerary
// and BCC-emails it to the group members that have an email address. Member emails
// are private owner-only data, so this mirrors the owner-gating used elsewhere.
import * as itineraries from '../models/itineraries.js'
import { parseIdParam, loadOwned } from './helpers.js'
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

// A small branded HTML body so the message is a proper multipart/alternative
// (text + HTML) rather than a bare text line whose only content is an attachment
// — the latter scores worse with spam filters. Golden-hour palette, matching the PDF.
function buildEmailHtml(title, text) {
  const safeTitle = escapeHtml(title)
  const safeText = escapeHtml(text)
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#2b2b2b;line-height:1.5">
  <div style="background:#33402a;color:#f6efe1;padding:16px 20px;font-size:20px;font-weight:bold">NavQuest</div>
  <div style="padding:20px">
    <h2 style="color:#33402a;margin:0 0 8px">${safeTitle}</h2>
    <p style="margin:0 0 12px">${safeText}</p>
    <p style="color:#6e6656;font-size:13px;margin:0">The full itinerary is attached as a PDF.</p>
  </div>
</div>`
}

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
    const text = `Here's our plan for ${itinerary.title}. The full itinerary is attached as a PDF.`

    await sendMail({
      subject: `Your NavQuest itinerary: ${itinerary.title}`,
      text,
      html: buildEmailHtml(itinerary.title, text),
      // Real recipients in BCC (they can't see each other); `to` defaults to the
      // sending account in the mailer so the message still has a valid To: header.
      bcc: recipients.map((m) => m.email.trim()),
      // Replies go to the owner who sent it, not the no-reply Gmail account.
      replyTo: req.user?.email,
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
