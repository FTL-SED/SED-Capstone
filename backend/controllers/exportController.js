// backend/controllers/exportController.js
// POST /itineraries/:id/export/email — owner-only. Builds a PDF of the itinerary
// and emails it individually to each group member that has an email address (one
// personalized message per recipient with a real To: header — far less spam-prone
// than a single BCC blast, and lets each person get a greeting by name). Member
// emails are private owner-only data, so this mirrors the owner-gating used elsewhere.
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
// — the latter scores worse with spam filters. The header bar matches the website
// navbar (cream #f6efe1 background, moss #33402a text); rest is the golden-hour palette.
function buildEmailHtml(title, text, greetingName) {
  const safeTitle = escapeHtml(title)
  const safeText = escapeHtml(text)
  const greeting = greetingName
    ? `<p style="margin:0 0 12px">Hi ${escapeHtml(greetingName)},</p>`
    : ''
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#2b2b2b;line-height:1.5">
  <div style="background:#f6efe1;color:#33402a;padding:16px 20px;font-size:20px;font-weight:bold">NavQuest</div>
  <div style="padding:20px">
    ${greeting}
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

  // Build the PDF once and reuse the same Buffer for every recipient — the
  // content is identical, only the To:/greeting differ per person.
  let pdf
  try {
    pdf = await buildPdf(itinerary)
  } catch (err) {
    console.error('exportItineraryEmail: PDF build failed:', err)
    return res.status(502).json({ error: 'Failed to build itinerary PDF' })
  }

  const filename = `${(itinerary.title || 'itinerary').replace(/[^\w.-]+/g, '_')}.pdf`
  const text = `Here's our plan for ${itinerary.title}. The full itinerary is attached as a PDF.`

  // Send one personalized message per recipient with a real To: header (no BCC
  // blast). A per-recipient To: is far less spam-prone than a single message to
  // an undisclosed-recipients list, and lets each person get a greeting by name.
  const sent = []
  const failed = []
  for (const member of recipients) {
    const email = member.email.trim()
    try {
      await sendMail({
        subject: `Your NavQuest itinerary: ${itinerary.title}`,
        text,
        html: buildEmailHtml(itinerary.title, text, member.name),
        to: email,
        // No replyTo: the message already comes From the NavQuest sending
        // account, so a separate Reply-To (a) exposed the organizer's personal
        // email to every recipient and (b) created a From≠Reply-To mismatch that
        // some spam filters penalize. Replies now go back to the sending account.
        attachments: [{ filename, content: pdf, contentType: 'application/pdf' }],
      })
      sent.push({ name: member.name, email })
    } catch (err) {
      console.error(`exportItineraryEmail: send to ${email} failed:`, err)
      failed.push({ name: member.name, email })
    }
  }

  // If every send failed, the whole operation failed — surface a 502. Otherwise
  // report the per-recipient breakdown (partial success is a 200).
  if (sent.length === 0) {
    return res.status(502).json({ error: 'Failed to send itinerary email' })
  }

  return res.status(200).json({ sent, failed, skipped })
}

export { exportItineraryEmail }
