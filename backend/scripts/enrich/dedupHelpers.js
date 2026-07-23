// backend/scripts/enrich/dedupHelpers.js
import { haversineMiles, milesToMeters } from '../../utils/geo.js'

// Group pins by normalized name, then single-linkage cluster within `meters`.
// Returns only clusters of 2+ (a same-name set that is one physical place).
export function clusterByProximity(pins, meters) {
  const byName = new Map()
  for (const p of pins) {
    const key = (p.name ?? '').trim().toLowerCase()
    if (!key) continue
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key).push(p)
  }

  const near = (a, b) => milesToMeters(haversineMiles(a, b)) <= meters
  const clusters = []
  for (const group of byName.values()) {
    if (group.length < 2) continue
    // Single-linkage: union pins that are within `meters` of any cluster member.
    const remaining = [...group]
    while (remaining.length) {
      const seed = remaining.shift()
      const cluster = [seed]
      let grew = true
      while (grew) {
        grew = false
        for (let i = remaining.length - 1; i >= 0; i--) {
          if (cluster.some((c) => near(c, remaining[i]))) {
            cluster.push(remaining.splice(i, 1)[0])
            grew = true
          }
        }
      }
      if (cluster.length >= 2) clusters.push(cluster)
    }
  }
  return clusters
}

// Choose which pin in a cluster to keep. Priority: referenced by a stop >
// curated source > has a description > has a rating > lowest id.
export function pickSurvivor(cluster, referencedIds) {
  const rank = (p) => [
    referencedIds.has(p.id) ? 0 : 1,
    p.source === 'curated' ? 0 : 1,
    p.description ? 0 : 1,
    p.rating != null ? 0 : 1,
    p.id,
  ]
  const sorted = [...cluster].sort((a, b) => {
    const ra = rank(a)
    const rb = rank(b)
    for (let i = 0; i < ra.length; i++) {
      if (ra[i] !== rb[i]) return ra[i] - rb[i]
    }
    return 0
  })
  const [survivor, ...losers] = sorted
  return { survivor, losers }
}
