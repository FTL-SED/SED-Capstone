// Google Places enrichment hook (stretch goal, see roadmap "Later / stretch").
// recommend() calls this on its top ~40 scored candidates *before* the final
// re-score + assembly, so once implemented, real ratings/prices/hours can
// improve ranking. Until then this is a pure no-op — the engine ranks on seed
// (OSM) data alone. Per ../../../../.claude/docs/data-strategy.md.

function enrichMissing(places) {
  // TODO(stretch): for each place missing rating/price/hours, call Google
  // Places once, UPDATE + cache the result, then return the enriched copies.
  return places
}

module.exports = { enrichMissing }
