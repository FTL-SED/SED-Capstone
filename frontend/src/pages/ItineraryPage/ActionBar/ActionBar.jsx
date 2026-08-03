import './ActionBar.css'
import { useState, useEffect, useRef } from 'react'
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
  onCopy,
  copied = false,
  visited,
  onMarkVisited,
  editing = false,
  onDelete,
  onExport,
  onAddStop,
  onChangeCover,
  onRemoveCover,
  hasCover = false,
}) {
  // The "Change cover" dropdown (edit toolbar): Upload new / Remove cover behind
  // one button, closed on any outside click — mirrors the Discover tags dropdown.
  const [coverMenuOpen, setCoverMenuOpen] = useState(false);
  const coverMenuRef = useRef(null);
  useEffect(() => {
    if (!coverMenuOpen) return;
    const handleClickOutside = (e) => {
      if (coverMenuRef.current && !coverMenuRef.current.contains(e.target)) {
        setCoverMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [coverMenuOpen]);

  // While the owner is editing the itinerary's metadata, the bar becomes an edit
  // toolbar: Delete, the public/private toggle, and the cover dropdown. Save
  // (checkmark) and Exit (back) now live as icon buttons on the banner, so the
  // social actions can't fire mid-edit.
  if (isOwner && editing) {
    return (
      <div className="action-bar action-bar--editing">
        <DeleteButton onClick={onDelete} />
        <PrivacyButton isPublic={isPublic} onClick={onTogglePrivacy} />
        <div className="action-bar__cover-menu" ref={coverMenuRef}>
          <button
            type="button"
            className="action-btn"
            aria-haspopup="true"
            aria-expanded={coverMenuOpen}
            onClick={() => setCoverMenuOpen((prev) => !prev)}
          >
            Change cover
            <span className="action-bar__cover-caret" aria-hidden="true">▾</span>
          </button>
          {coverMenuOpen && (
            <div className="action-bar__cover-options" role="menu">
              <button
                type="button"
                role="menuitem"
                className="action-bar__cover-option"
                onClick={() => { setCoverMenuOpen(false); onChangeCover(); }}
              >
                Upload new
              </button>
              {hasCover && (
                <button
                  type="button"
                  role="menuitem"
                  className="action-bar__cover-option action-bar__cover-option--remove"
                  onClick={() => { setCoverMenuOpen(false); onRemoveCover(); }}
                >
                  Remove cover
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="action-bar">
      {isOwner ? (
        <>
          <button type="button" className="action-btn action-bar__add-stop" onClick={onAddStop}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add stop
          </button>
          <VisitedButton visited={visited} onClick={onMarkVisited} />
          <LikeButton liked={liked} likeCount={likeCount} onClick={onToggleLike} />
          <BookmarkButton bookmarked={bookmarked} onClick={onToggleBookmark} />
          <button type="button" className="action-btn" onClick={onExport}>
            Share
          </button>
        </>
      ) : (
        <>
          <VisitedButton visited={visited} onClick={onMarkVisited} />
          <LikeButton liked={liked} likeCount={likeCount} onClick={onToggleLike} />
          <BookmarkButton bookmarked={bookmarked} onClick={onToggleBookmark} />
          <SaveCopyButton onClick={onCopy} copied={copied} />
          <button type="button" className="action-btn" onClick={onExport}>
            Share
          </button>
        </>
      )}
    </div>
  );
}

export default ActionBar;
