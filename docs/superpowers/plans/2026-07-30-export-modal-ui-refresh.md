# Export Modal UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Export modal to use NavQuest's design tokens, enlarge it for big screens, and add light polish — while staying mobile-accessible.

**Architecture:** Pure CSS change in a single file. Replace the hardcoded olive/cream palette with `App.css` design-system variables, bump sizing for desktop, add focus/hover/motion polish, and add a 640px mobile breakpoint. No JS, markup, or behavior changes.

**Tech Stack:** Plain CSS with CSS custom properties (design tokens defined in `frontend/src/App.css`), consumed by `ExportModal.css`. React app (Vite) — verified by running the dev server, no test harness.

## Global Constraints

- **Only touch `frontend/src/pages/ItineraryPage/ExportModal/ExportModal.css`.** `frontend/CLAUDE.md` forbids adding/renaming/moving files beyond what the spec requires; this spec requires none.
- **No behavior/markup/state/API changes.** `ExportModal.jsx` is not edited. All existing class names must be preserved (the CSS keys off them).
- **Use design tokens, not hardcoded colors.** Pull from `frontend/src/App.css` `:root`: `--ink`, `--slate-500`, `--slate-400`, `--border`, `--surface`, `--surface-muted`, `--accent`, `--accent-strong`, `--accent-soft`, `--danger`, `--radius`, `--shadow-lg`.
- **Mobile breakpoint is `@media (max-width: 640px)`** (the site's convention).
- **Motion must be wrapped in `@media (prefers-reduced-motion: no-preference)`** (the site's convention).

---

### Task 1: Restyle `ExportModal.css`

**Files:**
- Modify (full rewrite): `frontend/src/pages/ItineraryPage/ExportModal/ExportModal.css`

**Interfaces:**
- Consumes: the class names emitted by `ExportModal.jsx` — `export-modal__backdrop`, `export-modal`, `export-modal__close`, `export-modal__title`, `export-modal__subtitle`, `export-modal__chips`, `export-modal__chip`, `export-modal__chip-remove`, `export-modal__input`, `export-modal__hint`, `export-modal__send`, `export-modal__status`, `export-modal__footer`, `export-modal__copy`. Every one of these must still be styled after the rewrite.
- Consumes: design tokens from `frontend/src/App.css` `:root` (listed in Global Constraints).
- Produces: nothing consumed by other code — terminal styling change.

- [ ] **Step 1: Replace the entire contents of `ExportModal.css` with the refreshed stylesheet**

Write this exact file:

```css
/* frontend/src/pages/ItineraryPage/ExportModal/ExportModal.css */
.export-modal__backdrop {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  background: rgba(15, 23, 42, 0.45); padding: 16px;
}
.export-modal {
  position: relative;
  width: 100%; max-width: 560px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  padding: 32px 32px 24px;
}
.export-modal__close {
  position: absolute; top: 12px; right: 14px;
  background: none; border: none; cursor: pointer;
  font-size: 1.6rem; line-height: 1; color: var(--slate-400);
  transition: color 0.15s ease;
}
.export-modal__close:hover { color: var(--ink); }
.export-modal__title { margin: 0 0 6px; font-size: 1.5rem; color: var(--ink); }
.export-modal__subtitle { margin: 0 0 18px; font-size: 0.95rem; color: var(--slate-500); }
.export-modal__chips {
  display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
  border: 1px solid var(--border); border-radius: 8px;
  padding: 10px; min-height: 56px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.export-modal__chips:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.export-modal__chip {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--accent-soft); color: var(--accent-strong);
  border-radius: 999px; padding: 5px 9px 5px 12px; font-size: 0.9rem;
}
.export-modal__chip-remove {
  background: none; border: none; cursor: pointer;
  font-size: 1.05rem; line-height: 1; color: var(--accent-strong); padding: 0;
  transition: opacity 0.15s ease;
}
.export-modal__chip-remove:hover { opacity: 0.65; }
.export-modal__input {
  flex: 1; min-width: 160px; border: none; outline: none;
  font-size: 1rem; padding: 5px; background: transparent; color: var(--ink);
}
.export-modal__hint { display: block; margin-top: 8px; font-size: 0.85rem; color: var(--danger); }
.export-modal__send {
  margin-top: 18px; width: 100%;
  padding: 12px 16px; border: none; border-radius: 8px; cursor: pointer;
  background: var(--accent); color: #fff; font-size: 1rem; font-weight: 600;
  transition: background 0.15s ease;
}
.export-modal__send:hover:not(:disabled) { background: var(--accent-strong); }
.export-modal__send:disabled { opacity: 0.5; cursor: default; }
.export-modal__status { display: block; margin-top: 10px; font-size: 0.9rem; color: var(--slate-500); text-align: center; }
.export-modal__footer {
  margin-top: 20px; padding-top: 16px;
  border-top: 1px solid var(--border);
  display: flex; justify-content: center;
}
.export-modal__copy {
  background: none; border: 1px solid var(--border);
  border-radius: 8px; padding: 10px 18px; cursor: pointer;
  font-size: 0.95rem; color: var(--ink);
  transition: background 0.15s ease;
}
.export-modal__copy:hover { background: var(--surface-muted); }

@media (prefers-reduced-motion: no-preference) {
  .export-modal__backdrop { animation: export-modal-fade 0.16s ease; }
  .export-modal { animation: export-modal-pop 0.18s ease; }
}
@keyframes export-modal-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes export-modal-pop {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (max-width: 640px) {
  .export-modal { padding: 20px 16px 16px; }
  .export-modal__title { font-size: 1.25rem; }
  .export-modal__subtitle { font-size: 0.9rem; margin-bottom: 14px; }
}
```

- [ ] **Step 2: Start the dev server and verify the desktop appearance**

Run: `cd frontend && npm run dev`
Open an itinerary page in the browser, click **Export**, and confirm:
- Modal is visibly wider (~560px) with generous padding.
- Send button is **teal** (`--accent`), not dark olive; title is near-black `--ink`.
- Chips are pale-teal (`--accent-soft`) with `--accent-strong` text.
Expected: modal reads as part of NavQuest's teal/slate theme, no olive/cream anywhere.

- [ ] **Step 3: Verify focus, hover, and motion polish**

In the browser:
- Click into the email input → the chip container shows a teal border + `--accent-soft` focus ring.
- Hover the Send button → darkens to `--accent-strong`; hover Copy → `--surface-muted` bg; hover a chip's × → fades.
- Add a couple of emails, send, and copy → behavior is unchanged from before (chips add on Enter/comma, send shows status, copy shows "Copied!").
Expected: all interactions behave exactly as pre-refresh, now with visible hover/focus feedback.

- [ ] **Step 4: Verify mobile accessibility**

In the browser devtools, set the viewport width below 640px (e.g. 375px):
- Card padding and title shrink; the card stays inset from the screen edges (16px backdrop padding).
- No horizontal scrollbar; the chip input and buttons remain usable.
Expected: layout collapses cleanly, nothing clipped or overflowing.

- [ ] **Step 5: Verify reduced-motion**

Enable "Reduce motion" at the OS level (macOS: System Settings → Accessibility → Display → Reduce motion), reload, and open the modal.
Expected: no fade/pop animation plays; the modal appears instantly.

- [ ] **Step 6: Commit**

> Per the user's standing preference, commits are made by the user, not automatically. Leave the change staged/unstaged for the user to commit. Suggested message:

```
Refresh Export modal UI to match NavQuest design tokens
```
```

## Self-Review

**Spec coverage:**
- Goal 1 (recolor to tokens) → Step 1 palette rules + Step 2 verify. ✓
- Goal 2 (larger for big screens) → Step 1 sizing + Step 2 verify. ✓
- Goal 3 (light polish, reduced-motion) → Step 1 focus/hover/motion + Steps 3 & 5 verify. ✓
- Goal 4 (mobile-accessible, 640px) → Step 1 media query + Step 4 verify. ✓
- Non-goal (no behavior/markup/file changes) → Global Constraints + single-file scope. ✓

**Placeholder scan:** none — the full stylesheet is inline; verification steps name exact tokens and expected outcomes.

**Type consistency:** all class selectors match the 14 class names emitted by `ExportModal.jsx` (verified against the JSX); all tokens exist in `App.css` `:root` (verified: `--ink`, `--slate-500`, `--slate-400`, `--border`, `--surface`, `--surface-muted`, `--accent`, `--accent-strong`, `--accent-soft`, `--danger`, `--radius`, `--shadow-lg`).
