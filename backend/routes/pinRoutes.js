import express from 'express'
import {
  getPin,
  createPin,
  updatePin,
  deletePin,
} from '../controllers/pinController.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

router.post('/', requireAuth, createPin)
router.get('/:id', requireAuth, getPin)
router.put('/:id', requireAuth, updatePin)
router.delete('/:id', requireAuth, deletePin)

export default router
