import './Author.css'

function Author({ name }) {
  return (
    <p className="itinerary-author">{name || "author"}</p>
  );
}

export default Author;
