import './Step3_Finish.css'
import { useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ItineraryDetailsPreview from '../ItineraryDetailsPreview/ItineraryDetailsPreview.jsx'
import PrivacyField from '../PrivacyField/PrivacyField.jsx'
import FinishButton from '../FinishButton/FinishButton.jsx'
import BackButton from '../../../components/Inputs/BackButton/BackButton.jsx'
import TextInput from '../../../components/Inputs/TextInput/TextInput.jsx'

// The final review step. On finish we hand the collected form to /loading,
// which runs recommend + generate as ONE phase and then navigates to the
// itinerary (or back here on failure). Keeping the two API calls off this step
// means a single loading screen instead of an inline two-phase button.
function Step3_Finish({ form, update, onBack, goTo }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Build an object URL for the chosen file so the thumbnail updates live.
  const preview = useMemo(() => {
    const file = form.coverImageFile;
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [form.coverImageFile]);

  // Revoke the object URL when it changes to avoid blob leaks.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    update('coverImageFile', file);
  };

  const handleRemoveImage = () => {
    update('coverImageFile', null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFinish = () => {
    navigate('/loading', { state: { form } });
  };

  return (
    <div className="step3-finish">
      <ItineraryDetailsPreview form={form} goTo={goTo} />

      <div className="step3-finish__field">
        <label>Itinerary title</label>
        <TextInput
          placeholder="Name your itinerary (optional)"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
        />
      </div>

      <div className="step3-finish__field">
        <label>Description</label>
        <TextInput
          placeholder="Add a short description (optional)"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
        />
      </div>

      <div className="step3-finish__field">
        <label>Cover image</label>
        <p className="step3-finish__hint">Optional — leave blank to use a warm default.</p>
        {preview && (
          <div className="step3-finish__cover-preview">
            <img src={preview} alt="Chosen cover preview" />
            <button
              type="button"
              className="step3-finish__cover-remove"
              onClick={handleRemoveImage}
            >
              Remove
            </button>
          </div>
        )}
        <label className="step3-finish__cover-upload">
          {form.coverImageFile ? 'Choose a different image' : 'Upload an image'}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            hidden
          />
        </label>
      </div>

      <PrivacyField form={form} update={update} />
      <div className="step3-finish__nav">
        <BackButton onClick={onBack} />
        <FinishButton onClick={handleFinish} />
      </div>
    </div>
  );
}

export default Step3_Finish;
