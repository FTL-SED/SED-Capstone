import './LoadMoreButton.css'

function LoadMoreButton({ onClick }) {
  return (
    <button className="load-more-button" onClick={onClick}>Load More</button>
  );
}

export default LoadMoreButton;
