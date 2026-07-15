import express from 'express'
import {
  createItinerary,
  listItineraries,
  getItinerary,
  updateItinerary,
  deleteItinerary,
  likeItinerary,
  unlikeItinerary,
  bookmarkItinerary,
  removeBookmark,
  copyItinerary,
} from '../controllers/itineraryController.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

router.post('/', requireAuth, createItinerary)
router.get('/', requireAuth, listItineraries)
router.get('/:id', requireAuth, getItinerary)
router.put('/:id', requireAuth, updateItinerary)
router.delete('/:id', requireAuth, deleteItinerary)

router.post('/:id/like', requireAuth, likeItinerary)
router.delete('/:id/like', requireAuth, unlikeItinerary)

router.post('/:id/bookmark', requireAuth, bookmarkItinerary)
router.delete('/:id/bookmark', requireAuth, removeBookmark)

router.post('/:id/copy', requireAuth, copyItinerary)

export default router
