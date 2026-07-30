# AI-Generated Banners — Design

**Date:** 2026-07-30
**Status:** Approved for implementation planning
**Author:** Dylan (with Claude)

## Summary

Add an optional "Generate with AI" banner feature to the Create Itinerary wizard.
In Step 3, next to the existing manual cover-image upload, the user can open a modal,
type a free-text description of how the banner should look, and generate a landscape
banner image via OpenAI `gpt-image-1`. The itinerary's title/location/description are
folded into the prompt automatically. The user can regenerate up to **3 times per
create session**, flip back through all generated banners, and pick one — which then
becomes the itinerary's cover through the **existing** cover-upload path.

## Goals

- A button + modal in Step 3 of the create wizard to generate an AI banner.
- Chat-style free-text input for the user to describe the desired look.
- Automatically blend itinerary details (title, location, description) into the prompt.
- Regenerate, with a hard cap of **3 generations per itinerary/create session**.
- Keep **all** generated banners so the user can go back and pick a favorite.
- Reuse the existing cover-image storage/upload plumbing — no new persistence code.
- Server-side rate limit as a guardrail against cost abuse.

## Non-Goals

- Editing an existing itinerary's banner from the ItineraryPage (create-flow only for now).
- Persisting banner *history* in the database (history lives in wizard state only).
- Storing rejected/unchosen banners in Supabase Storage.
- Multiple providers — we use OpenAI `gpt-image-1` only (kept behind a small seam so a
  future swap is possible, but no second provider is built).

## Key Constraint That Shapes The Design

During the wizard **the itinerary row does not exist yet** — it is persisted later on
`LoadingPage` (via recommend → generate → optional cover upload). Therefore:

- Generated banners cannot be attached to a `coverImageUrl` at generation time.
- The backend cannot count "3 per itinerary" server-side (no itinerary ID exists).
- Generated images are held in **browser wizard state** as base64/blobs; only the
  **chosen** one is ever uploaded to Storage, through the existing
  `POST /itineraries/:id/cover` route after the itinerary is created.

This is why the 3-generation cap is enforced **client-side**, backed by a **per-user
server-side rate limit** on the generation endpoint as the real cost guardrail.

## Architecture / Flow

```
Step3_Finish (wizard)
  └── "Generate with AI" button → opens BannerGeneratorModal
        │  user types style text, clicks Generate/Regenerate
        ▼
  POST /ai-agent/banner   { title, location, description, promptText }   [requireAuth + rate limit]
        │
        ▼
  aiController.postBanner (thin)
        │
        ▼
  services/ai/banner/  → buildBannerPrompt(details, promptText)
                        → generateBannerImage(prompt)  (image client seam)
        │
        ▼
  lib/imageClient.js  → OpenAI SDK images.generate({ model: 'gpt-image-1', size, ... })
        │
        ▼
  returns { b64_json }  →  controller responds { image: "<base64>", mediaType: "image/png" }
        │
        ▼
  Modal stores banner in wizard state (array, max 3). User flips history, picks one.
        │  chosen base64 → Blob → File
        ▼
  form.coverImageFile  (same shape the manual upload produces)
        │
        ▼
  LoadingPage → uploadItineraryCover(id, file)  → POST /itineraries/:id/cover  (EXISTING)
```

### Why base64 (not Storage) during generation

Uploading every attempt to Supabase would orphan up to 3 files per create session for
every user who abandons or picks only one. Returning base64 keeps unchosen banners
ephemeral (browser-only) and reuses the existing upload path for the single chosen image.

## Components

### Backend

| File | New/Changed | Responsibility |
|------|-------------|----------------|
| `backend/lib/imageClient.js` | **New** | OpenAI-SDK image-generation client. Exposes `generateImage({ prompt, size })` returning `{ b64_json }`. Injectable seam for tests (mirrors `lib/aiClient.js` memoization pattern). Reads `OPEN_AI_API_KEY` — **only** place `process.env` is read for this feature. |
| `backend/services/ai/banner/banner.js` | **New** | `buildBannerPrompt({ title, location, description }, promptText)` — pure, testable; and `generateBanner(details, promptText)` — builds prompt, calls the image client, returns base64. Accepts an injectable image-gen fn for tests. |
| `backend/services/ai/banner/banner.test.js` | **New** | Unit tests: prompt builder (context folded in, empty fields handled, style text appended, injection/length caps), and `generateBanner` success/malformed/API-error via a stubbed image-gen fn. No live API. |
| `backend/config/ai.js` | **Changed** | Add `BANNER_MODEL` (`'gpt-image-1'`), `BANNER_IMAGE_SIZE` (`'1536x1024'`), `MAX_BANNERS_PER_ITINERARY` (`3`), and prompt-input caps. |
| `backend/controllers/aiController.js` | **Changed** | Add `postBanner`: validates `promptText` (string, length cap) and details, calls `generateBanner`, returns `{ image, mediaType }`. Friendly errors; `console.error` raw. |
| `backend/routes/aiRoutes.js` | **Changed** | Add `POST /banner` → `requireAuth` → `bannerRateLimit` → `postBanner`. |
| `backend/middleware/bannerRateLimit.js` | **New** | Per-user (by `req.user.id`) in-memory sliding-window limiter of **10 generations/hour**. On exceed → `429 { error }`. In-memory is acceptable for a single-instance capstone deploy; documented as such. |

