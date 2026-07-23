import './ItineraryPanel.css'
import ActionBar from '../ActionBar/ActionBar.jsx'
import Title from '../Title/Title.jsx'
import Description from '../Description/Description.jsx'
import Author from '../Author/Author.jsx'
import WrittenItinerary from '../WrittenItinerary/WrittenItinerary.jsx'

// The left half of the split: the itinerary's title/description/author, the
// CRUD action bar, and the scrolling stop timeline — all in one panel.
function ItineraryPanel({
  isOwner, pins, title, description, author, coverImageUrl,
  liked, bookmarked, likeCount, isPublic,
  activeTab, onTabChange,
  onToggleLike, onToggleBookmark, onTogglePrivacy,
  onDelete, onCopy,
  onRemoveStop, onAddStop,
}) {
  return (
    <div className="itinerary-panel">
      {/* Photo banner à la Google Maps' place sidebar: the cover image fills the
          header, a bottom-weighted scrim keeps the overlaid title/author legible,
          and the description sits below on the readable surface strip. A warm
          gradient always backs the banner, so a missing/broken image degrades
          into the product's golden-hour identity instead of a broken box. */}
      <header className="itinerary-panel__header">
        <div className="itinerary-panel__banner">
          {!coverImageUrl && (
            <span className="itinerary-panel__banner-mark" aria-hidden="true" />
          )}
          {coverImageUrl && (
            <img
              className="itinerary-panel__banner-img"
              src={coverImageUrl}
              alt={`Cover photo for ${title || 'this itinerary'}`}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          <div className="itinerary-panel__banner-scrim" aria-hidden="true" />
          <div className="itinerary-panel__banner-content">
            <Title text={title} />
            {author && <Author name={author} />}
          </div>
        </div>
        {description && (
          <div className="itinerary-panel__meta">
            <Description text={description} />
          </div>
        )}
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
        <WrittenItinerary
          pins={pins}
          editable={isOwner}
          onRemoveStop={onRemoveStop}
          onAddStop={onAddStop}
        />
      </div>
    </div>
  );
}

export default ItineraryPanel;
