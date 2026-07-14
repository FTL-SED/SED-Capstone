import './LoadingSection.css'
import LoadingText from '../LoadingText/LoadingText.jsx'
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner.jsx'

function LoadingSection() {
  return (
    <section>
      <LoadingText />
      <LoadingSpinner />
    </section>
  );
}

export default LoadingSection;
