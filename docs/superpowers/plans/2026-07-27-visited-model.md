# Visited Model + "I've been here" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in user mark an itinerary as visited ("I've been here") from its detail page, and browse their visited itineraries in a "Visited" carousel on their dashboard.

**Architecture:** A new `Visited` composite-key join table (`[userId, itineraryId]`) beside `Like`/`Bookmark`, but with an updatable `@updatedAt visitedAt` so re-marking refreshes the timestamp. The backend mirrors the `Like` flow (thin model → controller with public-or-owner guard → route), plus exposes `visitedItineraries` on the owner dashboard. The frontend adds a `markVisited` API call, an "I've been here" button on ItineraryPage (the only place a visit is recorded), and a Visited carousel on HomePage mirroring the Liked/Bookmarked sections.

**Tech Stack:** Prisma 6 on Supabase Postgres, Express 5 (ES modules), React 19 + Vite, axios. Backend tests use Node's built-in `node:test` (`npm test` = `node --test`).

## Global Constraints

- **Shared DB — never destructive.** The Supabase Postgres is shared across the team. NEVER run `prisma migrate reset` or `db push --force-reset`. `git pull` before generating a migration; commit the generated `prisma/migrations/<name>/` folder. **Ask the user before running the migration against the shared DB.**
- **Backend is ES modules** (`"type": "module"`): use `import`/`export`, `.js` extensions required in import paths.
- **Backend layering:** route → middleware → controller → model → Prisma. Controllers are the only layer touching `req`/`res`. Models are thin Prisma wrappers, no business logic. Every table's queries go through its model file.
- **Frontend "no extra files" rule** (`frontend/CLAUDE.md`): add no files beyond those this plan explicitly lists. The two new frontend folders (`VisitedButton/`, `VisitedItinerariesSection/`) are required by this plan and each mirror an existing sibling pattern exactly.
- **Never commit or print `.env` values.**
- Backend tests that need a DB must **skip (not fail) when no DB is reachable**, matching `services/recommendation/index.test.js`.

---

## File Structure

**Backend**
- Modify `backend/prisma/schema.prisma` — add `Visited` model + back-relations on `User` and `Itinerary`.
- Create `backend/prisma/migrations/<timestamp>_add_visited/migration.sql` — generated, additive.
- Create `backend/models/visited.js` — thin data-access wrapper (`upsert`, `remove`).
- Create `backend/models/visited.test.js` — DB-integration test (skips without DB).
- Modify `backend/controllers/itineraryController.js` — add `markVisited`, export it.
- Modify `backend/routes/itineraryRoutes.js` — add `POST /:id/visited`.
- Modify `backend/models/users.js` — add `visited` to the dashboard include.
- Modify `backend/controllers/userController.js` — add `visitedItineraries` to the dashboard response.

**Frontend**
- Modify `frontend/src/api/itinerary.js` — add `markVisited(id)`.
- Create `frontend/src/pages/ItineraryPage/VisitedButton/VisitedButton.jsx` + `.css` — action button (mirrors `SaveCopyButton`).
- Modify `frontend/src/pages/ItineraryPage/ActionBar/ActionBar.jsx` — render `VisitedButton`.
- Modify `frontend/src/pages/ItineraryPage/ItineraryPanel/ItineraryPanel.jsx` — thread visited props.
- Modify `frontend/src/pages/ItineraryPage/ItineraryPage.jsx` — visited state, `handleMarkVisited`, hydration.
- Create `frontend/src/pages/HomePage/VisitedItinerariesSection/VisitedItinerariesSection.jsx` + `.css` — carousel (mirrors `LikedItinerariesSection`).
- Modify `frontend/src/pages/HomePage/HomePage.jsx` — fetch/track `visitedIds`, render the section.

---

