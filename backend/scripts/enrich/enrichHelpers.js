// backend/scripts/enrich/enrichHelpers.js
export const filterToVocab = (tags, allowed) =>
  Array.isArray(tags) ? tags.filter((t) => allowed.includes(t)) : []

export const collectProposed = (tags, allowed) =>
  Array.isArray(tags) ? tags.filter((t) => !allowed.includes(t)) : []

export function resolveDescription(aiDescription, confidence, venue) {
  if (confidence === 'known' && typeof aiDescription === 'string' && aiDescription.trim()) {
    return aiDescription.trim()
  }
  const kind = venue.category === 'restaurant' ? 'place to eat' : 'spot to visit'
  return `A ${kind} in San Francisco.`
}

export function tallyProposed(map, proposed, venueName) {
  for (const tag of proposed ?? []) {
    if (!map.has(tag)) map.set(tag, { count: 0, examples: [] })
    const entry = map.get(tag)
    entry.count += 1
    if (entry.examples.length < 3) entry.examples.push(venueName)
  }
  return map
}
