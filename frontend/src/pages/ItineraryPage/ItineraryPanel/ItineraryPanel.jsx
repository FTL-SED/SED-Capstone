import './ItineraryPanel.css'
import { useEffect, useRef, useState } from 'react'
import ActionBar from '../ActionBar/ActionBar.jsx'
import Title from '../Title/Title.jsx'
import Description from '../Description/Description.jsx'
import Author from '../Author/Author.jsx'
import WrittenItinerary from '../WrittenItinerary/WrittenItinerary.jsx'
import AddStopPanel from '../AddStopPanel/AddStopPanel.jsx'
import ConfirmModal from '../ConfirmModal/ConfirmModal.jsx'

// The left half of the split: the itinerary's title/description/author, the
// CRUD action bar, and the scrolling stop timeline — all in one panel.
function ItineraryPanel({
  isOwner, pins, maxBudgetPerPerson, title, description, author, coverImageUrl,
  liked, bookmarked, likeCount, isPublic, visited,
  activeTab, onTabChange,
  onToggleLike, onToggleBookmark, onTogglePrivacy,
  onDelete, onCopy, copied, onMarkVisited,
  onExport,
  onRemoveStop, onEditStop, onEditCost, onAddStop, meetingPoint, radiusMi, onReorderStops,
  onEditItinerary, actionBusy,
}) {
  // Per-person total from the stops' effective prices. This is now the itinerary's
  // budget per person — the server recomputes maxBudgetPerPerson as this same sum
  // whenever a stop is added, edited, or removed, so the two agree. The budget is
  // NOT edited directly anymore; it's driven by the per-stop costs (edit those).
  const totalPerPerson = (pins ?? []).reduce((sum, p) => sum + (p.pricePerPerson ?? 0), 0);
  // Prefer the server's stored figure once it's been computed; fall back to the
  // live sum (e.g. a legacy itinerary whose budget was never recalculated).
  const budgetPerPerson = typeof maxBudgetPerPerson === 'number' ? maxBudgetPerPerson : totalPerPerson;
  const hasBudget = (pins ?? []).length > 0 || typeof maxBudgetPerPerson === 'number';

  // Owner inline-edit of the itinerary's own metadata (title/description/cover).
  // One Edit toggle flips the panel into edit mode; Save commits them as a batch
  // (see ItineraryPage.handleEditItinerary). Not optimistic — a cover upload is
  // async and can fail, so we stay in edit mode until it lands. The budget is no
  // longer edited here (it's derived from the per-stop costs on the timeline).
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [error, setError] = useState('');
  const coverInputRef = useRef(null);
  // Whether the "Add a stop" modal (owner-only, opened from the action bar) is
  // showing. The modal owns its own search state; this just gates it open/closed.
  const [addStopOpen, setAddStopOpen] = useState(false);
  // View-mode collapse: hides the banner, description/budget and the action bar
  // down to a slim title bar, so the stop timeline gets the whole panel. Only
  // applies when not editing (editing always shows the full form).
  const [collapsed, setCollapsed] = useState(false);
  // Whether the "remove cover" confirmation dialog is open.
  const [confirmRemoveCoverOpen, setConfirmRemoveCoverOpen] = useState(false);
  // The cover image renders before its bytes finish downloading (AI banner PNGs
  // are large), so the gradient behind it flashed through. Track load state and
  // cover it with a shimmer until the image actually paints.
  const [coverLoaded, setCoverLoaded] = useState(false);

  // Revoke the object URL when the staged preview changes or the panel unmounts,
  // so we never leak the blob URL created for the local cover preview.
  useEffect(() => {
    return () => { if (coverPreview) URL.revokeObjectURL(coverPreview); };
  }, [coverPreview]);

  const beginEdit = () => {
    setDraftTitle(title ?? '');
    setDraftDescription(description ?? '');
    setCoverFile(null);
    setCoverPreview(null);
    setCoverRemoved(false);
    setError('');
    setEditing(true);
  };

  const cancelEdit = () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(null);
    setCoverPreview(null);
    setCoverRemoved(false);
    setError('');
    setEditing(false);
  };

  const onCoverSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setCoverRemoved(false); // picking a file un-stages a removal
  };

  // Removing the cover is confirmed first via a branded dialog (below), then
  // staged: drop any picked file/preview and hide the banner locally. The
  // removal is committed on Save (see ItineraryPage.handleEditItinerary).
  const confirmRemoveCover = () => {
    setConfirmRemoveCoverOpen(false);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(null);
    setCoverPreview(null);
    setCoverRemoved(true);
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  const saveEdit = async () => {
    const trimmedTitle = draftTitle.trim();
    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }

    const changes = {
      title: trimmedTitle,
      description: draftDescription.trim() === '' ? null : draftDescription,
    };

    const ok = await onEditItinerary(changes, coverFile, coverRemoved);
    if (ok) {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverFile(null);
      setCoverPreview(null);
      setCoverRemoved(false);
      setError('');
      setEditing(false);
    } else {
      // Save failed upstream (ItineraryPage alerted). Stay in edit mode with the
      // drafts intact so the user can retry.
      setError('Could not save. Please try again.');
    }
  };

  // The cover shown in the banner: the staged preview while editing, else the
  // persisted image — unless removal is staged, which hides it locally.
  const bannerImg = coverRemoved ? null : (coverPreview ?? coverImageUrl);

  // Reset the loaded flag when the shown image changes, so a new cover (or a
  // staged edit preview) re-shows the shimmer until it too has painted. Done by
  // adjusting state during render (the React-recommended alternative to a
  // setState-in-effect) — track the src the flag currently applies to.
  const [loadedSrc, setLoadedSrc] = useState(null);
  if (coverLoaded && loadedSrc !== bannerImg) {
    setCoverLoaded(false);
  }

  // Editing always forces the full form open, so the collapse only applies in
  // view mode.
  const showCollapsed = collapsed && !editing;
  // Keys the animated sections by mode so they remount — and thus replay their
  // staggered entrance animation — when toggling into/out of edit mode, not just
  // when expanding from collapsed. The banner image is intentionally NOT keyed,
  // so it doesn't reload/reshimmer on the edit toggle.
  const viewKey = editing ? 'edit' : 'view';

  return (
    <div className="itinerary-panel">
      {/* Collapsed view: a slim title bar with an expand arrow replaces the whole
          banner + description + action bar, so the stop timeline gets the panel. */}
      {showCollapsed && (
        <button
          type="button"
          className="itinerary-panel__collapsed-bar"
          onClick={() => setCollapsed(false)}
          aria-expanded="false"
          aria-label="Show details"
        >
          <svg className="itinerary-panel__collapsed-caret" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18l6-6-6-6" />
          </svg>
          <span className="itinerary-panel__collapsed-title">{title}</span>
        </button>
      )}
      {/* Photo banner à la Google Maps' place sidebar: the cover image fills the
          header, a bottom-weighted scrim keeps the overlaid title/author legible,
          and the description sits below on the readable surface strip. A warm
          gradient always backs the banner, so a missing/broken image degrades
          into the product's golden-hour identity instead of a broken box. */}
      {!showCollapsed && (
      <>
      <header className="itinerary-panel__header">
        <div className="itinerary-panel__banner">
          {!bannerImg && (
            <span className="itinerary-panel__banner-mark" aria-hidden="true" />
          )}
          {bannerImg && (
            <img
              className="itinerary-panel__banner-img"
              src={bannerImg}
              alt={`Cover photo for ${title || 'this itinerary'}`}
              onLoad={() => { setCoverLoaded(true); setLoadedSrc(bannerImg); }}
              onError={(e) => {
                // A broken cover: hide the img and clear the shimmer so the
                // banner degrades to the branded gradient instead of shimmering
                // forever.
                e.currentTarget.style.display = 'none';
                setCoverLoaded(true);
                setLoadedSrc(bannerImg);
              }}
            />
          )}
          {/* Shimmer over the gradient while the cover downloads, so the large AI
              banner PNGs don't flash the fallback gradient before they paint. */}
          {bannerImg && !coverLoaded && (
            <span className="itinerary-panel__banner-shimmer" aria-hidden="true" />
          )}
          <div className="itinerary-panel__banner-scrim" aria-hidden="true" />
          {/* Collapse control (all viewers, view mode): tucks the banner +
              description + actions away so the stop timeline gets the whole
              panel. Sits top-left; hidden while editing (that corner is the
              back button there). */}
          {!editing && (
            <button
              type="button"
              className="itinerary-panel__banner-icon itinerary-panel__banner-icon--collapse"
              onClick={() => setCollapsed(true)}
              aria-label="Hide details"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 15l-6-6-6 6" />
              </svg>
            </button>
          )}
          {/* Owner banner controls. In view mode a single gear icon (top-right)
              enters edit mode. In edit mode a back arrow (top-left) exits and a
              save (checkmark) icon (top-right) commits the edits — the destructive
              Delete now lives in the edit toolbar below. */}
          {isOwner && !editing && (
            <button
              type="button"
              className="itinerary-panel__banner-icon itinerary-panel__banner-icon--settings"
              onClick={beginEdit}
              aria-label="Edit itinerary"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}
          {isOwner && editing && (
            <>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="itinerary-panel__cover-input"
                onChange={onCoverSelected}
                hidden
              />
              <button
                type="button"
                className="itinerary-panel__banner-icon itinerary-panel__banner-icon--back"
                onClick={cancelEdit}
                aria-label="Discard changes and exit edit mode"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                className="itinerary-panel__banner-icon itinerary-panel__banner-icon--save"
                onClick={saveEdit}
                disabled={actionBusy}
                aria-label="Save changes"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </button>
            </>
          )}
          <div key={`bc-${viewKey}`} className="itinerary-panel__banner-content itinerary-panel__reveal" style={{ '--reveal-i': 0 }}>
            <Title text={title} editing={editing} value={draftTitle} onChange={setDraftTitle} />
            {author && <Author name={author} />}
          </div>
        </div>
        {(description || hasBudget || editing) && (
          <div key={`meta-${viewKey}`} className="itinerary-panel__meta itinerary-panel__reveal" style={{ '--reveal-i': 1 }}>
            <Description
              text={description}
              editing={editing}
              value={draftDescription}
              onChange={setDraftDescription}
            />
            {/* Budget per person is derived from the stops' costs (edit those on
                the timeline), so there's no budget field here even in edit mode.
                It's shown read-only in both modes as the recalculated total. */}
            {hasBudget && (
              <p className="itinerary-panel__budget">
                <span>${budgetPerPerson}/person</span>
              </p>
            )}
            {editing && error && <span className="itinerary-panel__edit-error">{error}</span>}
          </div>
        )}
      </header>
      <div key={`ab-${viewKey}`} className="itinerary-panel__reveal" style={{ '--reveal-i': 2 }}>
      <ActionBar
        isOwner={isOwner}
        liked={liked}
        bookmarked={bookmarked}
        likeCount={likeCount}
        isPublic={isPublic}
        onToggleLike={onToggleLike}
        onToggleBookmark={onToggleBookmark}
        onTogglePrivacy={onTogglePrivacy}
        onCopy={onCopy}
        copied={copied}
        visited={visited}
        onMarkVisited={onMarkVisited}
        editing={editing}
        onDelete={onDelete}
        onExport={onExport}
        onAddStop={() => setAddStopOpen(true)}
        onChangeCover={() => coverInputRef.current?.click()}
        onRemoveCover={() => setConfirmRemoveCoverOpen(true)}
        hasCover={Boolean(bannerImg)}
      />
      </div>
      </>
      )}
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
          onEditStop={onEditStop}
          onEditCost={onEditCost}
          onReorderStops={onReorderStops}
        />
      </div>
      {isOwner && (
        <AddStopPanel
          open={addStopOpen}
          onClose={() => setAddStopOpen(false)}
          onAddStop={onAddStop}
          meetingPoint={meetingPoint}
          radiusMi={radiusMi}
        />
      )}
      <ConfirmModal
        open={confirmRemoveCoverOpen}
        title="Remove the cover photo?"
        message="The banner will fall back to the default golden-hour cover. You can upload a new one anytime. This takes effect when you save your changes."
        confirmLabel="Remove cover"
        cancelLabel="Keep cover"
        danger
        onConfirm={confirmRemoveCover}
        onCancel={() => setConfirmRemoveCoverOpen(false)}
      />
    </div>
  );
}

export default ItineraryPanel;
