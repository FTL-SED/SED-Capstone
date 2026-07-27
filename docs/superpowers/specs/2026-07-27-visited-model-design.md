# Visited model + "I've been here" — design

**Date:** 2026-07-27
**Status:** Approved (design), pending spec review
**Scope:** Full stack — Prisma model + migration, backend model/controller/routes, dashboard API, frontend toggle + carousel.

## Goal

Let a signed-in user mark an itinerary they've actually used ("I've been here"),
and browse the itineraries they've marked in a "Visited" carousel on their
dashboard. Marking is deliberate and explicit — one button on the itinerary
detail page, not a passive view-tracker.

## Data model

A new `Visited` join table sits beside `Like` and `Bookmark`. It is a
many-to-many between `User` and `Itinerary`, keyed on the pair so a user has at
most one Visited row per itinerary. Unlike `Like`/`Bookmark`, its timestamp is
updatable: re-visiting refreshes `visitedAt` (the "track most-recent visit"
choice).

```prisma
model Visited {
  userId      Int
  itineraryId Int
  visitedAt   DateTime  @default(now()) @updatedAt
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  itinerary   Itinerary @relation(fields: [itineraryId], references: [id], onDelete: Cascade)

  @@id([userId, itineraryId])
  // Composite PK is ordered by userId, so an itineraryId-only lookup can't use
  // it. Mirrors the Like index; backs cascade delete from Itinerary.
  @@index([itineraryId])
}
```

Back-relations added:
- `User`: `visited Visited[]`
- `Itinerary`: `visited Visited[]`

`@updatedAt` means a plain `upsert` with `update: {}` still bumps `visitedAt` on
re-visit — Prisma writes the `@updatedAt` field on every update, including no-op
updates.

### Migration (shared DB — handle with care)

The Supabase Postgres is shared across the team (see root `CLAUDE.md`).

- `git pull` before generating the migration.
- The migration is **purely additive**: it creates the `Visited` table and its
  index only. It does not alter `User`, `Itinerary`, `Like`, or `Bookmark`
  (adding a Prisma back-relation field emits no SQL — relations are virtual).
- Generate with `prisma migrate dev --name add_visited`, commit the generated
  `prisma/migrations/<name>/` folder alongside the `schema.prisma` change.
- **Never** `migrate reset` / `db push --force-reset`. Ask the user before
  running the migration against the shared DB.

## Backend

Mirrors the `Like` flow (public-or-owner guard, idempotent upsert).

**`models/visited.js`** (new) — thin data-access wrapper, no business logic, no
`req`/`res`:
- `upsert(userId, itineraryId)` — `prisma.visited.upsert` with
  `where: { userId_itineraryId }`, `create: { userId, itineraryId }`,
  `update: {}`. The `@updatedAt` refreshes `visitedAt`.
- `remove(userId, itineraryId)` — `deleteMany` (idempotent), for symmetry with
  `likes`/`bookmarks`.

**`controllers/itineraryController.js`** — `markVisited(req, res)`:
- `parseIdParam` → `loadOrNotFound(res, itineraries.findByIdBasic, id, 'Itinerary')`.
- Public-or-owner guard, identical to `likeItinerary`: a private itinerary can
  only be marked visited by its owner (`!isPublic && userId !== req.user.id → 403`),
  so a private draft can't leak into a stranger's dashboard.
- `await visited.upsert(req.user.id, id)` → `204 No Content` (matches
  `bookmarkItinerary`, which also returns 204).
- Exported in the controller's export list.

**`routes/itineraryRoutes.js`** — `router.post('/:id/visited', requireAuth, markVisited)`.
Import `markVisited` from the controller. (No DELETE route in this scope — the
toggle-off behavior is deferred; see Out of scope.)

**`models/users.js`** — add `visited` to `findDashboardById`'s include, mirroring
`bookmarks`/`likes`:
`visited: { include: { itinerary: { include: dashboardItineraryInclude } } }`.

**`controllers/userController.js`** — in `getUser`'s response, add
`visitedItineraries: user.visited.map((v) => reshapeItinerary(v.itinerary, { forOwner: false }))`.
These are other people's public itineraries, so `forOwner: false` strips
owner-only fields (members, meeting point) — same as liked/bookmarked.

## Frontend

**Marking lives ONLY on ItineraryPage. Browsing lives ONLY on the dashboard.**

**`api/itinerary.js`** — add `markVisited(id)` → `await api.post('/itineraries/${id}/visited')`
(no return body; 204).

**`pages/ItineraryPage/ItineraryPage.jsx`** — an "I've been here" toggle button.
On click it calls `markVisited(id)` and reflects marked state. Initial marked
state: on mount, the page fetches the user's dashboard (existing
`getUserDashboard`) and checks whether this itinerary's id is in
`visitedItineraries`; after a successful `markVisited` call the button flips to
the marked state locally (no refetch). This is the only place a visit is
recorded.

**`pages/HomePage/VisitedItinerariesSection/`** (new folder — `.jsx` + `.css`) —
a direct mirror of `LikedItinerariesSection`. Wraps the shared `CardCarousel`
with `title="Visited"` and `emptyMessage="You haven't marked any itineraries as
visited yet."`. It passes `likedIds`/`bookmarkedIds`/`onToggleLike`/`onToggleBookmark`
through so the cards' like/bookmark hearts render and stay live — there is **no**
visited toggle on the cards.

> Frontend "no extra files" rule (`frontend/CLAUDE.md`): this new folder is
> explicitly required by this spec and mirrors the existing
> `LikedItinerariesSection`/`BookmarkedItinerariesSection` pattern exactly. Only
> the `.jsx` + `.css` pair is added — nothing else.

**`pages/HomePage/HomePage.jsx`**:
- After fetching the dashboard, read `me.visitedItineraries ?? []`.
- Track `visitedIds` as a `Set` of those ids (plain state — not part of the
  `useLikeBookmark` hook, since there's no same-page toggle to keep in sync).
- Fold the visited itineraries into the existing deduped `pool` (so a visited
  itinerary outside the Explore top-10 still renders).
- Render `<VisitedItinerariesSection itineraries={pool.filter((it) => visitedIds.has(it.id))} loading={loading} likedIds={likedIds} bookmarkedIds={bookmarkedIds} onToggleLike={toggleLike} onToggleBookmark={toggleBookmark} />`
  after the Bookmarked section.

### Live-sync note

Liked/Bookmarked carousels update live because clicking a card's heart flows
through the shared `useLikeBookmark` hook. Visits are marked only on
ItineraryPage, so the Visited carousel has no same-page control to sync with —
it reflects the state fetched on load, which is correct and expected. The like/
bookmark hearts on Visited cards remain live as usual.

## Testing

- **Backend** — a co-located test for the Visited model/controller flow,
  following `models/itineraries.test.js`:
  - `upsert` is idempotent (calling twice keeps one row) and refreshes
    `visitedAt` on the second call.
  - `markVisited` returns 204 for a public itinerary.
  - Public-or-owner guard: marking another user's private itinerary → 403.
- **Frontend** — lint + build clean (matches the project's existing verification
  bar; no component test harness in the frontend today).

## Out of scope (deferred)

- **Un-marking / toggle-off persistence.** `models/visited.remove` exists for
  symmetry, but no `DELETE /:id/visited` route or un-mark UI is wired in this
  pass. The ItineraryPage button marks (and shows marked state); removing a visit
  is a follow-up.
- **Visited count / visit history.** The design tracks most-recent visit only
  (one row per pair), not a count or per-visit log.
- **Card-level visited toggle** on Explore/carousel cards — intentionally
  excluded; marking is ItineraryPage-only.
