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

const router = express.Router()

router.post('/', createItinerary)
router.get('/', listItineraries)
router.get('/:id', getItinerary)
router.put('/:id', updateItinerary)
router.delete('/:id', deleteItinerary)

router.post('/:id/like', likeItinerary)
router.delete('/:id/like', unlikeItinerary)

router.post('/:id/bookmark', bookmarkItinerary)
router.delete('/:id/bookmark', removeBookmark)

router.post('/:id/copy', copyItinerary)

export default router
