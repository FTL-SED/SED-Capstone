import express from 'express'
import { postRecommendations } from '../controllers/recommendationController.js'
import { validateRecommendationInput } from '../middleware/validateRecommendationInput.js'

const router = express.Router()

router.post('/', validateRecommendationInput, postRecommendations)

export default router
