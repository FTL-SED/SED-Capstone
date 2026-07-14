import './LikeButton.css'

function LikeButton({ onClick }) {
  return (
    <button className="like-button" onClick={onClick}>like</button>
  );
}

export default LikeButton;
