# AI-Generated Banners Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users generate an AI banner image (OpenAI `gpt-image-1`) from a chat prompt + itinerary details in Step 3 of the create wizard, regenerate up to 3 times, flip through the history, and use the chosen one as the itinerary cover via the existing upload path.

**Architecture:** A new image-generation client (`lib/imageClient.js`) wraps the OpenAI SDK's `images.generate`. A pure prompt builder + a thin service (`services/ai/banner/`) fold itinerary context into the prompt and return base64. A rate-limited `POST /ai-agent/banner` endpoint returns the image as base64 — nothing is stored server-side at generation time. The frontend modal holds up-to-3 generated banners in local state; the chosen base64 is converted to a `File` and set on `form.coverImageFile`, so the existing `LoadingPage` → `POST /itineraries/:id/cover` upload path handles persistence unchanged.

**Tech Stack:** Node ESM, Express 5, `openai` SDK (already a dependency), `node:test`, React 19, axios, Vite. Frontend modal styled via the **ui-ux-pro-max** skill.

## Global Constraints

- Backend is ESM (`"type": "module"`): `import`/`export`, `.js` extensions required in import paths.
- `process.env` is read ONLY in `lib/` (or `config/`) — never in controllers/services (`.claude/rules/backend.md`).
- All DB access goes through a model; controllers stay thin; real logic lives in services.
- Controllers are the ONLY layer touching `req`/`res`; always respond with JSON, including errors.
- Tests: co-located `*.test.js`, run with `node --test`. Only pure/service layers are unit-tested (routes/controllers/middleware follow the existing no-unit-test convention).
- Git (`.claude/rules/git.md`): imperative subject ≤50 chars, capitalized, no period; **NO `Co-Authored-By: Claude` trailer**; never commit to `main`. Current branch is `dylan-itinerary-quality` — commit there.
- Frontend (`frontend/CLAUDE.md`): create/modify ONLY the files this plan names. Do not add extra files/components/config.
- Provider is OpenAI `gpt-image-1` only. Requires `OPEN_AI_API_KEY` set (the same key `lib/aiClient.js`'s OpenAI branch uses).

---

### Task 1: Banner config constants

**Files:**
- Modify: `backend/config/ai.js` (append new exports at end)

**Interfaces:**
- Produces: `BANNER_MODEL: string`, `BANNER_IMAGE_SIZE: string`, `MAX_BANNERS_PER_ITINERARY: number`, `BANNER_PROMPT_MAX_CHARS: number`, `BANNER_RATE_LIMIT_MAX: number`, `BANNER_RATE_LIMIT_WINDOW_MS: number`.

- [ ] **Step 1: Add the constants**

Append to the end of `backend/config/ai.js`:

```js
// --- AI banner generation (gpt-image-1) ---------------------------------
// Cover-image generation for the create-itinerary wizard. Separate from the
// sequencing model above: this is an IMAGE model, called via lib/imageClient.js.

// OpenAI image model id. gpt-image-1 is OpenAI's current text-to-image model.
export const BANNER_MODEL = 'gpt-image-1'

// Landscape, banner-shaped output — the cover renders wide (see CoverImage).
export const BANNER_IMAGE_SIZE = '1536x1024'

// Max banners a user may generate per create session. Enforced client-side
// (no itinerary row exists yet during the wizard); the server-side guardrail
// is the per-user rate limit below.
export const MAX_BANNERS_PER_ITINERARY = 3

// Cap on the user's free-text style prompt, to bound the request and cost.
export const BANNER_PROMPT_MAX_CHARS = 500

// Per-user rate limit on POST /ai-agent/banner: at most 10 generations per
// rolling hour. This is the real cost guardrail (the 3-cap above is bypassable
// by refreshing the wizard).
export const BANNER_RATE_LIMIT_MAX = Number(process.env.BANNER_RATE_LIMIT_MAX) || 10
export const BANNER_RATE_LIMIT_WINDOW_MS =
  Number(process.env.BANNER_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000
```

- [ ] **Step 2: Verify it loads**

Run: `cd backend && node -e "import('./config/ai.js').then(m => console.log(m.BANNER_MODEL, m.BANNER_IMAGE_SIZE, m.MAX_BANNERS_PER_ITINERARY, m.BANNER_RATE_LIMIT_MAX))"`
Expected: prints `gpt-image-1 1536x1024 3 10`

- [ ] **Step 3: Commit**

```bash
git add backend/config/ai.js
git commit -m "Add AI banner config constants"
```

---

### Task 2: Image-generation client

**Files:**
- Create: `backend/lib/imageClient.js`

**Interfaces:**
- Consumes: `BANNER_MODEL`, `BANNER_IMAGE_SIZE` from `config/ai.js`; `OPEN_AI_API_KEY` from `process.env`.
- Produces: `generateImage({ prompt, size? }) => Promise<{ b64_json: string }>`. Throws if `OPEN_AI_API_KEY` is unset or the API returns no image data.

- [ ] **Step 1: Write the client**

Create `backend/lib/imageClient.js`:

```js
// OpenAI image-generation client for AI banners. This is the ONLY place the
// image-generation key is read from process.env (per .claude/rules/backend.md's
// "process.env confined to lib/" rule), mirroring lib/aiClient.js. The banner
// service (services/ai/banner/) imports generateImage() and stays env-free.
import OpenAI from 'openai'
import { BANNER_MODEL, BANNER_IMAGE_SIZE } from '../config/ai.js'

// Built once, lazily, so tests can import the service without a key set.
let cached
function getImageClient() {
  if (cached) return cached
  if (!process.env.OPEN_AI_API_KEY) {
    throw new Error('OPEN_AI_API_KEY is not set (required for banner generation)')
  }
  cached = new OpenAI({ apiKey: process.env.OPEN_AI_API_KEY })
  return cached
}

// Generate one image from a text prompt. Returns { b64_json }. gpt-image-1
// always returns base64 (no URL option), which is exactly what we want — the
// bytes travel to the browser and are never persisted server-side here.
export async function generateImage({ prompt, size = BANNER_IMAGE_SIZE }) {
  const client = getImageClient()
  const response = await client.images.generate({
    model: BANNER_MODEL,
    prompt,
    size,
    n: 1,
  })
  const b64 = response?.data?.[0]?.b64_json
  if (!b64) throw new Error('Image API returned no image data')
  return { b64_json: b64 }
}
```

- [ ] **Step 2: Verify it imports without a key**

Run: `cd backend && node -e "import('./lib/imageClient.js').then(m => console.log(typeof m.generateImage))"`
Expected: prints `function` (no throw at import time — the key is only read on first call)

- [ ] **Step 3: Commit**

```bash
git add backend/lib/imageClient.js
git commit -m "Add OpenAI image-generation client"
```

---

### Task 3: Banner service (prompt builder + generateBanner)

**Files:**
- Create: `backend/services/ai/banner/banner.js`
- Test: `backend/services/ai/banner/banner.test.js`

**Interfaces:**
- Consumes: `generateImage` from `lib/imageClient.js`; `BANNER_PROMPT_MAX_CHARS` from `config/ai.js`.
- Produces:
  - `buildBannerPrompt({ title, location, description }, promptText) => string` (pure).
  - `generateBanner(details, promptText, imageFn = generateImage) => Promise<{ image: string, mediaType: string }>` — `image` is base64, `mediaType` is `'image/png'`. `imageFn` is injectable for tests.

- [ ] **Step 1: Write the failing tests**

Create `backend/services/ai/banner/banner.test.js`:

```js
// Unit tests for the banner service: the pure prompt builder (context folding,
// empty-field handling, style append, length cap) and generateBanner's handling
// of success / malformed / thrown errors via an injected image fn. No live API.
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildBannerPrompt, generateBanner } from './banner.js'

test('buildBannerPrompt: includes the fixed no-text scaffold', () => {
  const prompt = buildBannerPrompt({ title: 'SF Day', location: 'San Francisco' }, 'sunset vibes')
  assert.match(prompt, /no text|no words|no letters/i)
})

test('buildBannerPrompt: folds in title, location, and user style text', () => {
  const prompt = buildBannerPrompt(
    { title: 'Foodie Crawl', location: 'San Francisco', description: 'tacos and views' },
    'watercolor, warm',
  )
  assert.match(prompt, /Foodie Crawl/)
  assert.match(prompt, /San Francisco/)
  assert.match(prompt, /tacos and views/)
  assert.match(prompt, /watercolor, warm/)
})

test('buildBannerPrompt: omits empty optional fields without crashing', () => {
  const prompt = buildBannerPrompt({ title: '', location: '', description: '' }, '')
  assert.equal(typeof prompt, 'string')
  assert.ok(prompt.length > 0) // scaffold is always present
})

test('buildBannerPrompt: caps the user style text length', () => {
  const long = 'a'.repeat(2000)
  const prompt = buildBannerPrompt({ title: 'T', location: 'L' }, long)
  // The 2000-char run must be truncated well below its original length.
  assert.ok(!prompt.includes('a'.repeat(600)))
})

test('generateBanner: returns base64 image + mediaType on success', async () => {
  const fakeImageFn = async ({ prompt }) => {
    assert.match(prompt, /San Francisco/) // details reached the image fn
    return { b64_json: 'ZmFrZS1iYXNlNjQ=' }
  }
  const out = await generateBanner(
    { title: 'SF Day', location: 'San Francisco' },
    'cozy',
    fakeImageFn,
  )
  assert.equal(out.image, 'ZmFrZS1iYXNlNjQ=')
  assert.equal(out.mediaType, 'image/png')
})

test('generateBanner: throws when the image fn returns no b64', async () => {
  const badImageFn = async () => ({})
  await assert.rejects(
    () => generateBanner({ title: 'T', location: 'L' }, 'x', badImageFn),
    /no image/i,
  )
})

test('generateBanner: propagates a thrown API error', async () => {
  const throwingImageFn = async () => {
    throw new Error('boom')
  }
  await assert.rejects(
    () => generateBanner({ title: 'T', location: 'L' }, 'x', throwingImageFn),
    /boom/,
  )
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && node --test services/ai/banner/banner.test.js`
Expected: FAIL — cannot resolve `./banner.js`

- [ ] **Step 3: Write the implementation**

Create `backend/services/ai/banner/banner.js`:

```js
// Banner-generation service: turns itinerary details + a user's free-text style
// request into an image prompt, calls the image client, and returns base64.
// Thin per .claude/rules/backend.md — the controller stays free of prompt logic.
import { generateImage } from '../../../lib/imageClient.js'
import { BANNER_PROMPT_MAX_CHARS } from '../../../config/ai.js'

// A fixed scaffold that shapes every banner and forbids text overlays — image
// models render words poorly, and a cover with garbled text looks broken.
const STYLE_SCAFFOLD =
  'A wide, landscape travel banner image. Warm, inviting, high quality. ' +
  'Absolutely NO text, letters, words, numbers, logos, or watermarks anywhere in the image.'

// Compose the image prompt. Itinerary context is included only when present, so
// a bare wizard (no title/description yet) still produces a sensible banner. The
// user's style text is trimmed and length-capped to bound the request.
export function buildBannerPrompt({ title, location, description } = {}, promptText = '') {
  const parts = [STYLE_SCAFFOLD]

  const context = []
  if (title) context.push(`titled "${title}"`)
  if (location) context.push(`for a trip to ${location}`)
  if (description) context.push(`described as: ${description}`)
  if (context.length > 0) {
    parts.push(`The banner is ${context.join(', ')}.`)
  }

  const style = String(promptText ?? '').trim().slice(0, BANNER_PROMPT_MAX_CHARS)
  if (style) {
    parts.push(`Style direction from the user: ${style}.`)
  }

  return parts.join(' ')
}

// Build the prompt, generate one image, and return it as base64 + media type.
// imageFn is injectable so tests can run without the OpenAI SDK or a key.
export async function generateBanner(details, promptText, imageFn = generateImage) {
  const prompt = buildBannerPrompt(details, promptText)
  const { b64_json } = await imageFn({ prompt })
  if (!b64_json) throw new Error('Image API returned no image data')
  return { image: b64_json, mediaType: 'image/png' }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && node --test services/ai/banner/banner.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/services/ai/banner/banner.js backend/services/ai/banner/banner.test.js
git commit -m "Add banner-generation service and tests"
```

---

### Task 4: Per-user rate-limit middleware

**Files:**
- Create: `backend/middleware/bannerRateLimit.js`

**Interfaces:**
- Consumes: `BANNER_RATE_LIMIT_MAX`, `BANNER_RATE_LIMIT_WINDOW_MS` from `config/ai.js`; `req.user.id` (set by `requireAuth`, which must run first).
- Produces: `bannerRateLimit(req, res, next)` Express middleware. Responds `429 { error }` when the caller exceeds the window; otherwise calls `next()`.

- [ ] **Step 1: Write the middleware**

Create `backend/middleware/bannerRateLimit.js`:

```js
// Per-user rate limit for POST /ai-agent/banner — the real cost guardrail for
// AI banner generation (the wizard's 3-cap is client-side and bypassable). This
// runs AFTER requireAuth, so req.user.id is always present. In-memory sliding
// window: fine for the current single-instance deploy; a horizontally-scaled
// backend would need a shared store (Redis) instead.
import { BANNER_RATE_LIMIT_MAX, BANNER_RATE_LIMIT_WINDOW_MS } from '../config/ai.js'

// userId -> array of request timestamps (ms) within the current window.
const hits = new Map()

export function bannerRateLimit(req, res, next) {
  const userId = req.user.id
  const now = Date.now()
  const windowStart = now - BANNER_RATE_LIMIT_WINDOW_MS

  const recent = (hits.get(userId) ?? []).filter((t) => t > windowStart)

  if (recent.length >= BANNER_RATE_LIMIT_MAX) {
    return res.status(429).json({
      error: 'Too many banner generations. Please try again later.',
    })
  }

  recent.push(now)
  hits.set(userId, recent)
  next()
}
```

- [ ] **Step 2: Verify it imports**

Run: `cd backend && node -e "import('./middleware/bannerRateLimit.js').then(m => console.log(typeof m.bannerRateLimit))"`
Expected: prints `function`

- [ ] **Step 3: Commit**

```bash
git add backend/middleware/bannerRateLimit.js
git commit -m "Add per-user banner rate-limit middleware"
```

---

### Task 5: Controller + route

**Files:**
- Modify: `backend/controllers/aiController.js` (add `postBanner`, export it)
- Modify: `backend/routes/aiRoutes.js` (wire `POST /banner`)

**Interfaces:**
- Consumes: `generateBanner` from `services/ai/banner/banner.js`; `BANNER_PROMPT_MAX_CHARS` from `config/ai.js`; `requireAuth`, `bannerRateLimit` middleware.
- Produces: `POST /ai-agent/banner` → `{ image, mediaType }` (200) or `{ error }` (400/429/500). Request body: `{ title?, location?, description?, promptText? }`.

- [ ] **Step 1: Add the controller**

In `backend/controllers/aiController.js`, add the import at the top (below the existing imports):

```js
import { generateBanner } from '../services/ai/banner/banner.js'
import { BANNER_PROMPT_MAX_CHARS } from '../config/ai.js'
```

Add this handler above the final `export { postAiAgent }` line:

```js
// POST /ai-agent/banner
// Generates an AI cover-banner (gpt-image-1) from the itinerary details + the
// user's free-text style prompt, returning the image as base64. Nothing is
// persisted here — the browser holds generated banners and only the CHOSEN one
// is uploaded later via POST /itineraries/:id/cover. Thin per backend rules;
// prompt-building + the image call live in services/ai/banner. Auth +
// bannerRateLimit run first (see aiRoutes.js).
async function postBanner(req, res) {
  const { title, location, description, promptText } = req.body ?? {}

  // Every field is optional, but if present each must be a string, and the
  // free-text prompt is length-capped to bound cost.
  for (const [key, value] of Object.entries({ title, location, description, promptText })) {
    if (value !== undefined && typeof value !== 'string') {
      return res.status(400).json({ error: `${key} must be a string when provided` })
    }
  }
  if (typeof promptText === 'string' && promptText.length > BANNER_PROMPT_MAX_CHARS) {
    return res.status(400).json({ error: `promptText must be ${BANNER_PROMPT_MAX_CHARS} characters or fewer` })
  }

  try {
    const { image, mediaType } = await generateBanner(
      { title, location, description },
      promptText ?? '',
    )
    return res.status(200).json({ image, mediaType })
  } catch (err) {
    console.error('POST /ai-agent/banner failed:', err)
    return res.status(500).json({ error: 'Failed to generate banner' })
  }
}
```

Update the final export line to include `postBanner`:

```js
export { postAiAgent, postBanner }
```

- [ ] **Step 2: Wire the route**

Replace the contents of `backend/routes/aiRoutes.js` with:

```js
import express from 'express'
import { postAiAgent, postBanner } from '../controllers/aiController.js'
import { requireAuth } from '../middleware/auth.js'
import { bannerRateLimit } from '../middleware/bannerRateLimit.js'

const router = express.Router()

router.post('/', requireAuth, postAiAgent)
router.post('/banner', requireAuth, bannerRateLimit, postBanner)

export default router
```

- [ ] **Step 3: Verify the app boots and the full backend suite is green**

Run: `cd backend && node -e "import('./index.js').then(() => { console.log('boot ok'); process.exit(0) })"`
Expected: prints `boot ok` (no import/route errors). If the app listens and hangs, Ctrl-C is fine — the goal is that imports resolve.

Run: `cd backend && node --test`
Expected: PASS — all existing tests plus the 7 new banner-service tests, 0 failures.

- [ ] **Step 4: Commit**

```bash
git add backend/controllers/aiController.js backend/routes/aiRoutes.js
git commit -m "Add POST /ai-agent/banner endpoint"
```

---

### Task 6: Frontend API call

**Files:**
- Modify: `frontend/src/api/itinerary.js` (add `generateBanner`)

**Interfaces:**
- Consumes: the shared `api` client (adds auth token automatically).
- Produces: `generateBanner({ title, location, description, promptText }) => Promise<{ image, mediaType }>`.

- [ ] **Step 1: Add the API function**

In `frontend/src/api/itinerary.js`, add this after `uploadItineraryCover` (keeps the cover-related calls together):

```js
// POST /ai-agent/banner — generate an AI cover banner from the itinerary details
// + a free-text style prompt. Returns { image (base64), mediaType }. The image
// is held in the wizard until the user picks one; only then is it uploaded via
// uploadItineraryCover. Hits a live image model, so allow a generous timeout.
const BANNER_TIMEOUT_MS = 120_000
export async function generateBanner(body) {
  const { data } = await api.post('/ai-agent/banner', body, { timeout: BANNER_TIMEOUT_MS })
  return data
}
```

- [ ] **Step 2: Verify the frontend still builds**

Run: `cd frontend && npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/itinerary.js
git commit -m "Add generateBanner API call"
```

---

### Task 7: Banner generator modal (built with ui-ux-pro-max)

**Files:**
- Create: `frontend/src/pages/CreateItineraryPage/BannerGeneratorModal/BannerGeneratorModal.jsx`
- Create: `frontend/src/pages/CreateItineraryPage/BannerGeneratorModal/BannerGeneratorModal.css`

**Interfaces:**
- Consumes: `generateBanner` from `../../../api/itinerary.js`; `MAX_BANNERS_PER_ITINERARY` behavior (hardcode `3` — the frontend doesn't import backend config).
- Produces: default export `BannerGeneratorModal`. Props:
  - `details: { title, location, description }` — passed to the API as prompt context.
  - `onUse: (file: File) => void` — called with the chosen banner as a PNG `File`.
  - `onClose: () => void` — close without choosing.

**IMPORTANT — styling:** Before writing the JSX/CSS, invoke the **ui-ux-pro-max** skill and design the modal to match NavQuest's existing style. Mirror the structure/patterns of `frontend/src/pages/ItineraryPage/PinDetailModal/` and reuse the app's design tokens/variables (see `frontend/src/App.css` and the wizard's own CSS). Do NOT introduce a new design language.

- [ ] **Step 1: Invoke ui-ux-pro-max and design the modal**

Invoke the `ui-ux-pro-max` skill. Ask it for a modal matching the existing NavQuest aesthetic with: a header (title + hint), a `<textarea>` chat input, a preview area with a loading shimmer state, a thumbnail history strip (up to 3), a "N of 3 used" counter, and Generate/Regenerate + "Use this banner" + Cancel buttons. Use the resulting classes/tokens in the CSS file.

- [ ] **Step 2: Write the component**

Create `frontend/src/pages/CreateItineraryPage/BannerGeneratorModal/BannerGeneratorModal.jsx`. The exact styling/class names come from Step 1; the logic below is required:

```jsx
import './BannerGeneratorModal.css'
import { useState } from 'react'
import { generateBanner } from '../../../api/itinerary.js'

// Max banners per create session. Client-side cap (no itinerary row exists yet
// during the wizard); the backend rate limit is the real cost guardrail.
const MAX_BANNERS = 3

// Convert a base64 PNG the API returned into a File, so the chosen banner slots
// into form.coverImageFile exactly like a manual upload (same downstream path).
function base64ToFile(base64, mediaType) {
  const byteString = atob(base64)
  const bytes = new Uint8Array(byteString.length)
  for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i)
  return new File([bytes], 'ai-banner.png', { type: mediaType || 'image/png' })
}

// Modal for generating AI cover banners. Holds up to MAX_BANNERS generated
// images in local state so the user can flip back and pick a favorite; only the
// chosen one leaves the modal (via onUse) to become the itinerary cover.
function BannerGeneratorModal({ details = {}, onUse, onClose }) {
  const [promptText, setPromptText] = useState('');
  const [banners, setBanners] = useState([]); // [{ image, mediaType }]
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const atLimit = banners.length >= MAX_BANNERS;

  const handleGenerate = async () => {
    if (atLimit || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateBanner({ ...details, promptText });
      setBanners((prev) => {
        const next = [...prev, result];
        setSelectedIndex(next.length - 1);
        return next;
      });
    } catch (err) {
      const status = err?.response?.status;
      setError(
        status === 429
          ? 'You have generated too many banners. Please try again later.'
          : 'Could not generate a banner. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUse = () => {
    const chosen = banners[selectedIndex];
    if (!chosen) return;
    onUse(base64ToFile(chosen.image, chosen.mediaType));
  };

  const current = banners[selectedIndex];

  return (
    <div className="banner-modal__overlay" onClick={onClose}>
      <div className="banner-modal" onClick={(e) => e.stopPropagation()}>
        <header className="banner-modal__header">
          <h2>Generate a banner</h2>
          <p className="banner-modal__hint">
            Describe the vibe — we'll blend it with your trip details.
          </p>
        </header>

        <div className="banner-modal__preview">
          {loading && <div className="banner-modal__shimmer" />}
          {!loading && current && (
            <img
              src={`data:${current.mediaType};base64,${current.image}`}
              alt="Generated banner preview"
            />
          )}
          {!loading && !current && (
            <p className="banner-modal__empty">No banner yet — describe one and generate.</p>
          )}
        </div>

        {banners.length > 0 && (
          <div className="banner-modal__history">
            {banners.map((b, i) => (
              <button
                key={i}
                type="button"
                className={
                  'banner-modal__thumb' + (i === selectedIndex ? ' banner-modal__thumb--active' : '')
                }
                onClick={() => setSelectedIndex(i)}
              >
                <img src={`data:${b.mediaType};base64,${b.image}`} alt={`Banner ${i + 1}`} />
              </button>
            ))}
          </div>
        )}

        <textarea
          className="banner-modal__input"
          placeholder="e.g. warm watercolor sunset, cozy and inviting"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          maxLength={500}
          disabled={atLimit || loading}
        />

        <p className="banner-modal__counter">{banners.length} of {MAX_BANNERS} used</p>

        {error && <p className="banner-modal__error">{error}</p>}

        <div className="banner-modal__actions">
          <button type="button" className="banner-modal__cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="banner-modal__generate"
            onClick={handleGenerate}
            disabled={atLimit || loading}
          >
            {loading ? 'Generating…' : banners.length === 0 ? 'Generate' : 'Regenerate'}
          </button>
          <button
            type="button"
            className="banner-modal__use"
            onClick={handleUse}
            disabled={!current || loading}
          >
            Use this banner
          </button>
        </div>
      </div>
    </div>
  );
}

export default BannerGeneratorModal;
```

- [ ] **Step 3: Write the CSS**

Create `frontend/src/pages/CreateItineraryPage/BannerGeneratorModal/BannerGeneratorModal.css` using the design from Step 1. Must style every class the component uses: `.banner-modal__overlay`, `.banner-modal`, `.banner-modal__header`, `.banner-modal__hint`, `.banner-modal__preview`, `.banner-modal__shimmer`, `.banner-modal__empty`, `.banner-modal__history`, `.banner-modal__thumb`, `.banner-modal__thumb--active`, `.banner-modal__input`, `.banner-modal__counter`, `.banner-modal__error`, `.banner-modal__actions`, `.banner-modal__cancel`, `.banner-modal__generate`, `.banner-modal__use`. Use the app's existing color/spacing tokens (from `App.css`) so it matches. The overlay should be a fixed full-screen dim layer centering the modal; the preview area should hold a landscape (3:2-ish) image.

- [ ] **Step 4: Verify the frontend builds**

Run: `cd frontend && npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/CreateItineraryPage/BannerGeneratorModal/
git commit -m "Add AI banner generator modal"
```

---

### Task 8: Wire the modal into Step 3

**Files:**
- Modify: `frontend/src/pages/CreateItineraryPage/Step3_Finish/Step3_Finish.jsx`
- Modify: `frontend/src/pages/CreateItineraryPage/Step3_Finish/Step3_Finish.css` (button style, if needed)

**Interfaces:**
- Consumes: `BannerGeneratorModal` (default export); existing `update('coverImageFile', file)` — the same field the manual upload sets, so the preview + `LoadingPage` upload work unchanged.

- [ ] **Step 1: Add the import and modal state**

In `Step3_Finish.jsx`, add to the imports:

```js
import { useState } from 'react'
import BannerGeneratorModal from '../BannerGeneratorModal/BannerGeneratorModal.jsx'
```

(Merge `useState` into the existing `react` import line rather than duplicating it: `import { useMemo, useEffect, useRef, useState } from 'react'`.)

Inside the component, add state near the top:

```js
const [showBannerModal, setShowBannerModal] = useState(false);
```

- [ ] **Step 2: Add the "Generate with AI" button + render the modal**

In the "Cover image" field block, add a button after the `step3-finish__cover-upload` label (inside the same `step3-finish__field` div):

```jsx
<button
  type="button"
  className="step3-finish__ai-banner"
  onClick={() => setShowBannerModal(true)}
>
  ✨ Generate with AI
</button>
```

At the end of the component's returned JSX, just before the closing `</div>` of `step3-finish`, render the modal:

```jsx
{showBannerModal && (
  <BannerGeneratorModal
    details={{ title: form.title, location: form.location, description: form.description }}
    onUse={(file) => {
      update('coverImageFile', file);
      setShowBannerModal(false);
    }}
    onClose={() => setShowBannerModal(false)}
  />
)}
```

Note: `form.location` may be undefined in the wizard — that's fine; the backend and prompt builder both treat every detail field as optional.

- [ ] **Step 3: Style the button (if needed)**

In `Step3_Finish.css`, add a `.step3-finish__ai-banner` rule consistent with the existing `.step3-finish__cover-upload` styling (same font/spacing; a subtly distinct accent to signal "AI"). Keep it within the existing design tokens.

- [ ] **Step 4: Verify the frontend builds and lints**

Run: `cd frontend && npm run build && npm run lint`
Expected: build succeeds; lint passes (no unused imports, no errors).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/CreateItineraryPage/Step3_Finish/
git commit -m "Wire AI banner modal into create wizard"
```

---

### Task 9: End-to-end manual QA

**Files:** none (verification only)

- [ ] **Step 1: Confirm `OPEN_AI_API_KEY` is set**

Run: `cd backend && node -e "console.log(process.env.OPEN_AI_API_KEY ? 'key present' : 'MISSING')"` (with the backend `.env` loaded — or check `backend/.env` directly). If missing, banner generation will 500; set it before QA.

- [ ] **Step 2: Run both servers and walk the flow**

Start backend (`npm run dev` in `backend/`) and frontend (`npm run dev` in `frontend/`). Then in the browser:
- Create an itinerary → reach Step 3.
- Click "✨ Generate with AI", type a style, click Generate → a banner appears.
- Regenerate to reach 3 banners → Generate/Regenerate + input disable; counter shows "3 of 3 used".
- Click each history thumbnail → the preview switches.
- Click "Use this banner" → modal closes, the chosen image shows in the Step 3 cover preview.
- Finish the wizard → on the itinerary page, confirm the AI banner is the cover (uploaded via the existing `POST /itineraries/:id/cover`).

- [ ] **Step 3: Confirm the rate limit**

Generate 10 banners within an hour (across sessions/refreshes), then attempt an 11th → the modal shows the "try again later" message (backend returned 429).

- [ ] **Step 4: Final commit (if any QA fixes were needed)**

Only if Steps 1–3 surfaced fixes. Otherwise the feature is complete on the branch.

---

## Self-Review

**Spec coverage:**
- Button on create + modal → Tasks 7, 8. ✓
- Takes itinerary info + chat input → `details` prop + `promptText`; folded server-side by `buildBannerPrompt` (Task 3). ✓
- Regenerate + go back to previous banners → history strip + `selectedIndex` (Task 7). ✓
- Max 3 per itinerary → client cap (Task 7) + `MAX_BANNERS_PER_ITINERARY` config (Task 1). ✓
- Rate limit guardrail → Task 4 (10/hour, per user). ✓
- Reuse existing cover-upload plumbing → base64→File→`form.coverImageFile`→`LoadingPage` (Tasks 7, 8); no persistence changes. ✓
- OpenAI `gpt-image-1` provider → Tasks 1, 2. ✓
- Modal matches app style via ui-ux-pro-max → Task 7 Step 1. ✓
- Only named files created (frontend/CLAUDE.md) → every task lists exact paths. ✓

**Placeholder scan:** No TBD/TODO; all code steps contain full code. The only "design happens here" step (Task 7 Step 1) is an explicit skill invocation for styling, with all logic fully specified in Step 2. ✓

**Type consistency:** `generateBanner` returns `{ image, mediaType }` in the service (Task 3), controller (Task 5), API (Task 6), and modal (Task 7) — consistent. `generateImage` returns `{ b64_json }` in the client (Task 2), consumed by the service (Task 3). `onUse(file)` / `onClose()` / `details` props match between Task 7 (definition) and Task 8 (usage). ✓
