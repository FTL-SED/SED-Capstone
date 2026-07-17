import { useState, useEffect } from 'react'
import ExploreSection from './ExploreSection/ExploreSection.jsx'
import CreatedItinerariesSection from './CreatedItinerariesSection/CreatedItinerariesSection.jsx'
import LikedItinerariesSection from './LikedItinerariesSection/LikedItinerariesSection.jsx'
import BookmarkedItinerariesSection from './BookmarkedItinerariesSection/BookmarkedItinerariesSection.jsx'
import {
  listItineraries,
  getUserDashboard,
  likeItinerary,
  unlikeItinerary,
  bookmarkItinerary,
  removeBookmark,
} from '../../api/itinerary.js'
import './HomePage.css'

// HomePage is the single owner of "what have I liked / bookmarked". Keeping it
// here (an ancestor of both the Explore cards AND the Liked/Bookmarked bars)
// means one click updates everything at once, with no extra fetch. All backend
// calls go through the shared api/ client, which attaches auth automatically.
function HomePage() {
  // Explore's list, kept separate because Explore only shows these top-10.
  const [exploreItineraries, setExploreItineraries] = useState([]);
  // A pool of every itinerary we know about (explore + liked + bookmarked),
  // deduped by id. The Liked/Bookmarked bars filter THIS, so a like that isn't
  // in the Explore top-10 still shows up after a refresh.
  const [pool, setPool] = useState([]);
  const [loading, setLoading] = useState(true);
  // Just the ids I've liked / bookmarked, held in Sets for instant has()/add()/delete().
  const [likedIds, setLikedIds] = useState(() => new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState(() => new Set());

  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const currentUserId = currentUser?.id;

  // On load: fetch the Explore list AND ask the backend which itineraries I've
  // already liked/bookmarked. That second call is what makes the button state
  // survive a refresh.
  useEffect(() => {
    const load = async () => {
      // Signed-out visitors have no liked/bookmarked state to hydrate; just
      // drop the loading flag (done in finally) without any fetch.
      if (!currentUserId) return;

      try {
        const explore = await listItineraries({ scope: 'public', limit: 10 });
        setExploreItineraries(explore);

        // GET /users/:id returns my liked + bookmarked itineraries (owner-only).
        const me = await getUserDashboard(currentUserId);
        const liked = me.likedItineraries ?? [];
        const bookmarked = me.bookmarkedItineraries ?? [];
        setLikedIds(new Set(liked.map((it) => it.id)));
        setBookmarkedIds(new Set(bookmarked.map((it) => it.id)));

        // Merge all three sources into one deduped pool (by id) so the bars can
        // show liked/bookmarked items even if they're not in the Explore top-10.
        const byId = new Map();
        [...explore, ...liked, ...bookmarked].forEach((it) => byId.set(it.id, it));
        setPool([...byId.values()]);
      } catch (err) {
        console.error('Failed to load home page:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentUserId]);

  // Flip the id in the Set FIRST (screen updates instantly), then tell the
  // backend. If the backend rejects it, we put the Set back so the UI doesn't lie.
  const toggleLike = (id) => {
    const wasLiked = likedIds.has(id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      wasLiked ? next.delete(id) : next.add(id);
      return next;
    });

    const request = wasLiked ? unlikeItinerary(id) : likeItinerary(id);
    request.catch((err) => {
      console.error('Like failed, reverting:', err);
      setLikedIds((prev) => {
        const next = new Set(prev);
        wasLiked ? next.add(id) : next.delete(id);
        return next;
      });
    });
  };

  const toggleBookmark = (id) => {
    const wasBookmarked = bookmarkedIds.has(id);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      wasBookmarked ? next.delete(id) : next.add(id);
      return next;
    });

    const request = wasBookmarked ? removeBookmark(id) : bookmarkItinerary(id);
    request.catch((err) => {
      console.error('Bookmark failed, reverting:', err);
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        wasBookmarked ? next.add(id) : next.delete(id);
        return next;
      });
    });
  };

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
      <CreatedItinerariesSection />
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
