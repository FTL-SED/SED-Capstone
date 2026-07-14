import './SearchBar.css'

function SearchBar({ value, onChange }) {
  return (
    <input
      type="search"
      placeholder="Explore Destinations"
      value={value}
      onChange={onChange}
    />
  );
}

export default SearchBar;
