# Condense Preference Pills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Condense the Create-Itinerary wizard's per-member Interests + Food pills (44 pills/member) into grouped sections that show the most-common options first with an accessible per-group "View more" disclosure.

**Architecture:** Extract the collapse/selected-visible logic into a pure helper (`pillView.js`) so it's unit-testable under the repo's `node --test` runner (which can't parse JSX). `TagPills.jsx` gains an optional `collapsedCount` prop and renders the pure helper's output plus a WAI-ARIA disclosure toggle; when the prop is omitted it behaves exactly as today. `vocab.js` splits `FOOD_TAGS` into ordered `CUISINE_TAGS` + `DIET_TAGS` and reorders `INTEREST_TAGS` by commonness. `MemberCard.jsx` renders Interests (collapsed to 8), and a Food section with Cuisines (collapsed to 8) + Dietary (all shown), keeping the member's `foodPrefs` a single flat array so the request payload is unchanged.

**Tech Stack:** React 19 (Vite), `node --test` for pure-logic tests, plain CSS with the app's golden-hour tokens.

## Global Constraints

- **No new dependencies.** Tests use Node's built-in `node:test` + `node:assert/strict` (runner: `npm test` → `node --test`). No jsdom / RTL / jest.
- **`node --test` cannot parse JSX** — any file imported by a test must be plain `.js` with no JSX.
- **No new files/folders beyond what this plan lists** (`frontend/CLAUDE.md`).
- **Do not commit unless the user asks** (`.claude/rules/git.md`). Each task ends by staging + committing ONLY per the user's later go-ahead; the commit steps below are written so the human/executor can run them, but the default is to leave changes staged. If the executor is authorized to commit, use the messages given (no `Co-Authored-By` trailer, imperative subject ≤50 chars).
- **The member model stays `{ name, location, interestTags, foodPrefs }`** — `foodPrefs` remains one flat `string[]`. `buildRequest.js` and `buildRequest.test.js` must not need changes.
- **Verify each task with:** `cd frontend && npm test && npm run lint && npm run build` — all clean.
- **Warm identity:** selected pill = solid `--accent` (sunset orange) fill; the "View more" control must be a ghost/dashed pill (transparent, orange text) so it never looks selected.

---

### Task 1: Pure collapse/selection helper + tests

**Files:**
- Create: `frontend/src/components/Inputs/TagPills/pillView.js`
- Test: `frontend/src/components/Inputs/TagPills/pillView.test.js`

**Interfaces:**
- Produces: `computePillView({ options, selected, collapsedCount })` → `{ alwaysVisible: string[], overflow: string[], hasToggle: boolean }`.
  - `alwaysVisible`: pills rendered in both states = the first `collapsedCount` options, plus any *selected* option beyond that cutoff (pinned so a selection is never hidden), in original `options` order.
  - `overflow`: the remaining options, shown only when expanded (disjoint from `alwaysVisible`; union of the two = `options`).
  - `hasToggle`: whether a View more/less control is needed (`overflow.length > 0`).
  - When `collapsedCount` is `null`/`undefined` or `>= options.length`: `{ alwaysVisible: options, overflow: [], hasToggle: false }`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/Inputs/TagPills/pillView.test.js`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { computePillView } from './pillView.js'

const OPTS = ['a', 'b', 'c', 'd', 'e'] // 5 options

test('no collapsedCount shows everything, no toggle', () => {
  const v = computePillView({ options: OPTS, selected: [], collapsedCount: undefined })
  assert.deepEqual(v.alwaysVisible, OPTS)
  assert.deepEqual(v.overflow, [])
  assert.equal(v.hasToggle, false)
})

test('collapsedCount >= length shows everything, no toggle', () => {
  const v = computePillView({ options: OPTS, selected: [], collapsedCount: 5 })
  assert.deepEqual(v.alwaysVisible, OPTS)
  assert.equal(v.hasToggle, false)
})

test('collapsed with none selected shows first N and overflows the rest', () => {
  const v = computePillView({ options: OPTS, selected: [], collapsedCount: 2 })
  assert.deepEqual(v.alwaysVisible, ['a', 'b'])
  assert.deepEqual(v.overflow, ['c', 'd', 'e'])
  assert.equal(v.hasToggle, true)
})

test('a selected pill beyond the cutoff is pinned into alwaysVisible', () => {
  const v = computePillView({ options: OPTS, selected: ['d'], collapsedCount: 2 })
  assert.deepEqual(v.alwaysVisible, ['a', 'b', 'd']) // top-2 + pinned selected, in options order
  assert.deepEqual(v.overflow, ['c', 'e'])           // still-hidden = unselected remainder
  assert.equal(v.hasToggle, true)
})

test('when every overflow option is selected, nothing is hidden and no toggle', () => {
  const v = computePillView({ options: OPTS, selected: ['c', 'd', 'e'], collapsedCount: 2 })
  assert.deepEqual(v.alwaysVisible, OPTS)
  assert.deepEqual(v.overflow, [])
  assert.equal(v.hasToggle, false)
})

test('selected pills already within the cutoff are not duplicated', () => {
  const v = computePillView({ options: OPTS, selected: ['a'], collapsedCount: 2 })
  assert.deepEqual(v.alwaysVisible, ['a', 'b'])
  assert.deepEqual(v.overflow, ['c', 'd', 'e'])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test`
Expected: FAIL — `Cannot find module './pillView.js'` (or `computePillView is not a function`).

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/components/Inputs/TagPills/pillView.js`:

```js
// Pure logic for TagPills' collapse/expand behavior, split out so it can be
// unit-tested under `node --test` (which can't parse the .jsx component).
//
// Rule: collapsing must never hide a pill the user already selected. The
// collapsed view = the first `collapsedCount` options PLUS any selected option
// past that cutoff (pinned), in original order. `overflow` (shown only when
// expanded) is the still-hidden remainder — always unselected, so the "+N"
// count stays truthful.
export function computePillView({ options = [], selected = [], collapsedCount }) {
  const truncates =
    collapsedCount != null && collapsedCount < options.length
  if (!truncates) {
    return { alwaysVisible: options, overflow: [], hasToggle: false }
  }

  const top = options.slice(0, collapsedCount)
  const topSet = new Set(top)
  const pinned = options.filter(
    (o) => !topSet.has(o) && selected.includes(o)
  )
  const alwaysVisible = [...top, ...pinned]
  const visibleSet = new Set(alwaysVisible)
  const overflow = options.filter((o) => !visibleSet.has(o))

  return { alwaysVisible, overflow, hasToggle: overflow.length > 0 }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test`
Expected: PASS — all `pillView.test.js` tests green, plus the existing `buildRequest`/`buildDiscoverParams` tests still pass.

- [ ] **Step 5: Commit (only if authorized)**

```bash
git add frontend/src/components/Inputs/TagPills/pillView.js \
        frontend/src/components/Inputs/TagPills/pillView.test.js
git commit -m "Add pure collapse logic helper for TagPills"
```

---

### Task 2: TagPills disclosure UI

**Files:**
- Modify: `frontend/src/components/Inputs/TagPills/TagPills.jsx`
- Modify: `frontend/src/components/Inputs/TagPills/TagPills.css`

**Interfaces:**
- Consumes: `computePillView` from Task 1.
- Produces: `<TagPills options selected onChange collapsedCount? groupLabel? />`.
  - New optional props: `collapsedCount` (number — omit to show all, current behavior) and `groupLabel` (string used in the toggle's visible text, e.g. `"interests"`; defaults to `"options"`).
  - Backward compatible: omitting `collapsedCount` renders every pill with no toggle, exactly as today.

- [ ] **Step 1: Replace the component implementation**

Replace the entire contents of `frontend/src/components/Inputs/TagPills/TagPills.jsx` with:

```jsx
import { useId, useState } from 'react'
import './TagPills.css'
import { computePillView } from './pillView.js'

// Click-to-toggle pills for choosing from a fixed set of options (e.g. the
// engine's interest/food vocab). Clearer and more discoverable than a dropdown:
// every option is visible and selection is one tap.
//   options:        string[] of choices
//   selected:       string[] currently chosen
//   onChange:       (nextSelected) => void
//   collapsedCount: optional — show only this many pills initially, with a
//                   "View more" disclosure for the rest. Omit to show all.
//   groupLabel:     optional noun for the toggle's label ("interests", ...).
// Collapsing never hides a selected pill (see pillView.js).
function TagPills({ options = [], selected = [], onChange, collapsedCount, groupLabel = 'options' }) {
  const [expanded, setExpanded] = useState(false)
  const regionId = useId()

  const toggle = (option) => {
    const isOn = selected.includes(option)
    onChange(isOn ? selected.filter((o) => o !== option) : [...selected, option])
  }

  const { alwaysVisible, overflow, hasToggle } = computePillView({
    options,
    selected,
    collapsedCount,
  })

  const renderPill = (option) => {
    const isOn = selected.includes(option)
    return (
      <button
        key={option}
        type="button"
        className={`tag-pill${isOn ? ' tag-pill--on' : ''}`}
        aria-pressed={isOn}
        onClick={() => toggle(option)}
      >
        {option}
      </button>
    )
  }

  return (
    <div className="tag-pills" role="group">
      {alwaysVisible.map(renderPill)}

      {hasToggle && (
        <button
          type="button"
          className="tag-pill tag-pill--more"
          aria-expanded={expanded}
          aria-controls={regionId}
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? 'View less' : `View more (+${overflow.length})`}
        </button>
      )}

      {hasToggle && (
        <div
          id={regionId}
          className="tag-pills__overflow"
          hidden={!expanded}
          aria-live="polite"
          aria-label={`More ${groupLabel}`}
        >
          {overflow.map(renderPill)}
        </div>
      )}
    </div>
  )
}

export default TagPills
```

- [ ] **Step 2: Add the styles**

Append to `frontend/src/components/Inputs/TagPills/TagPills.css`:

```css
/* "View more / View less" disclosure — a ghost/dashed pill so it never reads as
   selectable content or a selected pill (solid orange is reserved for --on). */
.tag-pill--more {
  background: transparent;
  border-style: dashed;
  border-color: var(--border-strong, #cbd5e1);
  color: var(--accent, #0d9488);
  font-weight: 600;
  /* Meets the 44px touch-target minimum for the new control. */
  min-height: 44px;
}

.tag-pill--more:hover {
  background: transparent;
  border-color: var(--accent, #0d9488);
  color: var(--accent-strong, #0f766e);
}

/* Revealed overflow pills break to their own full-width line below the toggle
   and wrap like the main row. The [hidden] override is required because this
   rule sets display:flex, which would otherwise beat the UA `[hidden]` rule. */
.tag-pills__overflow {
  flex-basis: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.4rem;
}

.tag-pills__overflow[hidden] {
  display: none;
}

/* Gentle reveal — enhancement only; reduced-motion users get an instant show. */
@media (prefers-reduced-motion: no-preference) {
  .tag-pills__overflow:not([hidden]) .tag-pill {
    animation: tag-pills-reveal 200ms ease-out both;
  }

  @keyframes tag-pills-reveal {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
}
```

- [ ] **Step 3: Verify build + lint (no test — component is not unit-tested)**

Run: `cd frontend && npm run lint && npm run build`
Expected: lint clean; build succeeds. (`npm test` still green from Task 1 — the component itself has no test, matching every other component in this repo.)

- [ ] **Step 4: Commit (only if authorized)**

```bash
git add frontend/src/components/Inputs/TagPills/TagPills.jsx \
        frontend/src/components/Inputs/TagPills/TagPills.css
git commit -m "Add View more disclosure to TagPills"
```

---

### Task 3: Split vocab + group the MemberCard pills

**Files:**
- Modify: `frontend/src/api/vocab.js`
- Modify: `frontend/src/pages/CreateItineraryPage/MemberCard/MemberCard.jsx`
- Modify: `frontend/src/pages/CreateItineraryPage/MemberCard/MemberCard.css`

**Interfaces:**
- Consumes: `TagPills` with `collapsedCount` + `groupLabel` (Task 2).
- Produces: `vocab.js` exports `INTEREST_TAGS` (reordered), `CUISINE_TAGS` (new), `DIET_TAGS` (new). `FOOD_TAGS` is removed — its only consumer is `MemberCard`, updated in this same task so no commit is left broken. `INTEREST_TAGS`' other consumer (`DiscoverPage/FilterControls.jsx`) only maps the array, so reordering needs no change there.

- [ ] **Step 1: Rewrite the vocab**

Replace the two export blocks in `frontend/src/api/vocab.js` (keep the file's header comment). The interest list stays 18 items and the cuisine+diet lists stay 26 total — only order and grouping change. Most-common items are front-loaded so the collapsed view is the high-probability set.

```js
// Interests / activity tags (from the catalog's non-food tags). Ordered so the
// most broadly-appealing options come first (the wizard shows the first 8 by
// default). Also consumed by DiscoverPage/FilterControls (order only).
export const INTEREST_TAGS = [
  'art', 'museum', 'history', 'nature', 'scenic_views', 'music', 'shopping', 'walking',
  'architecture', 'landmark', 'photography', 'garden', 'hiking', 'beach', 'sunset',
  'relaxing', 'entertainment', 'indoor',
]

// Cuisines a place can serve (backend CUISINE_TAGS), most-common first.
export const CUISINE_TAGS = [
  'mexican', 'italian', 'sushi', 'thai', 'chinese', 'american', 'pizza', 'indian',
  'japanese', 'french', 'mediterranean', 'vietnamese', 'korean', 'bbq', 'seafood',
  'ramen', 'noodles', 'steak', 'burgers',
]

// Dietary needs a place can accommodate (backend DIET_TAGS). Short list — the
// wizard shows all of these with no "View more".
export const DIET_TAGS = [
  'vegan', 'vegetarian', 'gluten-free', 'halal', 'kosher', 'dairy-free', 'pescatarian',
]
```

- [ ] **Step 2: Rewrite MemberCard**

Replace the entire contents of `frontend/src/pages/CreateItineraryPage/MemberCard/MemberCard.jsx` with:

```jsx
import './MemberCard.css'
import TextInput from '../../../components/Inputs/TextInput/TextInput.jsx'
import AddressPicker from '../../../components/Inputs/AddressPicker/AddressPicker.jsx'
import TagPills from '../../../components/Inputs/TagPills/TagPills.jsx'
import { INTEREST_TAGS, CUISINE_TAGS, DIET_TAGS } from '../../../api/vocab.js'

// How many pills each long group shows before "View more".
const COLLAPSED = 8

// One member's inputs: name, a single starting location, and their interests +
// food prefs. `member` is { name, location, interestTags, foodPrefs };
// `onChange(next)` replaces the whole member object. foodPrefs stays a single
// flat array (cuisines + diets) so the request payload is unchanged — the two
// food groups below just edit disjoint slices of that one array.
function MemberCard({ index, member, onChange, onRemove }) {
  const set = (field, value) => onChange({ ...member, [field]: value });

  const cuisineSel = member.foodPrefs.filter((t) => CUISINE_TAGS.includes(t));
  const dietSel = member.foodPrefs.filter((t) => DIET_TAGS.includes(t));

  return (
    <div className="member-card">
      <div className="member-card__header">
        <h3>Member {index + 1}</h3>
        {onRemove && (
          <button type="button" className="member-card__remove" onClick={onRemove}>
            Remove
          </button>
        )}
      </div>

      <TextInput
        placeholder="Name"
        value={member.name}
        onChange={(e) => set('name', e.target.value)}
      />

      <label className="member-card__label">Starting location</label>
      <AddressPicker
        placeholder="Enter this member's starting location"
        value={member.location}
        onChange={(loc) => set('location', loc)}
      />

      <label className="member-card__label">Interests</label>
      <TagPills
        options={INTEREST_TAGS}
        selected={member.interestTags}
        onChange={(next) => set('interestTags', next)}
        collapsedCount={COLLAPSED}
        groupLabel="interests"
      />

      <label className="member-card__label">Food preferences</label>
      <span className="member-card__sublabel">Cuisines</span>
      <TagPills
        options={CUISINE_TAGS}
        selected={cuisineSel}
        onChange={(next) => set('foodPrefs', [...next, ...dietSel])}
        collapsedCount={COLLAPSED}
        groupLabel="cuisines"
      />
      <span className="member-card__sublabel">Dietary</span>
      <TagPills
        options={DIET_TAGS}
        selected={dietSel}
        onChange={(next) => set('foodPrefs', [...cuisineSel, ...next])}
        groupLabel="dietary needs"
      />
    </div>
  );
}

export default MemberCard;
```

- [ ] **Step 3: Add the sub-label style**

Append to `frontend/src/pages/CreateItineraryPage/MemberCard/MemberCard.css`:

```css
/* Sub-group caption under the "Food preferences" label (Cuisines / Dietary).
   Quieter than .member-card__label so it reads as a subdivision, not a new field. */
.member-card__sublabel {
  display: block;
  margin: 0.5rem 0 0.3rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--slate-500, #6e6656);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
```

- [ ] **Step 4: Verify the full suite**

Run: `cd frontend && npm test && npm run lint && npm run build`
Expected:
- `npm test`: all green — including the unchanged `buildRequest.test.js` (member model + payload shape unchanged).
- `npm run lint`: clean (no lingering `FOOD_TAGS` import anywhere — verify with `rg "FOOD_TAGS" frontend/src` → no results).
- `npm run build`: succeeds.

- [ ] **Step 5: Commit (only if authorized)**

```bash
git add frontend/src/api/vocab.js \
        frontend/src/pages/CreateItineraryPage/MemberCard/MemberCard.jsx \
        frontend/src/pages/CreateItineraryPage/MemberCard/MemberCard.css
git commit -m "Group and collapse member preference pills"
```

---

## Manual verification (after all tasks)

Drive the real UI (the honest check beyond lint/build):

1. `cd frontend && npm run dev`, open the Create flow → Members step.
2. Interests shows 8 pills + `View more (+10)`. Cuisines shows 8 + `View more (+11)`. Dietary shows all 7, no toggle.
3. Click `View more` → the rest reveal below with a subtle fade; label flips to `View less`; collapse hides them again.
4. Select a pill from the expanded Cuisines set (e.g. `ramen`), then `View less` → `ramen` stays visible (pinned) and the count drops to `(+10)`.
5. Keyboard: Tab to `View more`, press Enter/Space to toggle; focus ring visible; `aria-expanded` flips (check in devtools).
6. Add a second member → same behavior, independent expand state per group (distinct `useId` regions).
7. Finish the wizard and confirm the request still carries `foodPrefs` as a flat array of the chosen cuisines + diets (Network tab → `POST /recommendations`).

## Notes / out of scope

- Existing pills keep their current height; only the new "View more" control is bumped to the 44px touch-target minimum. Resizing every pill globally is a larger visual change than the approved design called for — left as a possible follow-up.
- No `GET /tags` endpoint / live popularity signal — "most common" is the curated static order above (unchanged decision from the spec).
