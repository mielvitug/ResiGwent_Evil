import Icon from '../ui/Icon'

function SearchBar({ value, onChange, placeholder = 'Search character files', label = 'Search cards' }) {
  return (
    <label className="search-bar">
      <span className="sr-only">{label}</span>
      <span className="search-icon" aria-hidden="true"><Icon name="search" size={16} /></span>
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export default SearchBar
