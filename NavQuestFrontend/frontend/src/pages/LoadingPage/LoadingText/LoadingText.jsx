import './LoadingText.css'

function LoadingText({ text = 'Generating Itinerary' }) {
  return (
    <p className="loading-text">{text}</p>
  );
}

export default LoadingText;