**No schema/migration changes.** `coverImageUrl`, the `itinerary-covers` bucket, and the
`POST /itineraries/:id/cover` route already exist and are reused unchanged.

### Frontend

Built with the **ui-ux-pro-max** skill so the modal matches NavQuest's existing visual
style (mirror `PinDetailModal` structure + the app's CSS design tokens in `App.css` and
the wizard's own styles). Per `frontend/CLAUDE.md`, these are the **only** new/changed
files:

| File | New/Changed | Responsibility |
|------|-------------|----------------|
| `frontend/src/pages/CreateItineraryPage/BannerGeneratorModal/BannerGeneratorModal.jsx` | **New** | The modal: chat textarea, preview area (with loading shimmer), up-to-3 history thumbnail strip, "N of 3 used" counter, Generate/Regenerate, "Use this banner", Cancel. Manages its own generated-banner array + selected index in local state; on "Use this banner" converts the chosen base64 → `File` and calls a prop callback. |
| `frontend/src/pages/CreateItineraryPage/BannerGeneratorModal/BannerGeneratorModal.css` | **New** | Modal styling using existing design tokens (built via ui-ux-pro-max). |
| `frontend/src/api/ai.js` OR `frontend/src/api/itinerary.js` | **Changed** | Add `generateBanner({ title, location, description, promptText })` → `POST /ai-agent/banner`. (Use whichever file the AI-agent call already lives in; do not create a new api file if one fits.) |
| `frontend/src/pages/CreateItineraryPage/Step3_Finish/Step3_Finish.jsx` | **Changed** | Add "✨ Generate with AI" button near the cover-image field; render `BannerGeneratorModal` when open; on "Use this banner" set `form.coverImageFile` (same field the manual upload uses, so the preview + LoadingPage upload work unchanged). |
| `frontend/src/pages/CreateItineraryPage/Step3_Finish/Step3_Finish.css` | **Changed** | Styles for the new button (if needed). |

The `MAX_BANNERS_PER_ITINERARY = 3` cap lives in the modal's local state: once 3 banners
are generated, Generate/Regenerate and the input disable; the user must pick from the 3.

## Modal UI

- **Header:** title ("Generate a banner") + hint ("Describe the vibe — we'll blend it with your trip details").
- **Chat input:** textarea; user describes *style only* ("watercolor sunset, cozy"). Title/location/description are added server-side, so the user needn't repeat them.
- **Preview area:** current banner, or a loading shimmer while generating.
- **History strip:** up to 3 thumbnails; click to flip to a previous banner. Counter: "2 of 3 used".
- **Buttons:** Generate (first) / Regenerate (disabled at 3), "Use this banner" (sets cover + closes), Cancel.
- **Errors:** inline message on API failure or 429 (rate limit) — modal stays open, no banner consumed on failure.

## Prompt Design

`buildBannerPrompt` composes:

1. **Fixed style scaffold:** wide landscape travel banner; no text, letters, words, logos, or watermarks; photographic/illustrative, warm and inviting.
2. **Itinerary context:** title, location, description (each included only if present).
3. **User style text:** appended, length-capped and sanitized (trimmed, cap enforced).

Empty optional fields are simply omitted. The scaffold explicitly forbids text overlays
because generated text renders poorly and a cover with garbled words looks broken.

## Error Handling

- **Image API failure / timeout:** controller returns `500 { error }`; modal shows inline error, does not consume a generation attempt.
- **Rate limit exceeded:** middleware returns `429 { error }`; modal shows a "try again later" message.
- **Malformed API response** (no `b64_json`): service throws; controller → `500 { error }`.
- **Missing `OPEN_AI_API_KEY`:** image client throws a clear config error at first use;
  controller → `500`. (Feature is optional, so the rest of the app is unaffected.)
- All raw errors `console.error`'d; clients only see friendly JSON messages.

## Cost & Abuse Note (explicit tradeoff)

The 3-cap is client-side and bypassable by refresh; each `gpt-image-1` call costs
~$0.02–0.13. The **per-user server-side rate limit** (`bannerRateLimit`) is the real
guardrail (**10 generations/hour per user**). In-memory limiter is acceptable for the current single-instance deploy; if the
backend is ever horizontally scaled, this would need a shared store (documented, not built).

## Testing

- **Pure:** `buildBannerPrompt` unit tests (context folding, empty fields, style append, caps/sanitization).
- **Service seam:** `generateBanner` with a stubbed image-gen fn — success, malformed response, thrown API error. No live API calls (mirrors the existing `callAI` seam convention).
- **Not unit-tested:** routes/controllers/middleware (matches existing backend convention — only pure/service layers are unit-tested).
- **Manual QA:** generate → regenerate to 3 → cap disables → flip history → pick → confirm the chosen banner uploads as the itinerary cover end-to-end; confirm 429 after exceeding the rate limit.

## Out-of-Scope / Future

- Banner generation/editing on an existing ItineraryPage.
- DB-backed banner history across sessions.
- Reference-image (image-to-image) input.
- Multiple providers / provider config UI.
