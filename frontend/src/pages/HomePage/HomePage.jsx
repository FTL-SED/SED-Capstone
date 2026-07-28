import { useQuery } from '@tanstack/react-query'
import ExploreSection from './ExploreSection/ExploreSection.jsx'
import CreatedItinerariesSection from './CreatedItinerariesSection/CreatedItinerariesSection.jsx'
import LikedItinerariesSection from './LikedItinerariesSection/LikedItinerariesSection.jsx'
import BookmarkedItinerariesSection from './BookmarkedItinerariesSection/BookmarkedItinerariesSection.jsx'
import VisitedItinerariesSection from './VisitedItinerariesSection/VisitedItinerariesSection.jsx'
import { listItineraries } from '../../api/itinerary.js'
import { useLikeBookmark } from '../../hooks/useLikeBookmark.js'
import { getCurrentUser } from '../../lib/currentUser.js'
import './HomePage.css'

// HomePage is the single owner of "what have I liked / bookmarked". Keeping it
// here (an ancestor of both the Explore cards AND the Liked/Bookmarked bars)
// means one click updates everything at once, with no extra fetch. All backend
// calls go through the shared api/ client, which attaches auth automatically.
function HomePage() {
  const currentUserId = getCurrentUser()?.id;

  // Explore's top-10 public list. Cached, so returning to Home is instant.
  const { data: exploreData, isLoading: exploreLoading } = useQuery({
    queryKey: ['itineraries', 'explore'],
    queryFn: () => listItineraries({ scope: 'public', limit: 10 }),
  });

  // Membership (which ids I've liked/bookmarked), the shared like-count map, and
  // race-safe toggling all live in the hook, which owns the ['dashboard', id]
  // query — the SINGLE source of truth shared with Discover/Itinerary. Both the
  // heart state AND the count are cached app-wide (the count via a shared
  // override map every card reads), so a toggle on any page re-renders them all.
  const { dashboard, likedIds, bookmarkedIds, toggleLike, toggleBookmark } = useLikeBookmark({
    userId: currentUserId,
  });

  const exploreItineraries = exploreData ?? [];
  const createdItineraries = dashboard?.createdItineraries ?? [];
  const likedItineraries = dashboard?.likedItineraries ?? [];
  const bookmarkedItineraries = dashboard?.bookmarkedItineraries ?? [];
  const visitedIds = new Set((dashboard?.visitedItineraries ?? []).map((it) => it.id));
  // Signed-in visitors also wait on their dashboard (created/liked/bookmarked);
  // signed-out visitors only have the Explore feed.
  const loading = currentUserId ? exploreLoading || !dashboard : exploreLoading;

  // A pool of every itinerary we know about (explore + created + liked +
  // bookmarked), deduped by id. The Liked/Bookmarked bars filter THIS, so a
  // liked item that isn't in the Explore top-10 still shows up.
  const pool = (() => {
    const byId = new Map();
    [...exploreItineraries, ...createdItineraries, ...likedItineraries, ...bookmarkedItineraries]
      .forEach((it) => byId.set(it.id, it));
    return [...byId.values()];
  })();

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
      <VisitedItinerariesSection
        itineraries={pool.filter((it) => visitedIds.has(it.id))}
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
