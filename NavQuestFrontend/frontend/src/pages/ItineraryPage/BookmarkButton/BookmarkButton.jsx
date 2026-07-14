import './BookmarkButton.css'

function BookmarkButton({ onClick }) {
  return (
    <button className="bookmark-button" onClick={onClick}>bookmark</button>
  );
}

export default BookmarkButton;
