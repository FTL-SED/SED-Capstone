import { test } from 'node:test'
import assert from 'node:assert/strict'

import { rescheduleStops } from './schedule.js'

const coords = {
  1: { latitude: 37.7955, longitude: -122.3937 },
  2: { latitude: 37.7614, longitude: -122.4241 },
  3: { latitude: 37.7694, longitude: -122.4862 },
}
const coordOf = (stop) => coords[stop.pinId]

const stop = (pinId, arriveTime, departTime, extra = {}) => ({
  pinId, arriveTime, departTime, ...extra,
})

test('first stop arrives at the provided start time', () => {
  const stops = [stop(1, '10:00', '11:00'), stop(2, '11:30', '12:30')]
  const out = rescheduleStops(stops, coordOf, '09:00')
  assert.equal(out[0].arriveTime, '09:00')
})

test('preserves each stop dwell duration', () => {
  const stops = [stop(1, '10:00', '11:30'), stop(2, '12:00', '12:45')] // 90m, 45m
  const out = rescheduleStops(stops, coordOf, '09:00')
  const dwell = (s) => {
    const [ah, am] = s.arriveTime.split(':').map(Number)
    const [dh, dm] = s.departTime.split(':').map(Number)
    return dh * 60 + dm - (ah * 60 + am)
  }
  assert.equal(dwell(out[0]), 90)
  assert.equal(dwell(out[1]), 45)
})

test('leaves a travel gap between consecutive stops (arrive > previous depart)', () => {
  const stops = [stop(1, '09:00', '10:00'), stop(3, '10:00', '11:00')] // 1 & 3 are far apart
  const out = rescheduleStops(stops, coordOf, '09:00')
  const departPrev = out[0].departTime
  assert.ok(out[1].arriveTime > departPrev, 'second stop should arrive after travel time')
})

test('transport mode scales travel time: walking takes longer than driving', () => {
  const stops = [stop(1, '09:00', '10:00'), stop(3, '10:00', '11:00')] // pins 1 & 3 far apart
  const walk = rescheduleStops(stops, coordOf, '09:00', 'walking')
  const drive = rescheduleStops(stops, coordOf, '09:00', 'driving')
  assert.ok(
    walk[0].travelTimeToNextMinutes > drive[0].travelTimeToNextMinutes,
    `walking (${walk[0].travelTimeToNextMinutes}m) should exceed driving (${drive[0].travelTimeToNextMinutes}m)`
  )
})

test('produces chronological, non-overlapping times', () => {
  const stops = [stop(1, '09:00', '10:00'), stop(2, '10:00', '11:00'), stop(3, '11:00', '12:00')]
  const out = rescheduleStops(stops, coordOf, '09:00')
  for (let i = 1; i < out.length; i++) {
    assert.ok(out[i].arriveTime >= out[i - 1].departTime)
  }
})

test('backfills travel legs on all but the last stop; last has none', () => {
  const stops = [stop(1, '09:00', '10:00'), stop(2, '10:30', '11:30'), stop(3, '12:00', '13:00')]
  const out = rescheduleStops(stops, coordOf, '09:00')
  assert.equal(typeof out[0].travelTimeToNextMinutes, 'number')
  assert.equal(typeof out[0].distanceToNextMeters, 'number')
  assert.equal(out[out.length - 1].travelTimeToNextMinutes, null)
  assert.equal(out[out.length - 1].distanceToNextMeters, null)
})

test('preserves non-timing fields (mealType, note)', () => {
  const stops = [stop(1, '12:00', '13:00', { mealType: 'lunch', note: 'hi' })]
  const out = rescheduleStops(stops, coordOf, '12:00')
  assert.equal(out[0].mealType, 'lunch')
  assert.equal(out[0].note, 'hi')
})

test('holds a meal that would arrive early until its window opens', () => {
  // Only stop, day starts 09:00 — without a hold, a dinner would arrive 09:00,
  // outside the dinner window. It should be delayed to the window's start
  // (17:00) instead.
  const stops = [stop(1, '18:30', '20:00', { mealType: 'dinner' })]
  const out = rescheduleStops(stops, coordOf, '09:00')
  assert.equal(out[0].arriveTime, '17:00', 'dinner should wait for its window to open')
  assert.equal(out[0].departTime, '18:30', 'dwell (90m) is preserved from the delayed arrival')
})

