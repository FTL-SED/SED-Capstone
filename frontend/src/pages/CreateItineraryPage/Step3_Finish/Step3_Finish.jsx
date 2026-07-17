import './Step3_Finish.css'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ItineraryDetailsPreview from '../ItineraryDetailsPreview/ItineraryDetailsPreview.jsx'
import PrivacyField from '../PrivacyField/PrivacyField.jsx'
import FinishButton from '../FinishButton/FinishButton.jsx'
import BackButton from '../../../components/Inputs/BackButton/BackButton.jsx'
import ErrorMessage from '../../../components/ErrorMessage/ErrorMessage.jsx'
import TextInput from '../../../components/Inputs/TextInput/TextInput.jsx'
import { buildRecommendationBody } from '../buildRequest.js'
import { getRecommendations, generateItinerary } from '../../../api/itinerary.js'

// The core integration: on finish, get a shortlist then sequence + persist an
// itinerary, then navigate to it. Empty-shortlist and infeasible are normal
// outcomes shown as messages, not errors.
// See .claude/roadmap/frontend-backend-integration.md (Steps 7-8).
function Step3_Finish({ form, update, onBack }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFinish = async () => {
    setError('');
    setLoading(true);
    try {
      const body = buildRecommendationBody(form);
      const { shortlist, constraints, reason } = await getRecommendations(body);

      // No places matched — show the backend's friendly reason, don't proceed.
      if (!shortlist || shortlist.length === 0) {
        setError(reason || 'No places matched your trip. Try widening your budget or radius.');
        return;
      }

      const result = await generateItinerary({
        shortlist,
        constraints,
        isPublic: form.isPublic,
        title: form.title,
        description: form.description,
      });

      // Constraints too tight for any day — a valid outcome, not a crash.
      if (result.feasible === false) {
        setError(result.reason || 'No itinerary fits these constraints. Try adjusting your trip.');
        return;
      }

      navigate(`/itinerary/${result.itinerary.id}`);
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError('This is taking longer than expected. Please try again.');
      } else if (err.response?.status === 401) {
        setError('Your session expired. Please log in and try again.');
      } else {
        setError(err.response?.data?.error || 'Something went wrong generating your itinerary. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="step3-finish">
      <ItineraryDetailsPreview />

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

      <PrivacyField form={form} update={update} />
      {error && <ErrorMessage message={error} />}
      <div className="step3-finish__nav">
        <BackButton onClick={onBack} />
        <FinishButton onClick={handleFinish} loading={loading} />
      </div>
    </div>
  );
}

export default Step3_Finish;
