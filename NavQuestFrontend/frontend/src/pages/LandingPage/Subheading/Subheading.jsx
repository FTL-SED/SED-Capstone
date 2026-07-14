import './Subheading.css'

function Subheading({ text = "The AI-Itinerary Planner" }) {
  return (
    <p className="hero-subheading">{text}</p>
  );
}

export default Subheading;
