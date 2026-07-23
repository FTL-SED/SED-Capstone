# Condense preference pills in the Create-Itinerary wizard

**Date:** 2026-07-23
**Status:** Approved (design), pending implementation plan

## Problem

Each member card in the Create-Itinerary wizard renders two undifferentiated
rows of selectable pills: **18 Interests + 26 Food preferences = 44 pills per
member**, multiplied across every group member. The result is a wall of pills
that overwhelms the user. We want to condense the presentation so the first
impression is light, without permanently hiding options.

## Constraints & context

- Pills are rendered by a shared `TagPills` component
  (`frontend/src/components/Inputs/TagPills/TagPills.jsx`), used **only** by
  `MemberCard.jsx`. Blast radius of a `TagPills` change is contained.
- Vocab lives in `frontend/src/api/vocab.js` (`INTEREST_TAGS`, `FOOD_TAGS`),
  mirrored from the backend engine vocab. `buildRequest.js` reads `foodPrefs`
  off the member object, **not** off the vocab lists — so re-splitting the
  vocab is safe for the request payload.
- **No backend popularity data exists.** "Most common" is a curated static
  ordering in the frontend vocab, not a live signal.
- Frontend rule (`frontend/CLAUDE.md`): do not add files/folders beyond what's
  required. This design adds **one test file** (`TagPills.test.js`) and no new
  components.

## Research basis

- **NNG progressive disclosure / accordions:** hiding options behind "View
  more" "diminishes people's awareness of it." For us this has a concrete cost
  — the recommendation engine scores on each member's tags, so an option a
  member never taps because it was hidden weakens their coverage/fairness.
  Mitigation: keep groups shallow, label the toggle with a count, never hide a
  *selected* pill.
- **Material Design** (ChipGroup): the native answer for ~18–26 chips is
  **wrap/group**, not truncate. Truncation patterns (Airbnb ~24-of-500) target
  hundreds of options — an order of magnitude beyond our case. Hence the
  **hybrid**: group first (the real density fix), truncate only within long
  groups.
- **WAI-ARIA Disclosure pattern:** the accessibility contract for "View more"
  — `aria-expanded`, `aria-controls`, Enter/Space, focus stays on the control.

## Design

### Grouping structure (per member card)

| Group | Count | Behavior |
|---|---|---|
| **Interests** | 18 | Show 8, `View more (+N)` reveals the rest |
| **Food · Cuisines** | 19 | Show 8, `View more (+N)` reveals the rest |
| **Food · Dietary** | 7 | Show all — no truncation |

Interests stay a single flat group (they are one conceptual bucket today).
Food splits into **Cuisines** and **Dietary** sub-groups under one
"Food preferences" heading.

### Collapse/expand behavior

- **Collapsed visible set = `union(top-N common, all selected)`.** A selected
  pill in the hidden tail stays visible when collapsed — collapsing never hides
  a choice the user made.
- **The `+N` count = still-hidden *unselected* remainder only**, so it stays
  truthful. If the user selects a pill from the expanded list then collapses,
  it remains shown (now in the "selected" set) and the visible count may exceed
  N. Intended, not a bug.
- Groups with `count >= options.length` (e.g. Dietary) render every pill and no
  toggle.

### "View more" affordance

- An **inline ghost pill** placed as the last item in the row (after the Nth
  visible pill), participating in the same flex-wrap flow.
- Idle style: transparent background, `--accent` (sunset orange) text, dashed /
  lighter border, `--radius-pill`, no shadow. Visually distinct from both
  unselected pills (cream surface, grey text) and selected pills (solid orange
  fill). **Solid orange fill stays reserved for the selected state** so
  "selected" and "reveal more" never look alike.
- Hover reuses the existing pill hover (border → `--accent`, text →
  `--accent-strong`); never fills solid.
- Label: collapsed → `View more (+N)`; expanded → `View less`.

### Accessibility

- Real `<button>`; Enter/Space toggle (pills already do).
- `aria-expanded` (false/true) + `aria-controls` → id of the hidden-pills
  container.
- Accessible name carries the count and group, e.g. `View 10 more interests` /
  `View less`. The visible `+10` may be decorative.
- Revealed pills sit in a region with `aria-live="polite"` so the growth is
  announced; focus stays on the control (now "View less") on expand, and
  returns to the control on collapse if focus was on a now-hidden pill.
- `:focus-visible` outline matches existing pills (`2px solid --accent`, offset
  `2px`).
- Touch target ≥ 44×44px for the control (and ideally the pills).

### Animation

- Reveal: **200ms ease-out**, matching the existing pill transition. Animate the
  revealed group as a whole (opacity + small translate-Y or height reveal), not
  per-pill.
- `@media (prefers-reduced-motion: reduce)` → instant show/hide, no transform.
  The interaction is a pure show/hide of existing DOM, so it works with motion
  off.

### "Most common" ordering (curated, static)

Front-load broadly-appealing tags so the visible-8 is the high-probability set.

- **Interests (first 8):** art, museum, history, nature, scenic_views, music,
  shopping, walking
- **Cuisines (first 8):** mexican, italian, sushi, thai, chinese, american,
  pizza, indian
- **Dietary:** all shown; no ordering pressure.

## Files touched

- `frontend/src/api/vocab.js` — split `FOOD_TAGS` into `CUISINE_TAGS` +
  `DIET_TAGS`; order `INTEREST_TAGS` / `CUISINE_TAGS` by commonness. (Verify
  no other consumer of `FOOD_TAGS` before removing it; `MemberCard` is the only
  known one.)
- `frontend/src/components/Inputs/TagPills/TagPills.jsx` + `.css` — add an
  optional `collapsedCount` prop and the disclosure control. **Omitting the
  prop preserves today's behavior exactly** (show all, no toggle) — so any
  future/other use is unaffected, and Dietary passes no count.
- `frontend/src/pages/CreateItineraryPage/MemberCard/MemberCard.jsx` — render
  Interests (one `TagPills`, count 8); a "Food preferences" heading with
  **Cuisines** (count 8) and **Dietary** (no count) sub-groups.

## Testing

- Add `frontend/src/components/Inputs/TagPills/TagPills.test.js` (first test for
  this component) covering:
  - Collapsed shows `collapsedCount` pills + the toggle; expand reveals all.
  - **Selected-stays-visible:** a selected pill outside the top-N is shown even
    when collapsed; the `+N` count excludes it.
  - No toggle when `collapsedCount >= options.length` or prop omitted.
  - Toggle carries `aria-expanded` / `aria-controls`.
- Confirm existing `buildRequest.test.js` still passes (payload shape unchanged).
- `npm run lint` + `npm run build` clean.

## Out of scope

- A shared `GET /tags` endpoint / live popularity signal (still an optional
  backend follow-up noted in `vocab.js`).
- Restructuring interests into sub-groups (kept as one flat group per decision).
- Any change to the recommendation engine or backend vocab.
