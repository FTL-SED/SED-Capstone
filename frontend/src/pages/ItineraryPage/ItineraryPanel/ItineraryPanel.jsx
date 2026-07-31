import './ItineraryPanel.css'
import { useEffect, useRef, useState } from 'react'
import ActionBar from '../ActionBar/ActionBar.jsx'
import Title from '../Title/Title.jsx'
import Description from '../Description/Description.jsx'
import Author from '../Author/Author.jsx'
import WrittenItinerary from '../WrittenItinerary/WrittenItinerary.jsx'

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

  // Stage removal of the existing cover: drop any picked file/preview and hide
  // the banner locally. Committed on Save (see ItineraryPage.handleEditItinerary).
  const onRemoveCover = () => {
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

  return (
    <div className="itinerary-panel">
      {/* Photo banner à la Google Maps' place sidebar: the cover image fills the
          header, a bottom-weighted scrim keeps the overlaid title/author legible,
          and the description sits below on the readable surface strip. A warm
          gradient always backs the banner, so a missing/broken image degrades
          into the product's golden-hour identity instead of a broken box. */}
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
          {editing && (
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
                className="itinerary-panel__cover-change"
                onClick={() => coverInputRef.current?.click()}
              >
                Change cover
              </button>
              {bannerImg && (
                <button
                  type="button"
                  className="itinerary-panel__cover-remove"
                  onClick={onRemoveCover}
                >
                  Remove cover
                </button>
              )}
            </>
          )}
          <div className="itinerary-panel__banner-content">
            <Title text={title} editing={editing} value={draftTitle} onChange={setDraftTitle} />
            {author && <Author name={author} />}
          </div>
        </div>
        {(description || hasBudget || editing) && (
          <div className="itinerary-panel__meta">
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
                ${budgetPerPerson}/person
              </p>
            )}
            {editing && error && <span className="itinerary-panel__edit-error">{error}</span>}
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
        copied={copied}
        visited={visited}
        onMarkVisited={onMarkVisited}
        editing={editing}
        onEdit={beginEdit}
        onSaveEdit={saveEdit}
        onCancelEdit={cancelEdit}
        editBusy={actionBusy}
        onExport={onExport}
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
          onEditStop={onEditStop}
          onEditCost={onEditCost}
          onAddStop={onAddStop}
          meetingPoint={meetingPoint}
          radiusMi={radiusMi}
          onReorderStops={onReorderStops}
        />
      </div>
    </div>
  );
}

export default ItineraryPanel;
