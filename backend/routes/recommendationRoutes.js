import express from 'express'
import { postRecommendations } from '../controllers/recommendationController.js'
import { requireAuth } from '../middleware/auth.js'
import { validateRecommendationInput } from '../middleware/validateRecommendationInput.js'

const router = express.Router()

router.post('/', requireAuth, validateRecommendationInput, postRecommendations)

export default router
