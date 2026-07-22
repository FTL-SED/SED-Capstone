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
  liked, bookmarked, likeCount, onToggleLike, onToggleBookmark,
  onDelete, onCopy,
  onRemoveStop, onAddStop,
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
        onToggleLike={onToggleLike}
        onToggleBookmark={onToggleBookmark}
        onDelete={onDelete}
        onCopy={onCopy}
      />
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
