import './ActionBar.css'
import EditButton from '../EditButton/EditButton.jsx'
import DeleteButton from '../DeleteButton/DeleteButton.jsx'
import BookmarkButton from '../BookmarkButton/BookmarkButton.jsx'
import SaveCopyButton from '../SaveCopyButton/SaveCopyButton.jsx'
import LikeButton from '../LikeButton/LikeButton.jsx'

function ActionBar({
  isOwner = true,
  editing = false,
  liked,
  bookmarked,
  likeCount,
  onToggleLike,
  onToggleBookmark,
  onEdit,
  onDelete,
  onCopy,
}) {
  return (
    <div className="action-bar">
      {isOwner ? (
        <>
          <EditButton onClick={onEdit} active={editing} />
          <DeleteButton onClick={onDelete} />
          <BookmarkButton bookmarked={bookmarked} onClick={onToggleBookmark} />
          <LikeButton liked={liked} likeCount={likeCount} onClick={onToggleLike} />
        </>
      ) : (
        <>
          <BookmarkButton bookmarked={bookmarked} onClick={onToggleBookmark} />
          <SaveCopyButton onClick={onCopy} />
          <LikeButton liked={liked} likeCount={likeCount} onClick={onToggleLike} />
        </>
      )}
    </div>
  );
}

export default ActionBar;
