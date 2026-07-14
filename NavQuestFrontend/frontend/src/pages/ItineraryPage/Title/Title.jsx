import './Title.css'

function Title({ text }) {
  return (
    <h1 className="itinerary-title">{text || "TITLE"}</h1>
  );
}

export default Title;
