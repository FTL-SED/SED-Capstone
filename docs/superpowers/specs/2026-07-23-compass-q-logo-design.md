# Compass-Q "NavQuest" Logo

**Date:** 2026-07-23
**Scope:** Navbar wordmark only.

## Goal

Replace the plain text "NavQuest" in the navbar with a wordmark where the letter
**Q** is a compass with a tail. The compass reuses the *exact* design already
shipped in `LoadingSpinner` (cream dial, two-tone needle, moss-emphasized north
tick, moss-deep hub) — matching the reference `image.png`.

## Files touched

- `frontend/src/components/Navbar/Logo/Logo.jsx`
- `frontend/src/components/Navbar/Logo/Logo.css`

No new files, no other components (per `frontend/CLAUDE.md`: navbar only).

## Structure

Inside the existing `<Link to="/" className="logo">`, the wordmark becomes three
pieces so it still reads and selects as "NavQuest":

```
Nav  [inline SVG compass = Q]  uest
```

- Text stays real text (`Nav` + `uest`) — selectable, and the surrounding `h3`
  keeps its type styling.
- The SVG is `aria-hidden="true"`; the `<Link>` gets `aria-label="NavQuest home"`
  so assistive tech announces the full name.

## The compass glyph (identical to LoadingSpinner)

Same `viewBox="0 0 100 100"` markup as `LoadingSpinner.jsx`, minus the spin:

- **Dial face** — `rgba(255,255,255,0.82)` fill, `r=45`.
- **Bezel ring** — `--border-strong`, stroke-width 3.
- **Cardinal ticks** — `--slate-400`, with the north tick emphasized in `--moss`.
- **Needle** — north half `--accent-strong` (sunset orange), south half `--stone`.
- **Hub** — `--moss-deep`.

### Tail

The **south needle extends past the ring on a diagonal toward the lower-right**,
so the Q's tail *is* the needle's south point. Achieved by lengthening the south
polygon beyond `r=45` (and rotating the needle group slightly clockwise so the
tail lands at the ~4–5 o'clock position, where a Q tail sits).

## Sizing & placement

- SVG height ≈ `1em`, vertically centered on the text baseline via
  `vertical-align`, so it reads as a letter, not an icon.
- Static — **no animation**. This is a wordmark, not the loader.
- All colors via existing CSS vars, so it stays on-theme in the cream navbar.

## Non-goals

- Hero heading, footer, auth cards, favicon — unchanged.
- No animation library, no new assets.
