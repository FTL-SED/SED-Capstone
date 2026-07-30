// Renders an itinerary to a branded PDF Buffer with pdfkit. Owns only DRAWING
// (layout, fonts, spacing, colour); WHAT to say comes from buildItinerarySummaryData
// so the PDF and the clipboard text stay in sync. Uses the NavQuest golden-hour
// palette, the vendored Fraunces/Inter fonts, and the compass wordmark (see
// pdfBrand.js). Returns an in-memory Buffer (no temp files) so the mailer can
// attach it directly.
import PDFDocument from 'pdfkit'
import SVGtoPDF from 'svg-to-pdfkit'
import { buildItinerarySummaryData } from '../../utils/itinerarySummary.js'
import { fetchStaticMap } from '../../lib/staticMap.js'
import { COLORS, FONTS, registerFonts, COMPASS_SVG } from './pdfBrand.js'

const PAGE = { size: 'A4', margin: 40 }
const BAND_HEIGHT = 54 // header band (compass + wordmark only)
const COMPASS_SIZE = 32 // wordmark compass, left of "NavQuest"

// Draws the header: a cream band matching the website navbar (solid #f6efe1 fill,
// moss wordmark, subtle warm bottom border) carrying the compass + "NavQuest"
// wordmark, then the trip title (large Fraunces) and subtitle below the band,
// closed by a rule.
function drawHeader(doc, { title, subtitle }) {
  const { width } = doc.page
  doc.save()
  // Cream band + subtle warm bottom border, mirroring the navbar treatment.
  doc.rect(0, 0, width, BAND_HEIGHT).fill(COLORS.cream)
  doc
    .moveTo(0, BAND_HEIGHT)
    .lineTo(width, BAND_HEIGHT)
    .lineWidth(1)
    .strokeColor(COLORS.roadLine)
    .stroke()

  const left = PAGE.margin
  // Compass, vertically centred in the band. svg-to-pdfkit scales the 100×100
  // viewBox into this box; assumePt keeps the requested size honest.
  const compassY = (BAND_HEIGHT - COMPASS_SIZE) / 2
  SVGtoPDF(doc, COMPASS_SVG, left, compassY, {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    assumePt: true,
  })

  // "NavQuest" wordmark to the right of the compass, in moss to match the navbar.
  doc
    .font(FONTS.heading.name)
    .fontSize(21)
    .fillColor(COLORS.moss)
    .text('NavQuest', left + COMPASS_SIZE + 12, BAND_HEIGHT / 2 - 14)
  doc.restore()

  // Trip title below the band, large, in moss.
  let y = BAND_HEIGHT + 14
  doc
    .font(FONTS.heading.name)
    .fontSize(20)
    .fillColor(COLORS.moss)
    .text(title, PAGE.margin, y, { width: width - PAGE.margin * 2 })
  y = doc.y + 2

  // Subtitle in stone.
  if (subtitle) {
    doc.font(FONTS.body.name).fontSize(10.5).fillColor(COLORS.stone).text(subtitle, PAGE.margin, y)
    y = doc.y + 6
  }
  // Accent rule.
  doc
    .moveTo(PAGE.margin, y)
    .lineTo(doc.page.width - PAGE.margin, y)
    .lineWidth(1.5)
    .strokeColor(COLORS.sunset)
    .stroke()
  return y + 12
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

  // Time chip (if present), then the name in moss. The name starts after the
  // time's ACTUAL rendered width (+ a gap) rather than a fixed offset — am/pm
  // times ("9:00 AM–5:00 PM") are wider than 24-hour ones and would otherwise
  // be overwritten by the name.
  let lineY = y
  let nameLeft = contentLeft
  if (stop.time) {
    doc.font(FONTS.bodySemi.name).fontSize(10).fillColor(COLORS.stone).text(stop.time, contentLeft, y + 1.5)
    const timeWidth = doc.widthOfString(stop.time)
    nameLeft = contentLeft + timeWidth + 12
    lineY = y
  }
  doc
    .font(FONTS.bodySemi.name)
    .fontSize(12.5)
    .fillColor(COLORS.moss)
    .text(stop.name, nameLeft, lineY, { width: doc.page.width - PAGE.margin - nameLeft })

  let cursor = doc.y + 1

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
  return cursor + 8
}

// Footer on every page: NavQuest mark + page number, in muted stone. The footer
// sits in the bottom margin (below the printable area); pdfkit would treat text
// past the bottom margin as overflow and append a blank page, so we zero the
// page's bottom margin for the duration of the stamp and restore it after.
function drawFooter(doc) {
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i)
    const savedBottom = doc.page.margins.bottom
    doc.page.margins.bottom = 0
    const y = doc.page.height - 30
    doc
      .font(FONTS.body.name)
      .fontSize(8.5)
      .fillColor(COLORS.stone)
      .text(
        `NavQuest · page ${i - range.start + 1} of ${range.count}`,
        PAGE.margin,
        y,
        { width: doc.page.width - PAGE.margin * 2, align: 'center', lineBreak: false },
      )
    doc.page.margins.bottom = savedBottom
  }
}

// Aspect ratio (w:h) we request the static map at, mirroring lib/staticMap's cap.
const MAP_ASPECT = 1200 / 800

// Draws a left-aligned "Map" heading (same size as the trip title) closed by a
// sunset accent rule — matching the header — then the fetched map PNG below the stops,
// scaled to the content width. Starts a new page if the block wouldn't fit under
// the current cursor. No-op when `mapImage` is null (fetch failed / no coords /
// no key), so the PDF degrades to text-only. Returns the y after the map.
function drawMap(doc, mapImage, y) {
  if (!mapImage) return y

  const contentWidth = doc.page.width - PAGE.margin * 2
  const imgHeight = contentWidth / MAP_ASPECT
  const headingH = 40 // "Map" heading + accent rule + gaps
  const blockH = headingH + imgHeight

  // Move to a fresh page if the whole map block wouldn't fit above the footer.
  if (y + blockH > doc.page.height - 60) {
    doc.addPage()
    y = PAGE.margin
  }

  // Guard the image draw: a corrupt/unsupported PNG from the map service would
  // otherwise throw and fail the whole export. Fall back to text-only.
  try {
    // Left-aligned "Map" heading, same size/colour as the trip title.
    doc
      .font(FONTS.heading.name)
      .fontSize(20)
      .fillColor(COLORS.moss)
      .text('Map', PAGE.margin, y, { width: contentWidth })
    let cursor = doc.y + 6
    // Sunset accent rule, matching the header.
    doc
      .moveTo(PAGE.margin, cursor)
      .lineTo(doc.page.width - PAGE.margin, cursor)
      .lineWidth(1.5)
      .strokeColor(COLORS.sunset)
      .stroke()
    cursor += 12
    doc.image(mapImage, PAGE.margin, cursor, { width: contentWidth, height: imgHeight })
    return cursor + imgHeight
  } catch (err) {
    console.error('drawMap: failed to embed map image:', err)
    return y
  }
}

// buildPdf deps are injectable so tests run without hitting the map service.
const DEFAULT_DEPS = { getMap: fetchStaticMap }

export async function buildItineraryPdf(itinerary, deps = {}) {
  const { getMap } = { ...DEFAULT_DEPS, ...deps }
  const data = buildItinerarySummaryData(itinerary)

  // Fetch the static map up front (fail-soft: null if it can't be produced).
  const mapImage = await getMap(data.stops)

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

    // Visual map with numbered markers, below the stop list.
    y = drawMap(doc, mapImage, y + 8)

    drawFooter(doc)
    doc.end()
  })
}
