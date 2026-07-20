import './FilterControls.css'
import { useState, useEffect, useRef } from 'react'
import { INTEREST_TAGS } from '../../../api/vocab.js'

// Presentational filter bar for the Discover page. The parent (DiscoverPage)
// owns the selected interests + sort and re-fetches when they change; this
// component just renders the controls and reports clicks.
function FilterControls({ interests, sort, onToggleInterest, onSortChange, children }) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close the dropdown when clicking anywhere outside it.
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const label =
    interests.length > 0 ? `Tags (${interests.length})` : 'Tags'

  return (
    <div className="filter-controls">
      <div className="filter-controls__search">{children}</div>

      <div className="filter-controls__interests" ref={dropdownRef}>
        <button
          type="button"
          className="tags-dropdown__toggle"
          aria-haspopup="true"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          {label}
          <span className="tags-dropdown__caret" aria-hidden="true">▾</span>
        </button>

        {open && (
          <div className="tags-dropdown__menu" role="menu">
            {INTEREST_TAGS.map((tag) => {
              const selected = interests.includes(tag)
              return (
                <label key={tag} className="tags-dropdown__option">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleInterest(tag)}
                  />
                  <span>{tag}</span>
                </label>
              )
            })}
          </div>
        )}
      </div>

      <div className="filter-controls__sort">
        <button
          type="button"
          className={
            sort === 'recent' ? 'sort-toggle sort-toggle--active' : 'sort-toggle'
          }
          aria-pressed={sort === 'recent'}
          onClick={() => onSortChange('recent')}
        >
          Recent
        </button>
        <button
          type="button"
          className={
            sort === 'popular' ? 'sort-toggle sort-toggle--active' : 'sort-toggle'
          }
          aria-pressed={sort === 'popular'}
          onClick={() => onSortChange('popular')}
        >
          Popular
        </button>
      </div>
    </div>
  )
}

export default FilterControls
