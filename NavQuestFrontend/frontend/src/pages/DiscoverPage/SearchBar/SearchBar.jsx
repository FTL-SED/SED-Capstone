import './SearchBar.css'

function SearchBar({ value, onChange }) {
  return (
    <input
      className="search-bar"
      type="search"
      placeholder="Explore Destinations"
      value={value}
      onChange={onChange}
    />
  );
}

export default SearchBar;
