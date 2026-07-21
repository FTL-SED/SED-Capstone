// backend/scripts/verifyPhase3Parity.js
import { getRecommendations } from '../services/recommendation/index.js'

const trip = { startTime: '09:00', endTime: '21:00', maxBudgetPerPerson: 80, groupSize: 3, travelRadius: 5, tripDate: '2026-01-01' }
const members = [
  { name: 'A', startLocation: { latitude: 37.7749, longitude: -122.4194 }, interestTags: ['museum', 'food'], foodPrefs: ['mexican'] },
  { name: 'B', startLocation: { latitude: 37.7849, longitude: -122.4094 }, interestTags: ['nature', 'scenic_views'], foodPrefs: ['italian'] },
  { name: 'C', startLocation: { latitude: 37.7649, longitude: -122.4294 }, interestTags: ['coffee'], foodPrefs: [] },
]

async function main() {
  const { shortlist, constraints } = await getRecommendations(trip, members)
  const byCat = shortlist.reduce((m, p) => ((m[p.category] = (m[p.category] || 0) + 1), m), {})
  console.log('shortlist size:', shortlist.length)
  console.log('category mix:', byCat)
  console.log('meetingPoint:', constraints.meetingPoint)
  console.log('sample:', shortlist.slice(0, 5).map((p) => `${p.name} [${p.category}]`))
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
