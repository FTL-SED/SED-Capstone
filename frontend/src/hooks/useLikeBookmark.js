import { useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getUserDashboard,
  likeItinerary,
  unlikeItinerary,
  bookmarkItinerary,
  removeBookmark,
} from '../api/itinerary.js'

// Two shared, app-wide sources of truth, both living in the React Query cache so
// EVERY page reads the same value and re-renders together:
//   ['dashboard', userId] — which itineraries I've liked/bookmarked (membership)
//   ['likeCounts']        — id -> authoritative like count (an override map)
// A card's displayed count is `likeCounts[id] ?? itinerary.likeCount`, so the
// moment any page toggles a like, that itinerary's count is identical on Home,
// Discover, and the Itinerary page — there's only one number to update.
export const LIKE_COUNTS_KEY = ['likeCounts']

// Shared query options for the like-count override map. Both the hook (which
// writes it) and every ItineraryCard (which only reads it) pass these SAME
// options, so React Query sees one fully-defined query — no "missing queryFn"
// warning, and one shared cache entry. The queryFn is a no-op default: the map
// is only ever populated by setQueryData on toggle, never fetched.
export const likeCountsQuery = {
  queryKey: LIKE_COUNTS_KEY,
  queryFn: () => ({}),
  initialData: {},
  staleTime: Infinity,
  gcTime: Infinity,
}

export function useLikeBookmark({ userId } = {}) {
  const queryClient = useQueryClient()
  const dashboardKey = ['dashboard', userId]

  // Owning the dashboard query HERE (rather than in each page) is what makes the
  // hook re-render every consumer when the shared cache changes. `enabled` skips
  // the fetch for signed-out visitors.
  const { data: dashboard } = useQuery({
    queryKey: dashboardKey,
    queryFn: () => getUserDashboard(userId),
    enabled: !!userId,
  })

  // The shared like-count override map. initialData seeds an empty map so the
  // first reader and every later one share the same cache entry.
  const { data: likeCounts } = useQuery(likeCountsQuery)

  // Membership is DERIVED from the dashboard cache, never stored separately — so
  // it can't fall out of step with what the pages display.
  const likedIds = useMemo(
    () => new Set((dashboard?.likedItineraries ?? []).map((it) => it.id)),
    [dashboard],
  )
  const bookmarkedIds = useMemo(
    () => new Set((dashboard?.bookmarkedItineraries ?? []).map((it) => it.id)),
    [dashboard],
  )

  // { desired, running } per itinerary id.
  const likeSync = useRef(new Map())
  const bookmarkSync = useRef(new Map())

  // Updates the dashboard query cache to reflect a like/bookmark change immediately.
  // Adds the itinerary for optimistic rendering or removes it by ID.
  const setMembership = (listKey, id, on, itinerary) => {
    queryClient.setQueryData(dashboardKey, (old) => {
      if (!old) return old
      const list = old[listKey] ?? []
      const nextList = on
        ? (list.some((it) => it.id === id) ? list : [...list, itinerary ?? { id }])
        : list.filter((it) => it.id !== id)
      return { ...old, [listKey]: nextList }
    })
  }

  // Move a single itinerary's count in the shared override map. `base` is the
  // count the card was rendering (from its feed), used only when there's no
  // override yet, so the first click starts from the value on screen.
  const bumpCount = (id, delta, base) =>
    queryClient.setQueryData(LIKE_COUNTS_KEY, (old = {}) => {
      const current = old[id] ?? base ?? 0
      return { ...old, [id]: Math.max(0, current + delta) }
    })

  // Pin an itinerary's count to the server's authoritative value.
  const setCount = (id, value) =>
    queryClient.setQueryData(LIKE_COUNTS_KEY, (old = {}) => ({ ...old, [id]: value }))

  // Drain loop: keep sending until the last request we sent matches what the
  // user now wants (they may click again mid-flight), with at most one request
  // in flight per id so concurrent toggles can't race at the DB. onResult fires
  // once with the final response; onError reverts the optimistic writes.
  const drain = async (syncRef, id, send, onResult, onError) => {
    const state = syncRef.current.get(id)
    if (!state || state.running) return
    state.running = true
    try {
      let sent
      let lastRes
      while (state.desired !== sent) {
        sent = state.desired
        lastRes = await send(sent)
      }
      onResult?.(lastRes)
    } catch (err) {
      console.error('Toggle sync failed:', err)
      onError?.(syncRef.current.get(id)?.desired)
    } finally {
      state.running = false
      // Mark the shared dashboard STALE but DON'T refetch what's on screen
      // (refetchType: 'none'). Our optimistic membership write is already the
      // shared truth every mounted page reads, so refetching here would only
      // reconcile against a server response that may lag the just-committed
      // toggle — which is the flicker. Pages mounted LATER see the stale flag
      // and refetch fresh on their next mount; that's enough for consistency.
      queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'none' })
    }
  }

  const start = (syncRef, id, desired, send, onResult, onError) => {
    const state = syncRef.current.get(id) ?? {}
    state.desired = desired
    syncRef.current.set(id, state)
    drain(syncRef, id, send, onResult, onError)
  }

  const toggleLike = (id, itinerary) => {
    const desired = !likedIds.has(id)
    const delta = desired ? 1 : -1
    // Optimistically flip membership + move the shared count in click order.
    setMembership('likedItineraries', id, desired, itinerary)
    bumpCount(id, delta, itinerary?.likeCount)
    start(
      likeSync,
      id,
      desired,
      (on) => (on ? likeItinerary(id) : unlikeItinerary(id)),
      // Reconcile the count with the server's authoritative value once settled.
      (res) => {
        if (res && typeof res.likeCount === 'number') setCount(id, res.likeCount)
      },
      // On a hard failure, undo the optimistic membership + count.
      (finalDesired) => {
        setMembership('likedItineraries', id, !finalDesired, itinerary)
        bumpCount(id, finalDesired ? -1 : 1, itinerary?.likeCount)
      },
    )
  }

  const toggleBookmark = (id, itinerary) => {
    const desired = !bookmarkedIds.has(id)
    setMembership('bookmarkedItineraries', id, desired, itinerary)
    start(
      bookmarkSync,
      id,
      desired,
      (on) => (on ? bookmarkItinerary(id) : removeBookmark(id)),
      undefined,
      (finalDesired) => setMembership('bookmarkedItineraries', id, !finalDesired, itinerary),
    )
  }

  return { dashboard, likedIds, bookmarkedIds, likeCounts, toggleLike, toggleBookmark }
}
