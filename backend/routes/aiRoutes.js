import express from 'express'
import { postAiAgent } from '../controllers/aiController.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

router.post('/', requireAuth, postAiAgent)

export default router
