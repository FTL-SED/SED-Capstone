import './Description.css'

function Description({ text }) {
  return (
    <p className="itinerary-description">{text || "description"}</p>
  );
}

export default Description;