test('does not delay a meal that already arrives within its window', () => {
  // A short earlier stop means we reach the lunch stop at ~12:00 naturally, but
  // the natural clock still puts it well inside lunch (11:30-14:30) here.
  const stops = [
    stop(1, '11:45', '12:00'),
    stop(2, '12:15', '13:00', { mealType: 'lunch' }),
  ]
  const out = rescheduleStops(stops, coordOf, '11:45')
  // Natural arrival (12:00 depart + travel) is already inside lunch — not
  // pushed to the block start (11:30).
  assert.ok(out[1].arriveTime >= '11:30' && out[1].arriveTime <= '14:30')
  assert.notEqual(out[1].arriveTime, '11:30')
})

test('fill: no INTERIOR stop is stretched more than STOP_STRETCH_MAX_MIN over its baseline', () => {
  // 3 short (60-min baseline) stops in a 300-min window with fill on. Interior
  // stops may grow at most baseline(60)+STOP_STRETCH_MAX_MIN(30) = 90 min, so the
  // fill spreads growth rather than inflating one stop. (The LAST stop may run a
  // little longer via the tail-snap — bounded separately by TAIL_SNAP_MAX_MIN — so
  // it's exempt here; see the tail-snap tests.)
  const stops = [
    stop(1, '12:00', '13:00'), // 60 min
    stop(2, '13:00', '14:00'), // 60 min
    stop(3, '14:00', '15:00'), // 60 min
  ]
  const out = rescheduleStops(stops, coordOf, '12:00', 'driving', { windowEndElapsed: 300 })
  const dur = (s) => {
    const t = (x) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3))
    return t(s.departTime) - t(s.arriveTime)
  }
  out.slice(0, -1).forEach((s) => {
    assert.ok(dur(s) <= 90, `interior stop dwell ${dur(s)} exceeds baseline+30 cap`)
  })
})

test('fill: distributes growth across stops rather than piling onto the first', () => {
  const stops = [
    stop(1, '12:00', '13:00'),
    stop(2, '13:00', '14:00'),
    stop(3, '14:00', '15:00'),
  ]
  const out = rescheduleStops(stops, coordOf, '12:00', 'driving', { windowEndElapsed: 300 })
  const dur = (s) => {
    const t = (x) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3))
    return t(s.departTime) - t(s.arriveTime)
  }
  const grown = out.filter((s) => dur(s) > 60).length
  assert.ok(grown >= 2, `expected growth spread across ≥2 stops, only ${grown} grew`)
})

const departMin = (s) => Number(s.departTime.slice(0, 2)) * 60 + Number(s.departTime.slice(3))

test('fill: a SPARSE day stretches to the MAX ceiling instead of quitting early', () => {
  // 2 short (60-min) stops in a 420-min (7-hour) window. With a FLAT +30 cap each
  // could only reach 90 min, ending ~3h early. The adaptive cap scales to the gap
  // so each stop grows to the MAX_STOP_DURATION_MIN (180) ceiling — the day then
  // reaches ~2×180+travel, hours later than the flat cap allowed. (Two stops
  // genuinely can't fill 7 hours without absurd dwells; the point is the fill uses
  // all it legitimately can rather than stopping at +30.)
  const stops = [stop(1, '12:00', '13:00'), stop(2, '13:00', '14:00')]
  const out = rescheduleStops(stops, coordOf, '12:00', 'driving', { windowEndElapsed: 420 })
  const dur = (s) => departMin(s) - (Number(s.arriveTime.slice(0, 2)) * 60 + Number(s.arriveTime.slice(3)))
  // Each stop must grow well past the old flat cap (90); they reach the 180 ceiling.
  assert.ok(out.every((s) => dur(s) >= 150), `expected stops stretched near the 180 ceiling, got ${out.map(dur)}`)
})

