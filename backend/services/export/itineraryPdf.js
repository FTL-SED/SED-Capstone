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
