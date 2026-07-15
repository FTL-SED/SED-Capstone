import express from 'express'
import {
  registerUser,
  loginUser,
  updateUser,
  getUser,
} from '../controllers/userController.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

router.post('/register', registerUser)
router.post('/login', loginUser)
router.get('/:id', requireAuth, getUser)
router.put('/:id', requireAuth, updateUser)

export default router