## Task 1: Schema + migration

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_add_visited/migration.sql` (generated)

**Interfaces:**
- Produces: a `Visited` table with PK `(userId, itineraryId)`, column `visitedAt`, index on `itineraryId`; Prisma model `prisma.visited` with `upsert`/`deleteMany`/`count` available.

- [ ] **Step 1: `git pull` to avoid migration drift**

Run: `cd backend && git pull`
Expected: up to date (or new migrations pulled). If teammates pushed schema changes, reconcile per root `CLAUDE.md` before continuing.

- [ ] **Step 2: Add the `Visited` model to `schema.prisma`**

Add this model immediately after the `Bookmark` model (around line 136):

```prisma
model Visited {
  userId      Int
  itineraryId Int
  // Updatable, unlike Like/Bookmark: re-marking an itinerary as visited refreshes
  // this via @updatedAt (Prisma writes it on every update, incl. no-op updates).
  visitedAt   DateTime  @default(now()) @updatedAt
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  itinerary   Itinerary @relation(fields: [itineraryId], references: [id], onDelete: Cascade)

  @@id([userId, itineraryId])
  // Composite PK is ordered by userId, so an itineraryId-only lookup can't use
  // it. Mirrors Like's index; backs the cascade delete from Itinerary.
  @@index([itineraryId])
}
```

- [ ] **Step 3: Add the back-relation on `User`**

In `model User`, after the `bookmarks Bookmark[]` line (line 44), add:

```prisma
  visited            Visited[]
```

- [ ] **Step 4: Add the back-relation on `Itinerary`**

In `model Itinerary`, after the `bookmarks Bookmark[]` line (line 75), add:

```prisma
  visited           Visited[]
```

- [ ] **Step 5: Ask the user before touching the shared DB**

Confirm with the user: "Ready to run the additive `add_visited` migration against the shared Supabase DB — it only creates the new `Visited` table, no changes to existing tables. Proceed?" Wait for a yes.

- [ ] **Step 6: Generate + apply the migration**

Run: `cd backend && npx prisma migrate dev --name add_visited`
Expected: Prisma creates `prisma/migrations/<timestamp>_add_visited/migration.sql` containing roughly:

```sql
CREATE TABLE "Visited" (
    "userId" INTEGER NOT NULL,
    "itineraryId" INTEGER NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Visited_pkey" PRIMARY KEY ("userId","itineraryId")
);
CREATE INDEX "Visited_itineraryId_idx" ON "Visited"("itineraryId");
ALTER TABLE "Visited" ADD CONSTRAINT "Visited_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Visited" ADD CONSTRAINT "Visited_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "Itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

The command also regenerates the Prisma client. Confirm output ends with the migration applied and "Generated Prisma Client".

- [ ] **Step 7: Commit**

```bash
cd backend
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add Visited join model + migration"
```

---

## Task 2: `models/visited.js` + test

**Files:**
- Create: `backend/models/visited.js`
- Create: `backend/models/visited.test.js`

**Interfaces:**
- Consumes: `prisma` from `../lib/prisma.js`; the `prisma.visited` model from Task 1.
- Produces: `upsert(userId, itineraryId) => Promise<Visited>` (idempotent; refreshes `visitedAt`), `remove(userId, itineraryId) => Promise<{count}>` (idempotent).

- [ ] **Step 1: Write the failing test**

Create `backend/models/visited.test.js`. This mirrors `services/recommendation/index.test.js`'s skip-without-DB pattern (it needs a real `User` + `Itinerary` to satisfy the FKs). It creates a throwaway user + private itinerary, exercises `upsert` twice, asserts one row and a refreshed timestamp, then cleans up.

