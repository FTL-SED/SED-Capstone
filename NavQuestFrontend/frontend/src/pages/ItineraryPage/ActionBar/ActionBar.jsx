import './ActionBar.css'
import EditButton from '../EditButton/EditButton.jsx'
import SaveButton from '../SaveButton/SaveButton.jsx'
import DeleteButton from '../DeleteButton/DeleteButton.jsx'
import BookmarkButton from '../BookmarkButton/BookmarkButton.jsx'
import SaveCopyButton from '../SaveCopyButton/SaveCopyButton.jsx'
import LikeButton from '../LikeButton/LikeButton.jsx'

function ActionBar({ isOwner = true }) {
  return (
    <div className="action-bar">
      {isOwner ? (
        <>
          <EditButton />
          <SaveButton />
          <DeleteButton />
          <LikeButton />
        </>
      ) : (
        <>
          <BookmarkButton />
          <SaveCopyButton />
          <LikeButton />
        </>
      )}
    </div>
  );
}

export default ActionBar;
