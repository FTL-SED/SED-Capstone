import './UserSearch.css'
import { useState, useEffect } from 'react'
import DropdownInput from '../../../components/Inputs/DropdownInput/DropdownInput.jsx'
import { searchUsers } from '../../../api/users.js'
import accountIcon from '../../../assets/account_icon.png'

// Search PUBLIC users by username and pick one to add as a group member.
// Mirrors AddressPicker's debounce + dropdown pattern: debounce lookups, drop
// stale results via an `active` flag, and clear the box after a pick.
//   onSelect(userSnapshot) => void  — the chosen public user's prefs snapshot
// The parent turns the snapshot into a member (see memberFromUser).
function UserSearch({ onSelect }) {
  const [text, setText] = useState('')
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('') // '', 'searching', 'none', 'error'

  useEffect(() => {
    const query = text.trim()
    // Search once the user has typed at least 1 character; an empty box shows
    // nothing. (Backend caps results at 10, so a common single letter is safe.)
    if (query.length < 1) {
      setResults([])
      setStatus('')
      return
    }

    let active = true
    setStatus('searching')
    const timer = setTimeout(() => {
      searchUsers(query)
        .then((users) => {
          if (!active) return
          setResults(users)
          setStatus(users.length ? '' : 'none')
        })
        .catch(() => {
          if (!active) return
          setResults([])
          setStatus('error')
        })
    }, 300)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [text])

  const pick = (user) => {
    onSelect(user)
    setText('') // reset so they can add another
    setResults([])
    setStatus('')
  }

  return (
    <div className="user-search">
      <DropdownInput
        placeholder="Search public users by username"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {status === 'searching' && <p className="user-search__status">Searching…</p>}
      {status === 'none' && <p className="user-search__status">No public users found.</p>}
      {status === 'error' && <p className="user-search__status">Couldn’t search right now.</p>}

      {results.length > 0 && (
        <ul className="user-search__results">
          {results.map((u) => (
            <li key={u.id}>
              <button type="button" onClick={() => pick(u)}>
                <img
                  className="user-search__avatar"
                  src={u.avatarUrl || accountIcon}
                  alt=""
                />
                <span className="user-search__text">
                  <span className="user-search__username">{u.username}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default UserSearch
