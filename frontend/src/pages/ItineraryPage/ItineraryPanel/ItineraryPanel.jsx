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
  onEdit, onDelete, onCopy,
  editMode, onEditDetails, onRemoveStop, onAddStop,
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
        editing={editMode}
        liked={liked}
        bookmarked={bookmarked}
        likeCount={likeCount}
        onToggleLike={onToggleLike}
        onToggleBookmark={onToggleBookmark}
        onEdit={onEdit}
        onDelete={onDelete}
        onCopy={onCopy}
      />
      {editMode && (
        <div className="itinerary-panel__edit-bar">
          <span className="itinerary-panel__edit-hint">Editing stops — remove or add places below.</span>
          <button type="button" className="action-btn" onClick={onEditDetails}>
            Edit trip details
          </button>
        </div>
      )}
      <div className="itinerary-panel__timeline">
        <WrittenItinerary
          pins={pins}
          editMode={editMode}
          onRemoveStop={onRemoveStop}
          onAddStop={onAddStop}
        />
      </div>
    </div>
  );
}

export default ItineraryPanel;
