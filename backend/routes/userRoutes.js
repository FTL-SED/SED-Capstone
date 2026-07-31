import express from 'express'
import multer from 'multer'
import {
  registerUser,
  loginUser,
  updateUser,
  getUser,
  uploadUserAvatar,
  changeUserPassword,
  searchUsers,
  checkAvailability,
  getPreferences,
  updatePreferences,
} from '../controllers/userController.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// Avatars go straight to Supabase Storage, so keep the file in memory (never on
// disk) and cap the size to keep uploads sane.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
})

router.post('/register', registerUser)
router.post('/login', loginUser)
// Public pre-check for the register form (email/username availability). Static
// path, so like '/search' it must be registered before the '/:id' routes.
router.get('/availability', checkAvailability)
// Static path — MUST be registered before the '/:id' routes below, or Express
// matches "search" as an :id param.
router.get('/search', requireAuth, searchUsers)
router.get('/:id', requireAuth, getUser)
router.put('/:id', requireAuth, updateUser)
router.get('/:id/preferences', requireAuth, getPreferences)
router.put('/:id/preferences', requireAuth, updatePreferences)
router.post('/:id/avatar', requireAuth, upload.single('avatar'), uploadUserAvatar)
router.post('/:id/password', requireAuth, changeUserPassword)

export default router
