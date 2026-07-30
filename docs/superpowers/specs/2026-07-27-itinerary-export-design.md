# Itinerary Export — Design

**Date:** 2026-07-27
**Branch:** `semir-email-invite`
**Status:** Approved, pending implementation plan

## Summary

Add an **Export** feature to the itinerary page with two channels that share one
text-summary generator:

1. **Copy as text** — format the itinerary into a plain-text summary and copy it to
   the clipboard (works anywhere, any viewer).
2. **PDF + email to group** — generate a PDF of the itinerary and email it to the
   itinerary's group members via the existing Gmail SMTP credentials (owner only).

## Non-goals (v1)

- No Twilio / carrier SMS send (rejected: paid, needs keys, violates the free/no-key
  preference). "SMS-style" sharing is served by copy-as-text.
- No share links, public tokens, or view-link destinations — the summary travels in the
  message/PDF body itself.
- No images in the PDF (skip `locationImageUrl`) — keeps generation fast and offline.
- No per-recipient personalization — one BCC email to the whole group.

## Architecture

```
                    ┌─────────────────────────────┐
                    │  buildItinerarySummary()    │  pure: itinerary+stops → text data
                    │  (one copy per side)        │
                    └───────────┬─────────────────┘
                                │
              ┌─────────────────┴──────────────────┐
              ▼                                     ▼
   ┌──────────────────────┐            ┌────────────────────────────┐
   │ Copy as text         │            │ PDF + email to group        │
   │ (frontend clipboard) │            │ (backend, owner only)       │
   │ - any viewer         │            │ pdfkit → Buffer             │
   │ - navigator.clipboard│            │ nodemailer (Gmail SMTP)     │
   └──────────────────────┘            │ → member emails (BCC)       │
                                        └────────────────────────────┘
```

**Two source-of-truth copies of the pure formatter** (frontend for clipboard, backend
for PDF). Each side already has the itinerary data it needs; a small duplicated pure
function avoids a network round-trip just to copy an itinerary already loaded in the
browser. The functions are small and each is independently unit-tested.

**Permissions:** copy-as-text is available to anyone who can view the itinerary;
emailing the group is **owner-only**, because member data (including emails) is private
owner-only data per the existing privacy model.

## Components

| Piece | Location | Purpose |
|---|---|---|
| `buildItinerarySummary` | `frontend/src/utils/itinerarySummary.js` + `backend/utils/itinerarySummary.js` | Pure text-data generator |
| `ItineraryMember.email` | `backend/prisma/schema.prisma` + migration | Store member emails from wizard |
| `buildItineraryPdf` | `backend/services/export/itineraryPdf.js` | pdfkit → PDF Buffer |
| `mailer` | `backend/lib/mailer.js` | nodemailer Gmail SMTP client |
| `POST /itineraries/:id/export/email` | `backend/routes/itineraryRoutes.js` + `backend/controllers/exportController.js` | Owner-only: PDF + BCC email to members |
| `emailItinerary` | `frontend/src/api/itinerary.js` | API client call |
| `ExportButton` + dialog | `frontend/src/pages/ItineraryPage/` | Copy-as-text + Email-to-group UI |

### 1. Shared summary generator — `buildItinerarySummary`

Pure, dependency-free. Takes an itinerary + ordered stops, returns structured data
(not a formatted string):

```js
// buildItinerarySummary(itinerary) -> { title, subtitle, lines: [...] }
// itinerary: { title, location, tripDate, dayStart, dayEnd,
//              maxBudgetPerPerson, transport, stops: [ItineraryStop w/ pin] }
```

Example rendered output:

```
NavQuest — Weekend in SF
Sat Aug 2, 2026 · San Francisco · 9:00–21:00 · transit · ~$80/person

1. 9:00–10:30  Blue Bottle Coffee  (café)
   ↳ 12 min to next stop
2. 11:00–13:00  Golden Gate Park  (park)
...
```

- Returns *data*; consumers own formatting. Clipboard side joins `lines` with `\n`;
  PDF side draws each line.
- Missing fields degrade gracefully: no budget → omit that subtitle segment; no travel
  time → omit the `↳` sub-line. Matches the engine's "unknown data, don't punish"
  convention.

### 2. Schema change — `ItineraryMember.email`

```prisma
model ItineraryMember {
  // ...existing fields...
  email String?   // optional, collected in the generation wizard
}
```

- **Nullable** — existing members and members added without an email still work; the
  email channel skips anyone without one.
