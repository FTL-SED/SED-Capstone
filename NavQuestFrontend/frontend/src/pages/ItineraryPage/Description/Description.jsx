import './Description.css'

function Description({ text }) {
  return (
    <p>{text || "description"}</p>
  );
}

export default Description;
