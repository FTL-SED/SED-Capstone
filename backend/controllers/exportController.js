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
