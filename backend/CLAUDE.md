# Backend conventions

Express 5 + Prisma on Supabase. ES modules throughout (`import`/`export`, `.js` extensions
required in import paths). Entry point is `index.js`; routes mount there under their resource
prefix (`/users`, `/itineraries`, `/pins`, `/recommendations`, `/ai-agent`).

## Layering — keep responsibilities in their layer

Request flows: **route → middleware → controller → model → Prisma**, with `lib/` and `utils/`
as shared helpers. Don't skip or blur layers.

- **`routes/`** — URL-to-handler wiring only. Attach middleware here (e.g. `requireAuth`,
  multer for uploads). No business logic.
- **`controllers/`** — own HTTP: read `req`, validate input, set status codes, shape the JSON
  response. Return friendly error messages to clients; `console.error` the raw error for us.
  Controllers are the ONLY layer that touches `req`/`res`.
- **`models/`** — thin data-access wrappers around Prisma. No business logic, no `req`/`res`.
  Every query for a table goes through its model file. Expose only public-safe fields via a
  `select` (see `profileSelect` in `models/users.js`) — never leak internal columns.
- **`middleware/`** — logic shared across routes (authentication, input validation).
- **`lib/`** — external-service clients and the ONLY place `process.env` is read. Supabase
  clients live in `lib/supabase.js`: the anon client for verifying user tokens, the admin
  (service-role) client for privileged Storage/Auth writes that must never reach the browser.
- **`utils/`** — pure, dependency-free helpers (geo, time, route math). Unit-tested.
- **`services/`** — multi-step domain logic (AI generation, recommendation engine) that's too
  big for a controller. Organized by domain with co-located `*.test.js`.

## Auth

- Supabase Auth owns email and password; our `User` table owns `username`, `avatarUrl`, and app
  relations. `authUserId` links a `User` row to its Supabase auth user.
- Protected routes use `requireAuth` (`middleware/auth.js`), which verifies the
  `Authorization: Bearer <token>` header and attaches the app-side profile to `req.user`.
- For per-user resources, check ownership in the controller (`req.user.id !== id → 403`), as in
  `updateUser` / `uploadUserAvatar`.

## Responses

- Always respond with JSON, including errors — the frontend parses every response. The 404 and
  global error handlers in `index.js` enforce this; keep them last.

## Testing

- Tests are co-located `*.test.js` next to the code (see `utils/`, `services/`). Add tests for
  new pure helpers and service logic.

## Database

See the root `CLAUDE.md` — the Supabase Postgres is shared. Never reset it; reconcile migration
drift by syncing files with the team, not by dropping the database.
