import express from 'express'
import multer from 'multer'
import {
  createItinerary,
  listItineraries,
  getItinerary,
  updateItinerary,
  reorderItineraryStops,
  deleteItinerary,
  likeItinerary,
  unlikeItinerary,
  bookmarkItinerary,
  removeBookmark,
  markVisited,
  unmarkVisited,
  copyItinerary,
  uploadItineraryCover,
} from '../controllers/itineraryController.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// Cover images go straight to Supabase Storage, so keep the file in memory
// (never on disk) and cap the size to keep uploads sane. Matches the avatar route.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
})

router.post('/', requireAuth, createItinerary)
router.get('/', requireAuth, listItineraries)
router.get('/:id', requireAuth, getItinerary)
router.put('/:id', requireAuth, updateItinerary)
router.put('/:id/stops/order', requireAuth, reorderItineraryStops)
router.delete('/:id', requireAuth, deleteItinerary)

router.post('/:id/like', requireAuth, likeItinerary)
router.delete('/:id/like', requireAuth, unlikeItinerary)

router.post('/:id/bookmark', requireAuth, bookmarkItinerary)
router.delete('/:id/bookmark', requireAuth, removeBookmark)

router.post('/:id/visited', requireAuth, markVisited)
router.delete('/:id/visited', requireAuth, unmarkVisited)

router.post('/:id/copy', requireAuth, copyItinerary)

router.post('/:id/cover', requireAuth, upload.single('cover'), uploadItineraryCover)

export default router
