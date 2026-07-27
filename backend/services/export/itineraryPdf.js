// Renders an itinerary to a branded PDF Buffer with pdfkit. Owns only DRAWING
// (layout, fonts, spacing, colour); WHAT to say comes from buildItinerarySummaryData
// so the PDF and the clipboard text stay in sync. Uses the NavQuest golden-hour
// palette, the vendored Fraunces/Inter fonts, and the compass wordmark (see
// pdfBrand.js). Returns an in-memory Buffer (no temp files) so the mailer can
// attach it directly.
import PDFDocument from 'pdfkit'
import SVGtoPDF from 'svg-to-pdfkit'
import { buildItinerarySummaryData } from '../../utils/itinerarySummary.js'
import { COLORS, FONTS, registerFonts, COMPASS_SVG } from './pdfBrand.js'

const PAGE = { size: 'A4', margin: 48 }
const BAND_HEIGHT = 72 // moss header band (compass + wordmark only)
const COMPASS_SIZE = 40 // wordmark compass, left of "NavQuest"

// Draws the header: a moss band carrying the compass + "NavQuest" wordmark, then
// the trip title (large Fraunces) and subtitle below the band, closed by a rule.
function drawHeader(doc, { title, subtitle }) {
  const { width } = doc.page
  doc.save()
  doc.rect(0, 0, width, BAND_HEIGHT).fill(COLORS.moss)

  const left = PAGE.margin
  // Compass, vertically centred in the band. svg-to-pdfkit scales the 100×100
  // viewBox into this box; assumePt keeps the requested size honest.
  const compassY = (BAND_HEIGHT - COMPASS_SIZE) / 2
  SVGtoPDF(doc, COMPASS_SVG, left, compassY, {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    assumePt: true,
  })

  // "NavQuest" wordmark to the right of the compass, baseline-aligned in the band.
  doc
    .font(FONTS.heading.name)
    .fontSize(24)
    .fillColor(COLORS.onBand)
    .text('NavQuest', left + COMPASS_SIZE + 14, BAND_HEIGHT / 2 - 16)
  doc.restore()

  // Trip title below the band, large, in moss.
  let y = BAND_HEIGHT + 22
  doc
    .font(FONTS.heading.name)
    .fontSize(20)
    .fillColor(COLORS.moss)
    .text(title, PAGE.margin, y, { width: width - PAGE.margin * 2 })
  y = doc.y + 4

  // Subtitle in stone.
  if (subtitle) {
    doc.font(FONTS.body.name).fontSize(10.5).fillColor(COLORS.stone).text(subtitle, PAGE.margin, y)
    y = doc.y + 10
  }
  // Accent rule.
  doc
    .moveTo(PAGE.margin, y)
    .lineTo(doc.page.width - PAGE.margin, y)
    .lineWidth(1.5)
    .strokeColor(COLORS.sunset)
    .stroke()
  return y + 18
}

// Draws one stop row starting at `y`; returns the y after the row (incl. spacing).
function drawStop(doc, stop, y) {
  const left = PAGE.margin
  const numW = 26
  const contentLeft = left + numW + 6
  const contentWidth = doc.page.width - PAGE.margin - contentLeft

  // Numbered marker in sunset.
  doc
    .font(FONTS.bodyBold.name)
    .fontSize(12)
    .fillColor(COLORS.sunset)
    .text(`${stop.index}.`, left, y, { width: numW, align: 'right' })

  // Time chip (if present), then the name in moss.
  let lineY = y
  if (stop.time) {
    doc.font(FONTS.bodySemi.name).fontSize(10).fillColor(COLORS.stone).text(stop.time, contentLeft, y + 1.5)
    lineY = y
  }
  const nameLeft = stop.time ? contentLeft + 78 : contentLeft
  doc
    .font(FONTS.bodySemi.name)
    .fontSize(12.5)
    .fillColor(COLORS.moss)
    .text(stop.name, nameLeft, lineY, { width: doc.page.width - PAGE.margin - nameLeft })

  let cursor = doc.y + 2

  // Muted category.
  if (stop.category) {
    doc.font(FONTS.body.name).fontSize(9.5).fillColor(COLORS.stone).text(stop.category, contentLeft, cursor, { width: contentWidth })
    cursor = doc.y + 1
  }
  // Small travel sub-line.
  if (stop.travelToNext !== null) {
    doc
      .font(FONTS.body.name)
      .fontSize(9)
      .fillColor(COLORS.roadLine)
      // '›' (not '↳') — the vendored Inter Latin subset has no arrow-hook glyph.
      .text(`› ${stop.travelToNext} min to next stop`, contentLeft, cursor, { width: contentWidth })
    cursor = doc.y
  }
  return cursor + 12
}

// Footer on every page: NavQuest mark + page number, in muted stone.
function drawFooter(doc) {
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i)
    const y = doc.page.height - 34
    doc
      .font(FONTS.body.name)
      .fontSize(8.5)
      .fillColor(COLORS.stone)
      .text(
        `NavQuest · page ${i - range.start + 1} of ${range.count}`,
        PAGE.margin,
        y,
        { width: doc.page.width - PAGE.margin * 2, align: 'center' },
      )
  }
}

export function buildItineraryPdf(itinerary) {
  const data = buildItinerarySummaryData(itinerary)

  return new Promise((resolve, reject) => {
    // bufferPages lets us stamp "page X of Y" once the total is known.
    const doc = new PDFDocument({ ...PAGE, bufferPages: true })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    registerFonts(doc)

    let y = drawHeader(doc, data)

    if (data.stops.length === 0) {
      doc.font(FONTS.body.name).fontSize(11).fillColor(COLORS.stone).text('No stops in this itinerary yet.', PAGE.margin, y)
    }

    for (const stop of data.stops) {
      // New page if the next row would overflow the printable area.
      if (y > doc.page.height - 90) {
        doc.addPage()
        y = PAGE.margin
      }
      y = drawStop(doc, stop, y)
      // Divider between stops.
      doc
        .moveTo(PAGE.margin, y - 6)
        .lineTo(doc.page.width - PAGE.margin, y - 6)
        .lineWidth(0.5)
        .strokeColor(COLORS.creamDeep)
        .stroke()
    }

    drawFooter(doc)
    doc.end()
  })
}
