# Export Modal UI Refresh

**Date:** 2026-07-30
**Branch:** semir-export-itinerary
**Builds on:** `2026-07-29-export-itinerary-modal-redesign-design.md` (which defined the
modal's structure and behavior). This spec is a **visual-only** follow-up.

## Problem

The Export modal (`frontend/src/pages/ItineraryPage/ExportModal/`) works, but its styling
doesn't match NavQuest. `ExportModal.css` uses a hardcoded olive/cream palette
(`#33402a`, `#f6efe1`, `#6e6656`, `#33402a` chips) that appears nowhere else in the app.
The real design system (`frontend/src/App.css`) is a navy/slate/white surface with a single
**teal** accent (`--accent: #0d9488`). The modal is also capped at `max-width: 420px`, so on
a larger screen it reads as a cramped phone form.

## Goals

1. Recolor the modal to the site's design tokens so it visually belongs to NavQuest.
2. Increase the modal size for readability on larger screens (single-column layout kept).
3. Add light polish the other modals have (focus rings, hover states, gentle fade-in),
   respecting the site's reduced-motion convention.
4. Keep it mobile-accessible — collapse cleanly at the site's `640px` breakpoint.

## Non-goals

- **No behavior, state, API, or markup-structure changes.** Chip add/remove, email
  validation, the send flow, the clipboard-copy fallback, and all close paths (backdrop, X,
  Escape, post-send) stay exactly as they are in `ExportModal.jsx`.
- No two-column / preview-panel layout — single column, just roomier.
- No new files. `frontend/CLAUDE.md` requires following the existing structure; this touches
  only `ExportModal.css`.

## Changes (all in `ExportModal.css`)

### 1. Palette → design tokens
Replace hardcoded colors with `App.css` variables:
- Title: `var(--ink)`. Subtitle & status: `var(--slate-500)`.
- Chip: background `var(--accent-soft)`, text `var(--accent-strong)` (was cream/olive).
  Chip-remove: `var(--accent-strong)`, darker on hover.
- Chip container border: `var(--border)`.
- Send button: `var(--accent)` background / white text; hover `var(--accent-strong)`
  (was dark olive `#33402a`).
- Copy button: keeps the outline style but uses `var(--border)` / `var(--ink)`;
  hover `var(--surface-muted)`.
- Hint: `var(--danger)` (was `#b3261e`).
- Close (X): `var(--slate-400)` → `var(--ink)` on hover.

### 2. Size (large screens)
- `max-width: 420px → 560px`.
- Card padding: `24px 20px 16px → 32px 32px 24px`.
- Title: `1.2rem → 1.5rem`. Subtitle & inputs bumped ~one step
  (subtitle `0.9 → 0.95rem`, input/buttons `0.9–0.95 → 1rem`).
- Chip container `min-height: 44px → 56px`; chip/input padding bumped to match.

### 3. Light polish
- Focus ring on the chip container when the input inside is focused:
  `border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft);` — mirrors the
  field-focus pattern already used in `App.css`. Implemented with `:focus-within`.
- Hover states on Send, Copy, and chip-remove.
- Subtle fade/scale-in on the backdrop and card, wrapped in
  `@media (prefers-reduced-motion: no-preference)` so it honors the site's existing
  reduced-motion convention (present elsewhere in the app's CSS).

### 4. Mobile (`@media (max-width: 640px)` — the site's breakpoint)
- Card padding back to ~`20px 16px`; title ~`1.25rem`.
- Backdrop already has `padding: 16px` + card `width: 100%`, so the card never touches the
  screen edges and the wider desktop sizing collapses cleanly.

## Testing

Manual only (the frontend has no test harness):
- Desktop: modal is visibly larger and uses teal/slate, not olive/cream.
- Focus the email input → accent focus ring on the chip container.
- Hover Send / Copy / a chip's × → visible hover feedback.
- Narrow the window below 640px → padding/type shrink, no horizontal overflow, card stays
  inset from the edges.
- Chip add (Enter/comma), removal, send, and copy still behave exactly as before.
- With OS "reduce motion" on, no fade/scale animation plays.
