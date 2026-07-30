// Per-user rate limit for POST /ai-agent/banner — the real cost guardrail for
// AI banner generation (the wizard's 3-cap is client-side and bypassable). This
// runs AFTER requireAuth, so req.user.id is always present. In-memory sliding
// window: fine for the current single-instance deploy; a horizontally-scaled
// backend would need a shared store (Redis) instead.
import { BANNER_RATE_LIMIT_MAX, BANNER_RATE_LIMIT_WINDOW_MS } from '../config/ai.js'

// userId -> array of request timestamps (ms) within the current window.
const hits = new Map()

export function bannerRateLimit(req, res, next) {
  const userId = req.user.id
  const now = Date.now()
  const windowStart = now - BANNER_RATE_LIMIT_WINDOW_MS

  const recent = (hits.get(userId) ?? []).filter((t) => t > windowStart)

  if (recent.length >= BANNER_RATE_LIMIT_MAX) {
    return res.status(429).json({
      error: 'Too many banner generations. Please try again later.',
    })
  }

  recent.push(now)
  hits.set(userId, recent)
  next()
}
