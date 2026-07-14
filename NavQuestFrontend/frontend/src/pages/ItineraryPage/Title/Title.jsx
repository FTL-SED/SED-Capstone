import './Title.css'

function Title({ text }) {
  return (
    <h1>{text || "TITLE"}</h1>
  );
}

export default Title;
