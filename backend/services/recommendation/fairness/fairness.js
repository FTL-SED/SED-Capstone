// Step 5 — the fairness guarantee. Ranking alone can leave a member with a
// niche interest completely unrepresented (their best match just never scores
// high enough to make the cut). This is the last check before the shortlist
// ships: every member gets ≥1 pin they'd like, or we inject their best one.
// Per ../../../../.claude/docs/recommendation-engine.md ("Fairness guarantee"). Pure:
// returns a new array, never mutates `shortlist` or `candidates`.

import { memberLikes } from '../score/score.js'

const identity = (pin) => pin.id ?? pin.name

const isInList = (list, pin) =>
  list.some((p) => identity(p) === identity(pin))

// candidates must already carry a `.score` (set by softScore, Step 4) — this
// function only decides *whom* to inject for, not how to score them.
function ensureEveryMemberCovered(shortlist, members, candidates) {
  const covered = [...shortlist]

  for (const member of members) {
    const alreadyCovered = covered.some((pin) => memberLikes(pin, member))
    if (alreadyCovered) continue

    const bestMatch = candidates
      .filter((pin) => memberLikes(pin, member) && !isInList(covered, pin))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]

    // No candidate matches this member's interests at all — nothing to inject.
    // (A hard gap in the data/vocab, not something this function can fix.)
    if (!bestMatch) continue

    covered.push(bestMatch)
  }

  return covered
}

export { ensureEveryMemberCovered }
