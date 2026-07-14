import express from 'express'
import {
  getPin,
  createPin,
  updatePin,
  deletePin,
} from '../controllers/pinController.js'

const router = express.Router()

router.post('/', createPin)
router.get('/:id', getPin)
router.put('/:id', updatePin)
router.delete('/:id', deletePin)

export default router
