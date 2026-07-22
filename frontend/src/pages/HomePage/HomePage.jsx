import { useState, useEffect } from 'react'
import ExploreSection from './ExploreSection/ExploreSection.jsx'
import CreatedItinerariesSection from './CreatedItinerariesSection/CreatedItinerariesSection.jsx'
import LikedItinerariesSection from './LikedItinerariesSection/LikedItinerariesSection.jsx'
import BookmarkedItinerariesSection from './BookmarkedItinerariesSection/BookmarkedItinerariesSection.jsx'
import { listItineraries, getUserDashboard } from '../../api/itinerary.js'
import { useLikeBookmark } from '../../hooks/useLikeBookmark.js'
import { getCurrentUser } from '../../lib/currentUser.js'
import './HomePage.css'

// HomePage is the single owner of "what have I liked / bookmarked". Keeping it
// here (an ancestor of both the Explore cards AND the Liked/Bookmarked bars)
// means one click updates everything at once, with no extra fetch. All backend
// calls go through the shared api/ client, which attaches auth automatically.
function HomePage() {
  // Explore's list, kept separate because Explore only shows these top-10.
  const [exploreItineraries, setExploreItineraries] = useState([]);
  // The current user's own itineraries, shown in the "Created" carousel.
  const [createdItineraries, setCreatedItineraries] = useState([]);
  // A pool of every itinerary we know about (explore + liked + bookmarked),
  // deduped by id. The Liked/Bookmarked bars filter THIS, so a like that isn't
  // in the Explore top-10 still shows up after a refresh.
  const [pool, setPool] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUserId = getCurrentUser()?.id;

  // Like/bookmark state (which ids I've liked/bookmarked) + race-safe toggling
  // lives in the shared hook. The like COUNT lives in our own itinerary arrays,
  // so we hand the hook callbacks to bump it optimistically (delta) and overwrite
  // it with the server's authoritative value — across both Explore and the pool.
  const bumpLikeCount = (id, delta) => {
    const bump = (it) =>
      it.id === id ? { ...it, likeCount: Math.max(0, (it.likeCount ?? 0) + delta) } : it;
    setExploreItineraries((prev) => prev.map(bump));
    setPool((prev) => prev.map(bump));
  };
  const setLikeCount = (id, likeCount) => {
    const apply = (it) => (it.id === id ? { ...it, likeCount } : it);
    setExploreItineraries((prev) => prev.map(apply));
    setPool((prev) => prev.map(apply));
  };
  const { likedIds, bookmarkedIds, toggleLike, toggleBookmark, hydrate } = useLikeBookmark({
    onLikeDelta: bumpLikeCount,
    onLikeCount: setLikeCount,
  });

  // On load: fetch the Explore list AND ask the backend which itineraries I've
  // already liked/bookmarked. That second call is what makes the button state
  // survive a refresh.
  useEffect(() => {
    const load = async () => {
      // Signed-out visitors have no liked/bookmarked state to hydrate; drop the
      // loading flag and skip the fetch. (Must set it here, not in the try's
      // finally, since the early return would otherwise leave loading stuck on.)
      if (!currentUserId) {
        setLoading(false);
        return;
      }

      try {
        const explore = await listItineraries({ scope: 'public', limit: 10 });
        setExploreItineraries(explore);

        // GET /users/:id returns my created + liked + bookmarked itineraries.
        const me = await getUserDashboard(currentUserId);
        const created = me.createdItineraries ?? [];
        const liked = me.likedItineraries ?? [];
        const bookmarked = me.bookmarkedItineraries ?? [];
        setCreatedItineraries(created);
        hydrate({ liked: liked.map((it) => it.id), bookmarked: bookmarked.map((it) => it.id) });

        // Merge all sources into one deduped pool (by id) so the bars can show
        // liked/bookmarked items even if they're not in the Explore top-10.
        const byId = new Map();
        [...explore, ...created, ...liked, ...bookmarked].forEach((it) => byId.set(it.id, it));
        setPool([...byId.values()]);
      } catch (err) {
        console.error('Failed to load home page:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentUserId, hydrate]);

  return (
    <div className="home-page">
      <ExploreSection
        itineraries={exploreItineraries}
        loading={loading}
        likedIds={likedIds}
        bookmarkedIds={bookmarkedIds}
        onToggleLike={toggleLike}
        onToggleBookmark={toggleBookmark}
      />
      <CreatedItinerariesSection
        itineraries={pool.filter((it) => createdItineraries.some((c) => c.id === it.id))}
        loading={loading}
        likedIds={likedIds}
        bookmarkedIds={bookmarkedIds}
        onToggleLike={toggleLike}
        onToggleBookmark={toggleBookmark}
      />
      {/* The Liked/Bookmarked bars are just the pool filtered by the Sets.
          They read the same state a click just changed, so they update live with
          no refetch. */}
      <LikedItinerariesSection
        itineraries={pool.filter((it) => likedIds.has(it.id))}
        loading={loading}
        likedIds={likedIds}
        bookmarkedIds={bookmarkedIds}
        onToggleLike={toggleLike}
        onToggleBookmark={toggleBookmark}
      />
      <BookmarkedItinerariesSection
        itineraries={pool.filter((it) => bookmarkedIds.has(it.id))}
        loading={loading}
        likedIds={likedIds}
        bookmarkedIds={bookmarkedIds}
        onToggleLike={toggleLike}
        onToggleBookmark={toggleBookmark}
      />
    </div>
  );
}

export default HomePage;
