import './SearchBar.css'

function SearchBar({ value, onChange }) {
  return (
    <input
      className="search-bar"
      type="search"
      placeholder="Search by destination or author"
      value={value}
      onChange={onChange}
    />
  );
}

export default SearchBar;