test('fill: a REALISTIC day (enough stops for the window) reaches the window end', () => {
  // 4 stops in a 360-min (6-hour) window — a normal density. The day should fill
  // to within a fill-step of the end, not quit an hour+ early.
  const stops = [stop(1, '12:00', '13:00'), stop(2, '13:00', '14:00'), stop(3, '14:00', '15:00'), stop(1, '15:00', '16:00')]
  const out = rescheduleStops(stops, coordOf, '12:00', 'driving', { windowEndElapsed: 360 })
  const lastDepart = departMin(out.at(-1)) - 12 * 60
  assert.ok(lastDepart >= 360 - 20, `realistic day ended too early: last departs at elapsed ${lastDepart}, window is 360`)
})

test('tail-snap: a day that fills to within ~30 min of the end lands EXACTLY on it', () => {
  // 4 stops (baseline 240 + ~52 travel ≈ 292) in a 320-min window. The fill grows
  // dwells in 15-min steps and halts a little short; the tail-snap then extends
  // the last stop so the day ends exactly at the window, for a clean finish
  // (no "…5:12pm on a 5:20 window").
  const stops = [stop(1, '12:00', '13:00'), stop(2, '13:00', '14:00'), stop(3, '14:00', '15:00'), stop(1, '15:00', '16:00')]
  const out = rescheduleStops(stops, coordOf, '12:00', 'driving', { windowEndElapsed: 320 })
  const lastDepart = departMin(out.at(-1)) - 12 * 60
  assert.equal(lastDepart, 320, `expected last stop to depart exactly at the window end (320), got ${lastDepart}`)
})

test('tail-snap: a trailing MEAL is extended to the window end (arrival stays in block)', () => {
  // A dinner as the last stop, finishing a little short of the window. Snapping
  // extends its DWELL (depart), not its arrival, so it lands exactly on the end
  // while its arrival stays inside the dinner block — a natural close.
  const dinnerStop = (id, a, d) => ({ pinId: id, arriveTime: a, departTime: d, mealType: 'dinner' })
  const stops = [stop(1, '15:00', '16:00'), dinnerStop(2, '17:00', '18:00')]
  // Start 15:00, window 210 min (ends 18:30). Dinner arrives 17:xx (in the
  // 17:00-21:00 block); the fill+snap should push its depart to exactly 18:30.
  const out = rescheduleStops(stops, coordOf, '15:00', 'driving', { windowEndElapsed: 210 })
  const last = out.at(-1)
  const lastDepart = departMin(last) - 15 * 60
  assert.equal(lastDepart, 210, `trailing meal should snap to the window end, got ${lastDepart}`)
  // Arrival must remain within the dinner block (17:00-21:00).
  const arrMin = Number(last.arriveTime.slice(0, 2)) * 60 + Number(last.arriveTime.slice(3))
  assert.ok(arrMin >= 17 * 60 && arrMin <= 21 * 60, `dinner arrival ${last.arriveTime} left its block`)
})

test('tail-snap: a genuinely short day is NOT papered over', () => {
  // 1 stop in a 420-min window: even stretched to the 180 ceiling it's far short.
  // The tail-snap only closes a SMALL residual (≤ TAIL_SNAP_MAX_MIN), so this day
  // must stay honestly short, not balloon the single stop to fill 7 hours.
  const stops = [stop(1, '12:00', '13:00')]
  const out = rescheduleStops(stops, coordOf, '12:00', 'driving', { windowEndElapsed: 420 })
  const lastDepart = departMin(out.at(-1)) - 12 * 60
  assert.ok(lastDepart < 420 - 60, `a far-short day must not be snapped to the end, got ${lastDepart}`)
})

test('fill: never stretches a stop past MAX_STOP_DURATION_MIN even to fill', () => {
  // A single 60-min stop in an enormous window can't fill it, but must not exceed
  // the hard 180-min ceiling — the adaptive cap is bounded by MAX_STOP_DURATION_MIN.
  const stops = [stop(1, '12:00', '13:00')]
  const out = rescheduleStops(stops, coordOf, '12:00', 'driving', { windowEndElapsed: 600 })
  const dur = departMin(out[0]) - (12 * 60)
  assert.ok(dur <= 180, `stop dwell ${dur} exceeds the 180-min hard ceiling`)
})