- New migration `add_itinerary_member_email`.
- **Shared-DB rules apply:** `git pull` first; commit the generated
  `prisma/migrations/<name>/` folder alongside the schema change; NEVER
  `migrate reset` / `db push --force-reset`. Flag before running any Prisma command
  against the shared DB — the user approves the actual migration.
- Wizard change: an optional email input per member, sent through the existing
  itinerary-create payload and stored on `ItineraryMember`.

### 3. PDF generation — `buildItineraryPdf`

Service (`services/` per layering: multi-step domain logic) using **pdfkit**.

```js
// buildItineraryPdf(itinerary) -> Promise<Buffer>
//  - calls buildItinerarySummary(itinerary) for the data
//  - draws title, subtitle, then each stop line with pdfkit
//  - returns an in-memory Buffer (no temp files)
```

- **Buffer, not a file** — streamed to nodemailer as an attachment; no filesystem
  writes, no cleanup, no temp-dir races.
- Reuses `buildItinerarySummary`; the service owns only *drawing* (fonts, spacing, page
  layout), not *what* to say.
- Simple layout: title, subtitle, numbered stops with times/category, optional
  travel-time sub-lines. No images in v1.

### 4. Mail client — `lib/mailer.js`

External-service client (`lib/` is the only place `process.env` is read):

```js
// createTransport() using nodemailer + Gmail SMTP
//   service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
// sendMail({ to, bcc, subject, text, attachments }) -> info
```

- Gmail app-password auth (no OAuth). Both env vars already present in `backend/.env`.
- Module singleton, like `lib/prisma.js` / `lib/supabase.js`.

### 5. Endpoint — `POST /itineraries/:id/export/email` (owner-only)

Flow through the layers:

```
routes/itineraryRoutes.js    → mounts requireAuth + handler
controllers/exportController  → loadOwned() 403 gate, validate, orchestrate, shape response
   ├─ models/itineraries       → fetch itinerary + stops + members (with emails)
   ├─ services/export/itineraryPdf → Buffer
   └─ lib/mailer               → send with PDF attached
```

- **Owner-only** via existing `loadOwned()` helper.
- **Recipients:** itinerary members with an email. Optional body `{ memberIds: [...] }`
  selects a subset; default = all members with an email.
- **One email, BCC all** — members don't see each other's addresses; fewer SMTP calls.
- **Body:** short note ("Here's our plan for `<title>`, details attached") + PDF
  attachment. Subject: `Your NavQuest itinerary: <title>`.
- **No emails on file → 422** with a friendly message, not silent success.
- **Response:** `{ sent: [...], skipped: [...] }` — members emailed vs skipped for
  missing email.
- **SMTP failure → 502** `{ error: 'Failed to send itinerary email' }`, logged
  server-side (matches the per-controller try/catch convention).

### 6. Frontend — Export UI

An **Export** button in `ActionBar` opens a small dialog with two actions:

- **Copy as text** (any viewer): formats loaded itinerary via
  `frontend/src/utils/itinerarySummary.js` → `navigator.clipboard.writeText(...)`,
  shows a "Copied!" confirmation. No network call. Fallback for non-HTTPS / older
  browsers: hidden-textarea select-and-copy, or show text to copy manually.
- **Email to group** (owner only): `emailItinerary(id)` → `POST /:id/export/email`;
  shows sending / success / partial state from `{ sent, skipped }`
  (e.g. "Sent to 3 members, 1 skipped — no email on file").

- **Copy** shows for everyone; **Email to group** only when `isOwner` (mirrors the
  existing ActionBar owner/viewer split).
- Follows the existing small-button pattern (`SaveCopyButton`, `PrivacyButton`) — one
  new `ExportButton` + lightweight dialog, no new modal framework.

## Testing

- `buildItinerarySummary` (both copies): unit tests — full data, missing budget, missing
  travel times, empty stops.
- `buildItineraryPdf`: returns a non-empty Buffer with a PDF header; smoke test only
  (don't assert pixel layout).
- `exportController`: owner-only 403 for non-owner; 422 when no member emails; happy
  path shapes `{ sent, skipped }`; SMTP error → 502. Inject the mailer as a seam so
  tests don't send real email.
- Frontend: copy handler writes expected text; email handler renders sent/skipped state.

## New dependencies

- `pdfkit` (backend) — lightweight, pure-Node PDF authoring.
- `nodemailer` (backend) — Gmail SMTP transport.
