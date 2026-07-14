import './LoadingText.css'

function LoadingText({ text = 'Generating Itinerary' }) {
  return (
    <p>{text}</p>
  );
}

export default LoadingText;
