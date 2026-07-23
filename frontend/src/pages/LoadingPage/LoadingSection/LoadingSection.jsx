import './LoadingSection.css'
import LoadingText from '../LoadingText/LoadingText.jsx'
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner.jsx'

// The shared loading experience: an editorial heading above the warm spinner.
// `text` lets each screen label the wait (generation vs. fetching an itinerary)
// while the styling stays identical everywhere.
function LoadingSection({ text }) {
  return (
    <section className="loading-section">
      <LoadingSpinner />
      <LoadingText text={text} />
    </section>
  );
}

export default LoadingSection;
