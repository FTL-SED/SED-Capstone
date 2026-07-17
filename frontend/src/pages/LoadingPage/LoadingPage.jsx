import './LoadingPage.css'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import LoadingSection from './LoadingSection/LoadingSection.jsx'
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage.jsx'
import BackButton from '../../components/Inputs/BackButton/BackButton.jsx'
import { buildRecommendationBody } from '../CreateItineraryPage/buildRequest.js'
import { getRecommendations, generateItinerary } from '../../api/itinerary.js'

// One loading screen for the whole generation. It receives the wizard `form`
// via router state, runs recommend + generate as a single phase, then navigates
// to the finished itinerary. Both API calls happen here so the user sees one
// spinner instead of an inline two-phase button on the wizard.
function LoadingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const form = location.state?.form;
  const [error, setError] = useState('');

  useEffect(() => {
    // Opened directly without a form (e.g. refresh) — nothing to generate.
    if (!form) {
      navigate('/create', { replace: true });
      return;
    }

    let active = true;
    (async () => {
      try {
        const { shortlist, constraints, reason } = await getRecommendations(
          buildRecommendationBody(form)
        );
        if (!active) return;

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
        if (!active) return;

        if (result.feasible === false) {
          setError(result.reason || 'No itinerary fits these constraints. Try adjusting your trip.');
          return;
        }

        navigate(`/itinerary/${result.itinerary.id}`, { replace: true });
      } catch (err) {
        if (!active) return;
        if (err.code === 'ECONNABORTED') {
          setError('This is taking longer than expected. Please try again.');
        } else if (err.response?.status === 401) {
          setError('Your session expired. Please log in and try again.');
        } else {
          setError(err.response?.data?.error || 'Something went wrong generating your itinerary. Please try again.');
        }
      }
    })();

    return () => {
      active = false;
    };
    // form comes from navigation state and doesn't change while mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="loading-page">
        <div className="loading-page__error">
          <ErrorMessage message={error} />
          <BackButton onClick={() => navigate('/create', { state: { form } })} />
        </div>
      </div>
    );
  }

  return (
    <div className="loading-page">
      <LoadingSection />
    </div>
  );
}

export default LoadingPage;
