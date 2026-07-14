import './Heading.css'

function Heading({ text = "NavQuest" }) {
  return (
    <h1 className="hero-heading">{text}</h1>
  );
}

export default Heading;
