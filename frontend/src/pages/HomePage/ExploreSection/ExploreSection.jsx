import CardCarousel from '../../../components/CardCarousel/CardCarousel.jsx'
import { useState, useEffect } from 'react'
import axios from 'axios'
import './ExploreSection.css'

const BASE_URL = import.meta.env.VITE_BASE_URL;

// Return a new array with the items in random order (Fisher-Yates). The backend
// only sorts by "recent" or "popular", so we shuffle client-side for Explore.
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Merge a fresh fetch into the order already on screen so the row doesn't jump.
// Items we've already shown keep their current positions; only genuinely new
// itineraries are appended (shuffled among themselves). Dropped items fall off.
function mergeStable(previous, incoming) {
  const incomingById = new Map(incoming.map((it) => [it.id, it]));
  // Keep previously-shown items, in place, if they still exist in the fetch.
  const kept = previous
    .filter((it) => incomingById.has(it.id))
    .map((it) => incomingById.get(it.id));
  // Whatever's new gets shuffled and tacked on the end.
  const keptIds = new Set(kept.map((it) => it.id));
  const added = shuffle(incoming.filter((it) => !keptIds.has(it.id)));
  return [...kept, ...added];
}

// Module-level cache: the fetched itineraries live here for the lifetime of the
// page load. It survives unmount, so navigating away from /home and back can
// render the previous cards instantly (no loading flash). We still refetch on
// every mount — the cache is a display fallback, not a way to skip the request.
let cachedItineraries = null;

function ExploreSection() {
  const [itineraries, setItineraries] = useState(cachedItineraries ?? []);
  // Only show placeholders on the very first load, before anything is cached.
  const [loading, setLoading] = useState(cachedItineraries === null);

  useEffect(() => {
    // Always refetch on mount so newly-added itineraries show up. Any cached
    // data is already rendered above (no loading flash); we just swap it out
    // when the fresh response lands.
    let cancelled = false;

    const fetchItineraries = async () => {
      try {
        // All public itineraries, top 10 — no location/interest filter, and we
        // randomize the order ourselves after the call.
        const response = await axios.get(`${BASE_URL}/itineraries`, {
          params: { scope: 'public', limit: 10 },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        // --- Normal: 5 cards (real data) ---
        // const fresh = response.data;
        // --- TEMP testing: ~15 cards (triplicated). Comment the line above and
        //     uncomment the line below to toggle. ---
        const fresh = [...response.data, ...response.data, ...response.data].map((it, i) => ({ ...it, id: `${it.id}-${i}` }));
        // First load: shuffle fresh. Refetch: merge into the existing order so
        // already-shown cards stay put instead of jumping to a new shuffle.
        console.log("HERE IS THE RAW DATA RESPONSE", response.data);
        cachedItineraries = cachedItineraries === null
          ? shuffle(fresh)
          : mergeStable(cachedItineraries, fresh);
        // Component unmounted before the response landed — don't set state.
        if (cancelled) return;
        setItineraries(cachedItineraries);

      } catch (err) {
        console.error('Failed to load itineraries:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchItineraries();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="explore-section">
      <CardCarousel title="Explore" itineraries={itineraries} loading={loading} />
    </section>
  );
}

export default ExploreSection;
