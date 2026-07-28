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
  onDelete, onCopy, onMarkVisited,
  onRemoveStop, onEditStop, onAddStop,
  onEditItinerary, actionBusy,
}) {
  // Per-person total from the stops' prices. When it exceeds the trip's budget,
  // the day was kept within the generator's grace band (a small overage beats
  // swapping the AI plan for a worse one) — surface it honestly rather than hide.
  const totalPerPerson = (pins ?? []).reduce((sum, p) => sum + (p.pricePerPerson ?? 0), 0);
  const hasBudget = typeof maxBudgetPerPerson === 'number';
  const overBudgetBy = hasBudget ? totalPerPerson - maxBudgetPerPerson : 0;

  // Owner inline-edit of the itinerary's own metadata (title/description/budget/
  // cover). One Edit toggle flips the panel into edit mode; Save commits all
  // four as a batch (see ItineraryPage.handleEditItinerary). Not optimistic —
  // a cover upload is async and can fail, so we stay in edit mode until it lands.
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftBudget, setDraftBudget] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [error, setError] = useState('');
  const coverInputRef = useRef(null);

  // Revoke the object URL when the staged preview changes or the panel unmounts,
  // so we never leak the blob URL created for the local cover preview.
  useEffect(() => {
    return () => { if (coverPreview) URL.revokeObjectURL(coverPreview); };
  }, [coverPreview]);

  const beginEdit = () => {
    setDraftTitle(title ?? '');
    setDraftDescription(description ?? '');
    setDraftBudget(hasBudget ? String(maxBudgetPerPerson) : '');
    setCoverFile(null);
    setCoverPreview(null);
    setError('');
    setEditing(true);
  };

  const cancelEdit = () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(null);
    setCoverPreview(null);
    setError('');
    setEditing(false);
  };

  const onCoverSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const saveEdit = async () => {
    const trimmedTitle = draftTitle.trim();
    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }
    // Blank budget clears it (null); otherwise it must be a non-negative number.
    let budget;
    if (draftBudget.trim() === '') {
      budget = null;
    } else {
      const n = Number(draftBudget);
      if (!Number.isFinite(n) || n < 0) {
        setError('Budget must be a non-negative number.');
        return;
      }
      budget = n;
    }

    const changes = {
      title: trimmedTitle,
      description: draftDescription.trim() === '' ? null : draftDescription,
      maxBudgetPerPerson: budget,
    };

    const ok = await onEditItinerary(changes, coverFile);
    if (ok) {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverFile(null);
      setCoverPreview(null);
      setError('');
      setEditing(false);
    } else {
      // Save failed upstream (ItineraryPage alerted). Stay in edit mode with the
      // drafts intact so the user can retry.
      setError('Could not save. Please try again.');
    }
  };

  // The cover shown in the banner: the staged preview while editing, else the
  // persisted image.
  const bannerImg = coverPreview ?? coverImageUrl;

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
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
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
            {editing ? (
              <label className="itinerary-panel__budget-edit">
                Budget per person ($)
                <input
                  type="number"
                  min="0"
                  className="itinerary-panel__budget-input"
                  value={draftBudget}
                  onChange={(e) => setDraftBudget(e.target.value)}
                  placeholder="No budget"
                />
              </label>
            ) : (
              hasBudget && (
                <p className={`itinerary-panel__budget${overBudgetBy > 0 ? ' itinerary-panel__budget--over' : ''}`}>
                  ${totalPerPerson}/person of ${maxBudgetPerPerson} budget
                  {overBudgetBy > 0 && <span className="itinerary-panel__budget-badge"> · over by ${overBudgetBy}</span>}
                </p>
              )
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
        visited={visited}
        onMarkVisited={onMarkVisited}
        editing={editing}
        onEdit={beginEdit}
        onSaveEdit={saveEdit}
        onCancelEdit={cancelEdit}
        editBusy={actionBusy}
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
          onAddStop={onAddStop}
        />
      </div>
    </div>
  );
}

export default ItineraryPanel;
