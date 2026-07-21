// Step 5 — the fairness guarantee. Ranking alone can leave a member with a
// niche interest completely unrepresented (their best match just never scores
// high enough to make the cut). This is the last check before the shortlist
// ships: every member gets ≥1 pin they'd like, or we inject their best one.
// Per ../../../../.claude/docs/recommendation-engine.md ("Fairness guarantee"). Pure:
// returns a new array, never mutates `shortlist` or `candidates`.

import { memberLikes } from '../score/score.js'
import { memberCanEat, pinIdentity } from '../helpers/helpers.js'

const isRestaurant = (pin) => pin.category === 'restaurant'

// Single-pass best-scoring candidate satisfying `matches`, skipping any already
// in `coveredIds`. Replaces a `.filter().sort()[0]` (which sorts the whole match
// set just to take its head) with one linear scan tracking the max.
function bestUncovered(candidates, coveredIds, matches) {
  let best = null
  for (const pin of candidates) {
    if (coveredIds.has(pinIdentity(pin)) || !matches(pin)) continue
    if (best === null || (pin.score ?? 0) > (best.score ?? 0)) best = pin
  }
  return best
}

// candidates must already carry a `.score` (set by softScore, Step 4) — this
// function only decides *whom* to inject for, not how to score them.
function ensureEveryMemberCovered(shortlist, members, candidates) {
  const covered = [...shortlist]
  // Identity Set of what's covered, maintained incrementally — avoids the old
  // O(covered) re-scan (`isInList`) inside a filter over all candidates.
  const coveredIds = new Set(covered.map(pinIdentity))

  for (const member of members) {
    const alreadyCovered = covered.some((pin) => memberLikes(pin, member))
    if (alreadyCovered) continue

    const bestMatch = bestUncovered(candidates, coveredIds, (pin) => memberLikes(pin, member))

    // No candidate matches this member's interests at all — nothing to inject.
    // (A hard gap in the data/vocab, not something this function can fix.)
    if (!bestMatch) continue

    covered.push(bestMatch)
    coveredIds.add(pinIdentity(bestMatch))
  }

  return covered
}

// Diet coverage: every member with a dietary restriction needs ≥1 restaurant in
// the shortlist they can actually eat at. Unlike ensureEveryMemberCovered (which
// keys off interest/cuisine "likes"), a dieted member might have no cuisine match
// yet still needs a viable meal — so this injects their best-scoring edible
// restaurant when the shortlist has none. Prefers whole-group-eatable places
// implicitly, since those already rank higher via memberLikes.
function ensureEveryDietCovered(shortlist, members, candidates) {
  const covered = [...shortlist]
  const coveredIds = new Set(covered.map(pinIdentity))

  for (const member of members) {
    const needs = member.diet ?? []
    if (needs.length === 0) continue // no restriction ⇒ any meal works

    const hasMeal = covered.some((pin) => isRestaurant(pin) && memberCanEat(pin, member))
    if (hasMeal) continue

    const bestMeal = bestUncovered(
      candidates,
      coveredIds,
      (pin) => isRestaurant(pin) && memberCanEat(pin, member),
    )

    // No edible restaurant exists for this member anywhere — a real data gap
    // (surfaced elsewhere as thin/absent diet data), not fixable here.
    if (!bestMeal) continue

    covered.push(bestMeal)
    coveredIds.add(pinIdentity(bestMeal))
  }

  return covered
}

export { ensureEveryMemberCovered, ensureEveryDietCovered }
