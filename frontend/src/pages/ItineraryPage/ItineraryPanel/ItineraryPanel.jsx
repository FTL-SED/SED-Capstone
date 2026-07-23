import './ItineraryPanel.css'
import ActionBar from '../ActionBar/ActionBar.jsx'
import Title from '../Title/Title.jsx'
import Description from '../Description/Description.jsx'
import Author from '../Author/Author.jsx'
import WrittenItinerary from '../WrittenItinerary/WrittenItinerary.jsx'

// The left half of the split: the itinerary's title/description/author, the
// CRUD action bar, and the scrolling stop timeline — all in one panel.
function ItineraryPanel({
  isOwner, pins, title, description, author,
  liked, bookmarked, likeCount, isPublic,
  activeTab, onTabChange,
  onToggleLike, onToggleBookmark, onTogglePrivacy,
  onEdit, onDelete, onCopy,
}) {
  return (
    <div className="itinerary-panel">
      <header className="itinerary-panel__header">
        <Title text={title} />
        {description && <Description text={description} />}
        {author && <Author name={author} />}
      </header>
      <ActionBar
        isOwner={isOwner}
        liked={liked}
        bookmarked={bookmarked}
        likeCount={likeCount}
        isPublic={isPublic}
        onToggleLike={onToggleLike}
        onToggleBookmark={onToggleBookmark}
        onTogglePrivacy={onTogglePrivacy}
        onEdit={onEdit}
        onDelete={onDelete}
        onCopy={onCopy}
      />
      {/* Written / Visual tabs — shown only on narrow screens (CSS-hidden on
          desktop, where the written timeline and the map show side by side).
          Sitting below the header + action bar, they keep the title, author and
          like/save actions visible on both the written and visual views. */}
      <div className="itinerary-panel__tabs" role="tablist" aria-label="Itinerary view">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'written'}
          className={`itinerary-panel__tab${activeTab === 'written' ? ' itinerary-panel__tab--active' : ''}`}
          onClick={() => onTabChange('written')}
        >
          Written
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'visual'}
          className={`itinerary-panel__tab${activeTab === 'visual' ? ' itinerary-panel__tab--active' : ''}`}
          onClick={() => onTabChange('visual')}
        >
          Visual
        </button>
      </div>
      <div className="itinerary-panel__timeline">
        <WrittenItinerary pins={pins} />
      </div>
    </div>
  );
}

export default ItineraryPanel;
