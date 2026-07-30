# Export Itinerary Redesign — Ad-hoc Recipient Modal

**Date:** 2026-07-29
**Branch:** semir-export-itinerary
**Supersedes the recipient-collection parts of:** `2026-07-27-itinerary-export-design.md`

## Problem

Today, itinerary export emails are sent to a recipient list *derived from itinerary
members*. Each member's email is collected during itinerary creation (the Create wizard's
`MemberCard`), stored on the member row (`member.email`), and the export endpoint
(`POST /itineraries/:id/export/email`, owner-gated) reads those stored emails to send one
personalized message per member.

This couples "who is in the group" to "who receives the export", forces email collection
up front, and treats emails as owner-private data. We want to decouple them: collect **no**
email on the itinerary form, and instead let a viewer type an ad-hoc recipient list at
send-time via an Export modal.

## Goals

1. Remove all email collection from the itinerary creation form (frontend **and** the
   `member.email` DB column).
2. Replace the Export dropdown ("Copy as text" / "Email to group") with a single **Export**
   button that opens a modal.
3. In the modal: a chip/tag email input where the user types recipient emails, plus a
   **Copy to clipboard** button pinned bottom-center.
4. On send, the backend emails the itinerary (PDF + branded HTML) to the typed addresses
   via the existing Gmail SMTP mailer.
5. **Any viewer** can export/email (the owner gate is removed).

## Non-goals

- No change to the PDF generation (`services/export/itineraryPdf.js`) or the Gmail SMTP
  transport (`lib/mailer.js`) — both are reused as-is.
- No per-recipient name/personalization — typed emails carry no name, so a generic greeting
  is used.
- No new frontend test harness (the app has none); frontend changes verified manually.

## Frontend changes

### Remove email collection from the Create wizard
- `frontend/src/pages/CreateItineraryPage/MemberCard/MemberCard.jsx` — delete the email
  `<TextInput>` (~lines 40-45).
- `frontend/src/pages/CreateItineraryPage/memberModel.js` — remove `email: ''` from the
  blank-member factory.
- `frontend/src/pages/CreateItineraryPage/buildRequest.js` — remove the
  `...(email ? { email } : {})` inclusion.

### New `ExportModal/` component
New folder `frontend/src/pages/ItineraryPage/ExportModal/` with `ExportModal.jsx` +
`ExportModal.css`, following the existing per-component folder pattern (like `ExportButton`,
`PinDetailModal`). This replaces `ExportButton`'s role.

Behavior:
- **Overlay:** fixed full-screen backdrop + centered card. Card uses existing CSS-variable
  tokens to match `PinDetailModal` styling: `background: var(--surface)`,
  `border: 1px solid var(--border)`, `border-radius: var(--radius)`,
  `box-shadow: var(--shadow-lg)`, `padding: 16px`.
- **Chip/tag email input:** user types an email and presses **Enter** or **comma** to add
  it as a removable chip. Each entry is validated with a well-formed-email regex on add;
  invalid entries are rejected with an inline hint and not added; duplicates are ignored.
- **Send button:** disabled when there are no valid chips. Calls the API, shows a
  busy/status message (e.g. `Sent to N, M failed`), closes the modal on success.
- **Copy to clipboard button:** pinned bottom-center of the modal. Reuses the existing
  `buildItinerarySummaryText(itinerary)` + `navigator.clipboard.writeText` with the
  hidden-textarea `document.execCommand('copy')` fallback (the current `handleCopyText`
  logic).
- **Close paths:** backdrop click, an X button, and the Escape key.

### `ActionBar.jsx` / `ItineraryPage.jsx`
- Replace the `ExportButton` dropdown with a single **Export** button that opens
  `ExportModal`. Shown to **all viewers** (not owner-gated).
- `ItineraryPage` owns the modal open/close state and passes into the modal: the
  `itinerary` object, the new `emailItinerary(id, emails)` call, and the copy handler.
- **Delete the old `ExportButton/` folder** — its role is fully replaced. (Confirm deletion
  with the user before removing.)

### API client
- `frontend/src/api/itinerary.js` — change `emailItinerary(id)` → `emailItinerary(id, emails)`
  sending request body `{ emails }`.

## Backend changes

### Endpoint contract (`controllers/exportController.js`, `POST /itineraries/:id/export/email`)
- **Accept** `{ emails: [...] }` in the request body instead of deriving recipients from
  members.
- **Validate:** reject a non-array or empty list → **400**; validate each address with a
  well-formed-email check; dedupe. If nothing valid remains → **400**.
- **Drop the owner gate:** replace `loadOwned(...)` (which 403s non-owners and loads
  owner-private fields) with a viewer-accessible load — the itinerary must be visible to the
  requester (public, or otherwise visible to them); **404** if not. Load via a non-owner
  path so no owner-private fields are pulled.
- **Send:** build the PDF once, then `sendMail` once per validated address with a **generic
  greeting** ("Hi there,"). Deps stay injectable via `DEFAULT_DEPS`.
- **Response:** `{ sent: [...], failed: [...] }`. Drop `skipped` (no longer meaningful).
  Keep **502** when PDF build fails or all sends fail; **200** on full or partial success.

### Remove `member.email` (full removal, including DB)
- `backend/prisma/schema.prisma` — drop the `email` field from the member model.
- `backend/services/itinerary/persist.js` — remove `email` from `memberRows` (~line 147).
- `backend/models/itineraries.js` — remove `email` from `OWNER_ONLY_FIELDS` / the export
  include, and any other reference.
- **Migration:** generate a new Prisma migration dropping the column.

  > ⚠️ **Shared-DB gate.** This migration runs against the shared Supabase Postgres.
  > Per project CLAUDE.md, it will **NOT be applied without the user's explicit go-ahead**.
  > The migration file will be generated and committed; teammates must `git pull` the
  > `prisma/migrations/<name>/` folder. Never run `prisma migrate reset` / `--force-reset`.

### Mailer
- `backend/lib/mailer.js` — unchanged; already supports a per-recipient `To:` header.

## Testing

### Backend (`node:test`)
Update `exportController` tests for the new contract:
- Valid `{ emails }` list → sends one message per address, returns `{ sent, failed }`.
- Non-array / empty / all-invalid list → **400**.
- Non-owner viewer of a visible itinerary **can** now send (owner gate removed).
- Itinerary not visible / not found → **404**.
- Partial-failure response shape (some sent, some failed) → **200**.
- Generic greeting is used (no per-recipient name).
- PDF build failure / all-sends-fail → **502**.

### Frontend
Manual verification (no test harness):
- Chip add via Enter and comma; chip removal; invalid-email rejection; duplicate ignore.
- Send shows busy → status; modal closes on success.
- Copy-to-clipboard button copies summary text (and falls back correctly).
- Close via backdrop, X, and Escape.
- Create wizard no longer shows an email field and still submits successfully.

## Rollout order
1. Frontend: remove email input from the wizard; build the modal; rewire ActionBar/API;
   delete `ExportButton/`.
2. Backend: new endpoint contract + tests (green).
3. Schema: remove `member.email`, generate migration, update persist/model.
4. **Pause** for user go-ahead before applying the migration to the shared DB.