```js
// DB-integration test for the Visited model. Skips (doesn't fail) when there's
// no reachable DB, matching services/recommendation/index.test.js so `npm test`
// stays green on a machine without Postgres.
import 'dotenv/config'
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import prisma from '../lib/prisma.js'
import * as visited from './visited.js'

let dbReason // undefined when the DB is reachable (node:test treats null as truthy)
try {
  await prisma.$queryRaw`SELECT 1`
} catch {
  dbReason = 'no DATABASE_URL / Postgres unreachable'
}

after(async () => {
  await prisma.$disconnect()
})

test('upsert is idempotent and refreshes visitedAt', { skip: dbReason }, async () => {
  // Unique-enough throwaway identifiers so parallel/other test data can't collide.
  const tag = `visited-test-${process.pid}`
  const user = await prisma.user.create({
    data: { authUserId: tag, email: `${tag}@example.com`, username: tag },
  })
  const itinerary = await prisma.itinerary.create({
    data: { userId: user.id, title: 'T', location: 'SF', isPublic: false },
  })

  try {
    const first = await visited.upsert(user.id, itinerary.id)
    // Second call must NOT create a second row, and must bump visitedAt.
    const second = await visited.upsert(user.id, itinerary.id)

    const count = await prisma.visited.count({ where: { itineraryId: itinerary.id } })
    assert.equal(count, 1, 'upsert must not create duplicate rows')
    assert.ok(
      second.visitedAt.getTime() >= first.visitedAt.getTime(),
      'visitedAt should refresh (or stay equal) on re-visit',
    )

    // remove is idempotent: first deletes the row, second is a no-op.
    const del1 = await visited.remove(user.id, itinerary.id)
    const del2 = await visited.remove(user.id, itinerary.id)
    assert.equal(del1.count, 1)
    assert.equal(del2.count, 0)
  } finally {
    // Cascade deletes the Visited/Itinerary rows with the user.
    await prisma.user.delete({ where: { id: user.id } })
  }
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && node --test models/visited.test.js`
Expected: FAIL — `Cannot find module './visited.js'` (the model doesn't exist yet). If no DB is reachable, it SKIPS instead; that's acceptable, but the module-not-found error still surfaces at import time, so it will error until Step 3.

- [ ] **Step 3: Write `models/visited.js`**

Create `backend/models/visited.js`:

```js
// Data-access wrapper for the Visited table. Thin — no business logic, no
// req/res (see .claude/rules/backend.md → Models). Mirrors likes.js/bookmarks.js,
// but the row's visitedAt refreshes on re-visit (via @updatedAt in the schema),
// so update:{} is enough to bump the timestamp.
import prisma from '../lib/prisma.js'

// Records a visit if absent, refreshes visitedAt if present (safe to call repeatedly).
function upsert(userId, itineraryId) {
  return prisma.visited.upsert({
    where: { userId_itineraryId: { userId, itineraryId } },
    create: { userId, itineraryId },
    update: {}, // @updatedAt bumps visitedAt even on a no-op update
  })
}

// Removes the visit if present, no-op otherwise (safe to call repeatedly).
function remove(userId, itineraryId) {
  return prisma.visited.deleteMany({ where: { userId, itineraryId } })
}

export { upsert, remove }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && node --test models/visited.test.js`
Expected: PASS (with a reachable seeded DB) or SKIP (no DB). Neither should FAIL.

- [ ] **Step 5: Commit**

```bash
cd backend
git add models/visited.js models/visited.test.js
git commit -m "feat: add visited model wrapper + test"
```

---

## Task 3: `markVisited` controller + route

**Files:**
- Modify: `backend/controllers/itineraryController.js`
- Modify: `backend/routes/itineraryRoutes.js`

**Interfaces:**
- Consumes: `visited.upsert` (Task 2); `itineraries.findByIdBasic`, `parseIdParam`, `loadOrNotFound` (existing); `requireAuth` (existing).
- Produces: `markVisited(req, res)` exported from the controller; `POST /itineraries/:id/visited` route.

- [ ] **Step 1: Import the visited model in the controller**

In `backend/controllers/itineraryController.js`, after line 3 (`import * as bookmarks from '../models/bookmarks.js'`), add:

```js
import * as visited from '../models/visited.js'
```

- [ ] **Step 2: Add the `markVisited` controller function**

In `backend/controllers/itineraryController.js`, immediately after `removeBookmark` (ends at line 312, before `copyItinerary`), add:

```js
// POST /itineraries/:id/visited
// Marks a public (or the caller's own) itinerary as visited. Idempotent — a
// repeat call just refreshes visitedAt. Same public-or-owner guard as like, so
// a private draft can't be marked by a stranger and leak into their dashboard.
async function markVisited(req, res) {
  const id = parseIdParam(req, res, 'itinerary id')
  if (id === null) return

  const itinerary = await loadOrNotFound(res, itineraries.findByIdBasic, id, 'Itinerary')
  if (!itinerary) return
  if (!itinerary.isPublic && itinerary.userId !== req.user.id) {
    return res.status(403).json({ error: 'Only public itineraries can be marked as visited' })
  }

  await visited.upsert(req.user.id, id)

  return res.status(204).send()
}
```

- [ ] **Step 3: Export `markVisited`**

In the controller's export list (around line 417, alongside `likeItinerary` etc.), add `markVisited`. For example:

```js
  bookmarkItinerary,
  removeBookmark,
  markVisited,
```

- [ ] **Step 4: Wire the route**

In `backend/routes/itineraryRoutes.js`:

Add `markVisited` to the import block from the controller (after `removeBookmark,`):

```js
  removeBookmark,
  markVisited,
```

Add the route after the bookmark routes (after line `router.delete('/:id/bookmark', requireAuth, removeBookmark)`):

```js
router.post('/:id/visited', requireAuth, markVisited)
```

- [ ] **Step 5: Verify the server boots and the route is wired**

Run: `cd backend && node --check controllers/itineraryController.js && node --check routes/itineraryRoutes.js`
Expected: no output (syntax OK). Then run the full suite to confirm nothing broke:
Run: `cd backend && npm test`
Expected: existing tests green (DB tests may skip), no failures.

- [ ] **Step 6: Commit**

```bash
cd backend
git add controllers/itineraryController.js routes/itineraryRoutes.js
git commit -m "feat: POST /itineraries/:id/visited endpoint"
```

---

## Task 4: Expose `visitedItineraries` on the dashboard

**Files:**
- Modify: `backend/models/users.js`
- Modify: `backend/controllers/userController.js`

**Interfaces:**
- Consumes: `findDashboardById` (existing), `reshapeItinerary` (existing, already imported in userController).
- Produces: `GET /users/:id` response gains `visitedItineraries: Itinerary[]` (reshaped `{ forOwner: false }`).

- [ ] **Step 1: Add `visited` to the dashboard include**

In `backend/models/users.js`, inside `findDashboardById`'s `include` block, after the `likes:` line (line 43), add:

```js
      visited: { include: { itinerary: { include: dashboardItineraryInclude } } },
```

- [ ] **Step 2: Add `visitedItineraries` to the dashboard response**

In `backend/controllers/userController.js`, in `getUser`'s response object, after the `likedItineraries` line (line 235), add:

```js
    // Visited itineraries are other people's public itineraries → forOwner:false
    // strips owner-only fields (members, meeting point), same as liked/bookmarked.
    visitedItineraries: user.visited.map((v) => reshapeItinerary(v.itinerary, { forOwner: false })),
```

- [ ] **Step 3: Verify syntax + suite**

Run: `cd backend && node --check models/users.js && node --check controllers/userController.js && npm test`
Expected: syntax OK; test suite green (DB tests may skip).

- [ ] **Step 4: Commit**

```bash
cd backend
git add models/users.js controllers/userController.js
git commit -m "feat: expose visitedItineraries on the dashboard"
```

---

## Task 5: Frontend — `markVisited` API + "I've been here" button on ItineraryPage

**Files:**
- Modify: `frontend/src/api/itinerary.js`
- Create: `frontend/src/pages/ItineraryPage/VisitedButton/VisitedButton.jsx`
- Create: `frontend/src/pages/ItineraryPage/VisitedButton/VisitedButton.css`
- Modify: `frontend/src/pages/ItineraryPage/ActionBar/ActionBar.jsx`
- Modify: `frontend/src/pages/ItineraryPage/ItineraryPanel/ItineraryPanel.jsx`
- Modify: `frontend/src/pages/ItineraryPage/ItineraryPage.jsx`

**Interfaces:**
- Consumes: `POST /itineraries/:id/visited` (Task 3); `visitedItineraries` from the dashboard (Task 4); shared `api` client.
- Produces: `markVisited(id)` in the API module; `<VisitedButton visited onClick />`; `visited`/`onMarkVisited` props threaded ItineraryPage → ItineraryPanel → ActionBar.

- [ ] **Step 1: Add the API function**

In `frontend/src/api/itinerary.js`, after `removeBookmark` (after line 86), add:

```js
// POST /itineraries/:id/visited — mark an itinerary as visited ("I've been
// here"). Idempotent; 204 No Content. There is no un-mark endpoint yet.
export async function markVisited(id) {
  await api.post(`/itineraries/${id}/visited`)
}
```

- [ ] **Step 2: Create the VisitedButton component**

Create `frontend/src/pages/ItineraryPage/VisitedButton/VisitedButton.jsx` (mirrors `SaveCopyButton`, with a marked state like `BookmarkButton`). It is one-way: once visited it shows "Visited" and is disabled (no un-mark endpoint yet — see the spec's Out of scope).

```jsx
import './VisitedButton.css'

// "I've been here" action. One-way for now: once visited, it shows the marked
// state and disables (there's no un-mark endpoint yet — see the design spec).
function VisitedButton({ visited = false, onClick }) {
  return (
    <button
      type="button"
      className={`action-btn visited-button${visited ? ' visited-button--on' : ''}`}
      onClick={onClick}
      disabled={visited}
      aria-pressed={visited}
      aria-label={visited ? 'Marked as visited' : "Mark as visited (I've been here)"}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
      {visited ? 'Visited' : "I've been here"}
    </button>
  );
}

export default VisitedButton;
```

- [ ] **Step 3: Create the VisitedButton CSS**

Create `frontend/src/pages/ItineraryPage/VisitedButton/VisitedButton.css` (mirrors `SaveCopyButton.css` — neutral `.action-btn` base from `App.css`, accent on hover, filled when on):

```css
/* Neutral outline over .action-btn (App.css); teal on hover, filled when marked. */
.visited-button:hover {
  border-color: var(--accent);
  color: var(--accent-strong);
}
.visited-button--on {
  border-color: var(--accent);
  color: var(--accent-strong);
  cursor: default;
}
```

- [ ] **Step 4: Render VisitedButton in the ActionBar**

In `frontend/src/pages/ItineraryPage/ActionBar/ActionBar.jsx`:

Add the import after line 5 (`import LikeButton ...`):

```jsx
import VisitedButton from '../VisitedButton/VisitedButton.jsx'
```

Add `visited` and `onMarkVisited` to the destructured props (after `onCopy,`):

```jsx
  onDelete,
  onCopy,
  visited,
  onMarkVisited,
```

Render `<VisitedButton>` in BOTH branches (owner and non-owner), right after `<LikeButton .../>` in each. Use the identical form in both:

Owner branch — after `<LikeButton .../>` (line 27):
```jsx
          <VisitedButton visited={visited} onClick={onMarkVisited} />
```

Non-owner branch — after `<LikeButton .../>` (line 33):
```jsx
          <VisitedButton visited={visited} onClick={onMarkVisited} />
```

- [ ] **Step 5: Thread the props through ItineraryPanel**

In `frontend/src/pages/ItineraryPage/ItineraryPanel/ItineraryPanel.jsx`:

Add `visited` and `onMarkVisited` to the destructured props (in the `onDelete, onCopy,` group, line 15):

```jsx
  onDelete, onCopy, onMarkVisited,
```

Add `visited` to the value group on line 12:

```jsx
  liked, bookmarked, likeCount, isPublic, visited,
```

Pass them to `<ActionBar>` (after `onCopy={onCopy}`, line 60):

```jsx
        visited={visited}
        onMarkVisited={onMarkVisited}
```

- [ ] **Step 6: Add visited state + handler + hydration in ItineraryPage**

In `frontend/src/pages/ItineraryPage/ItineraryPage.jsx`:

(a) Import `markVisited` — add to the `from '../../api/itinerary.js'` block (after `updateItinerary,`, line 19):

```jsx
  markVisited,
```

(b) Add state after `likeCount` (line 183):

```jsx
  const [visited, setVisited] = useState(false);
```

(c) Hydrate it in the dashboard `useEffect`, alongside liked/bookmarked (after line 213 `setBookmarked(...)`):

```jsx
            setVisited((me.visitedItineraries ?? []).some((it) => it.id === numId));
```

(d) Add the handler after `toggleBookmark` (after line 299). It's one-way and optimistic: flip the flag, call the backend, revert on failure.

```jsx
  // Mark this itinerary as visited ("I've been here"). One-way for now: no
  // un-mark endpoint. Optimistic — show visited immediately, revert on failure.
  const handleMarkVisited = async () => {
    if (visited) return;
    setVisited(true);
    try {
      await markVisited(id);
    } catch (err) {
      console.error('Mark visited failed, reverting:', err);
      setVisited(false);
      window.alert('Could not mark this as visited. Please try again.');
    }
  };
```

(e) Pass the props to `<ItineraryPanel>` (after `bookmarked={bookmarked}`, line 429):

```jsx
        visited={visited}
```

and after `onToggleBookmark={toggleBookmark}` (line 435):

```jsx
        onMarkVisited={handleMarkVisited}
```

- [ ] **Step 7: Lint + build**

Run: `cd frontend && npm run lint && npm run build`
Expected: lint clean, build succeeds.

- [ ] **Step 8: Manual verify (best-effort, if a dev env is running)**

With backend + frontend running and signed in, open an itinerary detail page, click "I've been here" → button shows "Visited" and disables. Reload → it stays "Visited" (hydrated from the dashboard).

- [ ] **Step 9: Commit**

```bash
cd frontend
git add src/api/itinerary.js src/pages/ItineraryPage/VisitedButton src/pages/ItineraryPage/ActionBar/ActionBar.jsx src/pages/ItineraryPage/ItineraryPanel/ItineraryPanel.jsx src/pages/ItineraryPage/ItineraryPage.jsx
git commit -m "feat: I've-been-here button on ItineraryPage"
```

---

## Task 6: Frontend — Visited carousel on HomePage

**Files:**
- Create: `frontend/src/pages/HomePage/VisitedItinerariesSection/VisitedItinerariesSection.jsx`
- Create: `frontend/src/pages/HomePage/VisitedItinerariesSection/VisitedItinerariesSection.css`
- Modify: `frontend/src/pages/HomePage/HomePage.jsx`

**Interfaces:**
- Consumes: `visitedItineraries` from the dashboard (Task 4); the existing `CardCarousel`, `pool`, `likedIds`/`bookmarkedIds`, `toggleLike`/`toggleBookmark`.
- Produces: a `<VisitedItinerariesSection>` rendered on the dashboard, filtered from `pool` by a `visitedIds` Set.

- [ ] **Step 1: Create the section component**

Create `frontend/src/pages/HomePage/VisitedItinerariesSection/VisitedItinerariesSection.jsx` (a direct mirror of `LikedItinerariesSection.jsx`):

```jsx
import CardCarousel from '../../../components/CardCarousel/CardCarousel.jsx'
import './VisitedItinerariesSection.css'

// The `itineraries` here are already the visited ones (HomePage filtered them).
// The cards keep their like/bookmark hearts (which stay live via the shared
// hook); there is no visited toggle on cards — marking happens on ItineraryPage.
function VisitedItinerariesSection({
  itineraries = [],
  loading = false,
  likedIds,
  bookmarkedIds,
  onToggleLike,
  onToggleBookmark,
}) {
  return (
    <section className="visited-section">
      <CardCarousel
        title="Visited"
        itineraries={itineraries}
        loading={loading}
        emptyMessage="You haven't marked any itineraries as visited yet."
        likedIds={likedIds}
        bookmarkedIds={bookmarkedIds}
        onToggleLike={onToggleLike}
        onToggleBookmark={onToggleBookmark}
      />
    </section>
  );
}

export default VisitedItinerariesSection;
```

- [ ] **Step 2: Create the section CSS**

Create `frontend/src/pages/HomePage/VisitedItinerariesSection/VisitedItinerariesSection.css` (mirrors `LikedItinerariesSection.css`):

```css
.visited-section {
  display: block;
}
```

- [ ] **Step 3: Wire it into HomePage**

In `frontend/src/pages/HomePage/HomePage.jsx`:

(a) Import after `BookmarkedItinerariesSection` (line 5):

```jsx
import VisitedItinerariesSection from './VisitedItinerariesSection/VisitedItinerariesSection.jsx'
```

(b) Add `visitedIds` state after `pool` (line 23):

```jsx
  // Ids the user has marked visited. Plain state (not part of useLikeBookmark)
  // since there's no same-page visited toggle to keep in sync — marking happens
  // on ItineraryPage. Reflects the state fetched on load.
  const [visitedIds, setVisitedIds] = useState(new Set());
```

(c) In the load effect, read visited from the dashboard and fold into the pool. After the `const bookmarked = ...` line (line 70), add:

```jsx
        const visited = me.visitedItineraries ?? [];
        setVisitedIds(new Set(visited.map((it) => it.id)));
```

Update the pool merge (line 77) to include `visited`:

```jsx
        [...explore, ...created, ...liked, ...bookmarked, ...visited].forEach((it) => byId.set(it.id, it));
```

(d) Render the section after `<BookmarkedItinerariesSection>` (after line 125):

```jsx
      <VisitedItinerariesSection
        itineraries={pool.filter((it) => visitedIds.has(it.id))}
        loading={loading}
        likedIds={likedIds}
        bookmarkedIds={bookmarkedIds}
        onToggleLike={toggleLike}
        onToggleBookmark={toggleBookmark}
      />
```

- [ ] **Step 4: Lint + build**

Run: `cd frontend && npm run lint && npm run build`
Expected: lint clean, build succeeds.

- [ ] **Step 5: Manual verify (best-effort)**

Sign in, mark an itinerary visited on its page, return to the dashboard → it appears in the "Visited" carousel. An itinerary you haven't marked does not.

- [ ] **Step 6: Commit**

```bash
cd frontend
git add src/pages/HomePage/VisitedItinerariesSection src/pages/HomePage/HomePage.jsx
git commit -m "feat: Visited carousel on dashboard"
```

---

## Self-Review Notes

- **Spec coverage:** schema (Task 1), backend model+test (Task 2), controller+route (Task 3), dashboard exposure (Task 4), ItineraryPage button (Task 5), dashboard carousel (Task 6). Out-of-scope items (un-mark route/UI, visit counts, card-level toggle) are intentionally excluded.
- **`@updatedAt` idempotency** verified in the Task 2 test (single row + refreshed timestamp).
- **Public-or-owner guard** in `markVisited` matches `likeItinerary` verbatim, preventing private-draft leakage.
- **Frontend file additions** limited to `VisitedButton/` and `VisitedItinerariesSection/`, each mirroring an existing sibling — consistent with `frontend/CLAUDE.md`.
- **Type consistency:** `markVisited(id)` (api) → `handleMarkVisited` → `onMarkVisited` prop → `VisitedButton onClick`; `visited` boolean threaded Page→Panel→ActionBar→Button; `visitedIds` Set on HomePage; `visitedItineraries` array from the backend used in both ItineraryPage hydration and HomePage.
