import express from 'express'
import {
  searchCatalog,
  getStop,
  createStop,
  updateStop,
  deleteStop,
} from '../controllers/stopController.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

router.get('/', requireAuth, searchCatalog)
router.post('/', requireAuth, createStop)
router.get('/:id', requireAuth, getStop)
router.put('/:id', requireAuth, updateStop)
router.delete('/:id', requireAuth, deleteStop)

export default router
