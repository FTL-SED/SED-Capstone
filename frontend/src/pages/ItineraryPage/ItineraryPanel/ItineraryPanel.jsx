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
      <div className="itinerary-panel__timeline">
        <WrittenItinerary pins={pins} />
      </div>
    </div>
  );
}

export default ItineraryPanel;
