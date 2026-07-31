import express from 'express'
import { postAiAgent, postBanner } from '../controllers/aiController.js'
import { requireAuth } from '../middleware/auth.js'
import { bannerRateLimit } from '../middleware/bannerRateLimit.js'

const router = express.Router()

router.post('/', requireAuth, postAiAgent)
router.post('/banner', requireAuth, bannerRateLimit, postBanner)

export default router
