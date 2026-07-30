// NavQuest brand tokens for the itinerary PDF: the golden-hour palette, the
// vendored brand fonts, and the compass wordmark SVG. Kept here (next to the PDF
// service) because these are export-specific presentation constants, not a shared
// external-service client. Values mirror the frontend brand:
//   - palette: frontend LandingPage `.journey` golden-hour scheme + Logo.css compass
//   - fonts: Fraunces (headings) + Inter (body), the app's Google-Fonts pair,
//     vendored as static .ttf under ../../assets/fonts so pdfkit can embed them
//   - compass: ../../assets/navquest-compass.svg (Logo.jsx, styles inlined)
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ASSETS = join(import.meta.dirname, '..', '..', 'assets')
const FONT_DIR = join(ASSETS, 'fonts')

// Golden-hour palette (hex from the frontend landing page + compass logo).
export const COLORS = {
  moss: '#33402a', // header band, stop names (moss deep)
  mossMid: '#47583a', // secondary moss
  sunset: '#e1783c', // accent: stop numbers, rule
  stone: '#6e6656', // muted / secondary text
  roadLine: '#b89a66', // dividers (light warm)
  cream: '#f6efe1', // page-adjacent warm surface
  creamDeep: '#efe3cd', // subtle fills
  ink: '#2b2b2b', // body text
  onBand: '#f6efe1', // text on the moss band
}

// Font registration names + their vendored files. Register with these keys, then
// select via doc.font('Fraunces-SemiBold') etc.
export const FONTS = {
  heading: { name: 'Fraunces-SemiBold', file: join(FONT_DIR, 'Fraunces-SemiBold.ttf') },
  body: { name: 'Inter-Regular', file: join(FONT_DIR, 'Inter-Regular.ttf') },
  bodySemi: { name: 'Inter-SemiBold', file: join(FONT_DIR, 'Inter-SemiBold.ttf') },
  bodyBold: { name: 'Inter-Bold', file: join(FONT_DIR, 'Inter-Bold.ttf') },
}

// Register all brand fonts on a pdfkit document. Called once before drawing.
export function registerFonts(doc) {
  for (const { name, file } of Object.values(FONTS)) {
    doc.registerFont(name, file)
  }
}

// The compass wordmark SVG markup (read once at module load).
export const COMPASS_SVG = readFileSync(join(ASSETS, 'navquest-compass.svg'), 'utf8')
