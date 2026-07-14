import express from 'express'
import {
  registerUser,
  loginUser,
  updateUser,
  getUser,
} from '../controllers/userController.js'

const router = express.Router()

router.post('/register', registerUser)
router.post('/login', loginUser)
router.get('/:id', getUser)
router.put('/:id', updateUser)

export default router
