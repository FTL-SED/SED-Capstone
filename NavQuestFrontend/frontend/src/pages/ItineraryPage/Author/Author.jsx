import './Author.css'

function Author({ name }) {
  return (
    <p>{name || "author"}</p>
  );
}

export default Author;
