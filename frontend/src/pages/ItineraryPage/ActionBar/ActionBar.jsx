import './ActionBar.css'
import DeleteButton from '../DeleteButton/DeleteButton.jsx'
import BookmarkButton from '../BookmarkButton/BookmarkButton.jsx'
import SaveCopyButton from '../SaveCopyButton/SaveCopyButton.jsx'
import LikeButton from '../LikeButton/LikeButton.jsx'
import VisitedButton from '../VisitedButton/VisitedButton.jsx'
import PrivacyButton from '../PrivacyButton/PrivacyButton.jsx'
import ExportButton from '../ExportButton/ExportButton.jsx'

function ActionBar({
  isOwner = true,
  liked,
  bookmarked,
  likeCount,
  isPublic,
  onToggleLike,
  onToggleBookmark,
  onTogglePrivacy,
  onDelete,
  onCopy,
  copied = false,
  visited,
  onMarkVisited,
  editing = false,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  editBusy = false,
  onCopyText,
  onEmail,
}) {
  // While the owner is editing the itinerary's metadata, the bar collapses to
  // Save/Cancel so the destructive/social actions can't fire mid-edit.
  if (isOwner && editing) {
    return (
      <div className="action-bar">
        <button type="button" className="action-btn action-bar__save" onClick={onSaveEdit} disabled={editBusy}>
          {editBusy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="action-btn action-bar__cancel" onClick={onCancelEdit} disabled={editBusy}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="action-bar">
      {isOwner ? (
        <>
          <button type="button" className="action-btn action-bar__edit" onClick={onEdit}>
            Edit
          </button>
          <DeleteButton onClick={onDelete} />
          <PrivacyButton isPublic={isPublic} onClick={onTogglePrivacy} />
          <BookmarkButton bookmarked={bookmarked} onClick={onToggleBookmark} />
          <LikeButton liked={liked} likeCount={likeCount} onClick={onToggleLike} />
          <VisitedButton visited={visited} onClick={onMarkVisited} />
          <ExportButton isOwner={isOwner} onCopy={onCopyText} onEmail={onEmail} />
        </>
      ) : (
        <>
          <BookmarkButton bookmarked={bookmarked} onClick={onToggleBookmark} />
          <SaveCopyButton onClick={onCopy} copied={copied} />
          <LikeButton liked={liked} likeCount={likeCount} onClick={onToggleLike} />
          <VisitedButton visited={visited} onClick={onMarkVisited} />
          <ExportButton isOwner={isOwner} onCopy={onCopyText} onEmail={onEmail} />
        </>
      )}
    </div>
  );
}

export default ActionBar;
