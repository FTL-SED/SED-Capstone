import './ActionBar.css'
import DeleteButton from '../DeleteButton/DeleteButton.jsx'
import BookmarkButton from '../BookmarkButton/BookmarkButton.jsx'
import SaveCopyButton from '../SaveCopyButton/SaveCopyButton.jsx'
import LikeButton from '../LikeButton/LikeButton.jsx'
import VisitedButton from '../VisitedButton/VisitedButton.jsx'
import PrivacyButton from '../PrivacyButton/PrivacyButton.jsx'

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
  visited,
  onMarkVisited,
}) {
  return (
    <div className="action-bar">
      {isOwner ? (
        <>
          <DeleteButton onClick={onDelete} />
          <PrivacyButton isPublic={isPublic} onClick={onTogglePrivacy} />
          <BookmarkButton bookmarked={bookmarked} onClick={onToggleBookmark} />
          <LikeButton liked={liked} likeCount={likeCount} onClick={onToggleLike} />
          <VisitedButton visited={visited} onClick={onMarkVisited} />
        </>
      ) : (
        <>
          <BookmarkButton bookmarked={bookmarked} onClick={onToggleBookmark} />
          <SaveCopyButton onClick={onCopy} />
          <LikeButton liked={liked} likeCount={likeCount} onClick={onToggleLike} />
          <VisitedButton visited={visited} onClick={onMarkVisited} />
        </>
      )}
    </div>
  );
}

export default ActionBar;
