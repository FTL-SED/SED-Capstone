import './FilterControls.css'
import { INTEREST_TAGS } from '../../../api/vocab.js'

// Presentational filter bar for the Discover page. The parent (DiscoverPage)
// owns the selected interests + sort and re-fetches when they change; this
// component just renders the controls and reports clicks.
function FilterControls({ interests, sort, onToggleInterest, onSortChange }) {
  return (
    <div className="filter-controls">
      <div className="filter-controls__interests">
        {INTEREST_TAGS.map((tag) => {
          const selected = interests.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              className={
                selected
                  ? 'filter-chip filter-chip--selected'
                  : 'filter-chip'
              }
              aria-pressed={selected}
              onClick={() => onToggleInterest(tag)}
            >
              {tag}
            </button>
          )
        })}
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
