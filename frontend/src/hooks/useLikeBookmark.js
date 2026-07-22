import { useState, useRef, useCallback } from 'react'
import {
  likeItinerary,
  unlikeItinerary,
  bookmarkItinerary,
  removeBookmark,
} from '../api/itinerary.js'

// Add/remove an id from a Set-state.
function toggleInSet(setState, id, on) {
  setState((prev) => {
    const next = new Set(prev)
    on ? next.add(id) : next.delete(id)
    return next
  })
}

// Shared like/bookmark state for pages that render a LIST of itinerary cards
// (HomePage, DiscoverPage). Owns "which itineraries I've liked/bookmarked" as id
// Sets, and race-safe toggling: at most one request in flight per id, re-sending
// until the server matches the user's latest desired state — so rapid clicks
// can't leave the server disagreeing with the UI. The like COUNT lives in each
// page's own itinerary arrays, so count updates are delegated back via the
// onLikeDelta (optimistic ±1) and onLikeCount (authoritative overwrite) callbacks.
export function useLikeBookmark({ onLikeDelta, onLikeCount } = {}) {
  const [likedIds, setLikedIds] = useState(() => new Set())
  const [bookmarkedIds, setBookmarkedIds] = useState(() => new Set())
  // { desired, running } per itinerary id.
  const likeSync = useRef(new Map())
  const bookmarkSync = useRef(new Map())

  // Replace the tracked ids, e.g. after hydrating from the dashboard.
  const hydrate = useCallback(({ liked = [], bookmarked = [] }) => {
    setLikedIds(new Set(liked))
    setBookmarkedIds(new Set(bookmarked))
  }, [])

  // Drain loop: keep sending until the last request we sent matches what the
  // user now wants (they may click again mid-flight). onResult fires only for a
  // response that reflects the final action; onError reverts optimistic UI.
  const drain = async (syncRef, id, send, onResult, onError) => {
    const state = syncRef.current.get(id)
    if (!state || state.running) return
    state.running = true
    try {
      let sent
      while (state.desired !== sent) {
        sent = state.desired
        const res = await send(sent)
        if (state.desired === sent) onResult?.(res)
      }
    } catch (err) {
      console.error('Toggle sync failed:', err)
      onError?.(syncRef.current.get(id)?.desired)
    } finally {
      state.running = false
    }
  }

  const start = (syncRef, id, desired, send, onResult, onError) => {
    const state = syncRef.current.get(id) ?? {}
    state.desired = desired
    syncRef.current.set(id, state)
    drain(syncRef, id, send, onResult, onError)
  }

  const toggleLike = (id) => {
    const desired = !likedIds.has(id)
    toggleInSet(setLikedIds, id, desired)
    onLikeDelta?.(id, desired ? 1 : -1)
    start(
      likeSync,
      id,
      desired,
      (on) => (on ? likeItinerary(id) : unlikeItinerary(id)),
      (res) => {
        if (res && typeof res.likeCount === 'number') onLikeCount?.(id, res.likeCount)
      },
    )
  }

  const toggleBookmark = (id) => {
    const desired = !bookmarkedIds.has(id)
    toggleInSet(setBookmarkedIds, id, desired)
    start(
      bookmarkSync,
      id,
      desired,
      // Bookmark returns 204 (no count), so there's nothing to reconcile.
      (on) => (on ? bookmarkItinerary(id) : removeBookmark(id)),
      undefined,
      // On a hard failure, revert to the opposite of what we last tried to send.
      (finalDesired) => toggleInSet(setBookmarkedIds, id, !finalDesired),
    )
  }

  return { likedIds, bookmarkedIds, toggleLike, toggleBookmark, hydrate }
}
