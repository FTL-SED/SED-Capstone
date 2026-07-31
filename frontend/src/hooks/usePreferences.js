import { useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPreferences, updatePreferences } from '../api/users.js'

// The signed-in user's saved preferences (incl. isPublic), cached under one key
// so the profile privacy toggle AND the preferences editor read/write the SAME
// record. With the app's staleTime, reopening either serves the cached prefs
// instantly instead of refetching on every click; a save updates the cache so
// both views reflect it without a round-trip.
export const preferencesKey = (userId) => ['preferences', userId]

// Read the caller's preferences. `enabled` guards the fetch until we have an id.
export function usePreferencesQuery(userId) {
  return useQuery({
    queryKey: preferencesKey(userId),
    queryFn: () => getPreferences(userId),
    enabled: userId != null,
  })
}

// Save a subset of preferences (partial body: e.g. the full editor payload). On
// success the returned record is merged into the cache so every reader updates
// without a refetch. Used by the preferences EDITOR (explicit Save button), so a
// round-trip before confirming is fine there.
export function usePreferencesMutation(userId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body) => updatePreferences(userId, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(preferencesKey(userId), (prev) => ({
        ...prev,
        ...updated,
      }))
    },
  })
}

// OPTIMISTIC public/private toggle for the profile page — mirrors the itinerary
// page's privacy toggle: flip the cached value immediately (so the UI updates
// the instant the user clicks), then converge the server in the background with
// at most one request in flight (a drain loop, so rapid clicks can't race the
// DB), rolling the cache back if the server rejects it.
export function useTogglePublic(userId) {
  const queryClient = useQueryClient()
  // { desired, running } — the latest state the user wants + whether a request
  // is in flight. Survives re-renders so the drain loop sees fresh clicks.
  const sync = useRef({ desired: null, running: false })

  const drain = async () => {
    const state = sync.current
    if (state.running) return
    state.running = true
    try {
      let sent
      while (state.desired !== sent) {
        sent = state.desired
        await updatePreferences(userId, { isPublic: sent })
      }
    } catch (err) {
      console.error('Privacy toggle failed, reverting:', err)
      // Roll the cache back — state.desired never applied on the server.
      queryClient.setQueryData(preferencesKey(userId), (prev) =>
        prev ? { ...prev, isPublic: !state.desired } : prev,
      )
      window.alert('Could not change your profile visibility. Please try again.')
    } finally {
      state.running = false
    }
  }

  // Flip to `next`: patch the cache now (instant UI), record the desired state,
  // then sync in the background.
  return (next) => {
    queryClient.setQueryData(preferencesKey(userId), (prev) =>
      prev ? { ...prev, isPublic: next } : prev,
    )
    sync.current.desired = next
    drain()
  }
}
