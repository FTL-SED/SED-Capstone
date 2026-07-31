import './BannerGeneratorModal.css'
import { useState } from 'react'
import { generateBanner } from '../../../api/itinerary.js'

// Max banners per create session. Client-side cap (no itinerary row exists yet
// during the wizard); the backend rate limit is the real cost guardrail.
const MAX_BANNERS = 3

// Convert a base64 PNG the API returned into a File, so the chosen banner slots
// into form.coverImageFile exactly like a manual upload (same downstream path).
function base64ToFile(base64, mediaType) {
  const byteString = atob(base64)
  const bytes = new Uint8Array(byteString.length)
  for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i)
  return new File([bytes], 'ai-banner.png', { type: mediaType || 'image/png' })
}

// Modal for generating AI cover banners. Holds up to MAX_BANNERS generated
// images in local state so the user can flip back and pick a favorite; only the
// chosen one leaves the modal (via onUse) to become the itinerary cover.
function BannerGeneratorModal({ details = {}, onUse, onClose }) {
  const [promptText, setPromptText] = useState('');
  const [banners, setBanners] = useState([]); // [{ image, mediaType }]
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const atLimit = banners.length >= MAX_BANNERS;

  const handleGenerate = async () => {
    if (atLimit || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateBanner({ ...details, promptText });
      setBanners((prev) => {
        const next = [...prev, result];
        setSelectedIndex(next.length - 1);
        return next;
      });
    } catch (err) {
      const status = err?.response?.status;
      setError(
        status === 429
          ? 'You have generated too many banners. Please try again later.'
          : 'Could not generate a banner. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUse = () => {
    const chosen = banners[selectedIndex];
    if (!chosen) return;
    onUse(base64ToFile(chosen.image, chosen.mediaType));
  };

  const current = banners[selectedIndex];

  return (
    <div className="banner-modal__overlay" onClick={onClose}>
      <div className="banner-modal" onClick={(e) => e.stopPropagation()}>
        <header className="banner-modal__header">
          <h2>Generate a banner</h2>
          <p className="banner-modal__hint">
            Describe the vibe — we'll blend it with your trip details.
          </p>
        </header>

        <div className="banner-modal__preview">
          {loading && <div className="banner-modal__shimmer" />}
          {!loading && current && (
            <img
              src={`data:${current.mediaType};base64,${current.image}`}
              alt="Generated banner preview"
            />
          )}
          {!loading && !current && (
            <p className="banner-modal__empty">No banner yet — describe one and generate.</p>
          )}
        </div>

        {banners.length > 0 && (
          <div className="banner-modal__history">
            {banners.map((b, i) => (
              <button
                key={i}
                type="button"
                className={
                  'banner-modal__thumb' + (i === selectedIndex ? ' banner-modal__thumb--active' : '')
                }
                onClick={() => setSelectedIndex(i)}
              >
                <img src={`data:${b.mediaType};base64,${b.image}`} alt={`Banner ${i + 1}`} />
              </button>
            ))}
          </div>
        )}

        <textarea
          className="banner-modal__input"
          placeholder="e.g. warm watercolor sunset, cozy and inviting"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          maxLength={500}
          disabled={atLimit || loading}
        />

        <p className="banner-modal__counter">{banners.length} of {MAX_BANNERS} used</p>

        {error && <p className="banner-modal__error">{error}</p>}

        <div className="banner-modal__actions">
          <button type="button" className="banner-modal__cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="banner-modal__generate"
            onClick={handleGenerate}
            disabled={atLimit || loading}
          >
            {loading ? 'Generating…' : banners.length === 0 ? 'Generate' : 'Regenerate'}
          </button>
          <button
            type="button"
            className="banner-modal__use"
            onClick={handleUse}
            disabled={!current || loading}
          >
            Use this banner
          </button>
        </div>
      </div>
    </div>
  );
}

export default BannerGeneratorModal;
