import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLocation } from '../hooks/useLocation'
import { suggestRestaurants } from '../api/restaurants'
import LocationBar from './LocationBar'
import NotificationsDropdown from './NotificationsDropdown'

/**
 * Sticky top bar: wordmark left, search in the center (wired to the feed via
 * the ?q= URL param), and auth controls on the right. The search collapses to
 * an icon below md that expands an inline input. The theme (light/dark/system)
 * is only controlled from Settings.
 */
export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const { activeCity } = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const menuRef = useRef(null)
  const mobileInputRef = useRef(null)
  const searchTimerRef = useRef(null)

  useEffect(() => {
    setSearch(searchParams.get('q') || '')
  }, [searchParams])

  // Navigate to the feed with the query applied, preserving any filters already
  // in the URL (cuisine/city/rating/sort). During live typing this uses replace
  // so the URL doesn't create a history entry per keystroke.
  const applySearch = useCallback(
    (value, replace = true) => {
      const trimmed = value.trim()
      const next = new URLSearchParams(searchParams)
      trimmed ? next.set('q', trimmed) : next.delete('q')
      navigate(`/?${next.toString()}`, { replace })
    },
    [searchParams, navigate],
  )

  // Live search-as-you-type: debounce the input and push the query to the URL,
  // so the feed updates as the user types instead of waiting for Enter. The
  // timer is held in a ref so picking a suggestion can cancel the pending
  // navigation that would otherwise overwrite it.
  useEffect(() => {
    const current = searchParams.get('q') || ''
    const trimmed = search.trim()
    if (trimmed === current) return
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => applySearch(search), 260)
    return () => clearTimeout(searchTimerRef.current)
  }, [search, searchParams, applySearch])

  // Autocomplete: fetch city-scoped name suggestions while typing. Debounced to
  // ~280ms, min two characters, aborting the in-flight request when the query
  // changes or the effect cleans up.
  useEffect(() => {
    const city = activeCity?.citySlug || ''
    const trimmed = search.trim()
    if (!city || trimmed.length < 2) {
      setSuggestions([])
      setSuggestionsOpen(false)
      return undefined
    }
    const controller = new AbortController()
    const id = setTimeout(() => {
      suggestRestaurants(city, trimmed, controller.signal)
        .then((data) => {
          setSuggestions(data)
          setSuggestionsOpen(data.length > 0)
        })
        .catch(() => {
          if (!controller.signal.aborted) setSuggestions([])
        })
    }, 280)
    return () => {
      controller.abort()
      clearTimeout(id)
    }
  }, [search, activeCity])

  useEffect(() => {
    if (mobileSearchOpen) mobileInputRef.current?.focus()
  }, [mobileSearchOpen])

  useEffect(() => {
    const onClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Search runs live as you type (single debounced effect above). Enter submits
  // immediately and closes the mobile panel. Both keep any active filters.
  const handleSearchChange = (event) => {
    setSearch(event.target.value)
  }

  const handleSearch = (event) => {
    event.preventDefault()
    applySearch(search.trim(), false)
    setMobileSearchOpen(false)
  }

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate('/')
  }

  // Jump straight to a restaurant picked from the autocomplete. The pending
  // feed-search navigation is cancelled first so it can't fire after we leave.
  const pickSuggestion = (suggestion) => {
    clearTimeout(searchTimerRef.current)
    setSearch('')
    setSuggestionsOpen(false)
    setMobileSearchOpen(false)
    navigate(`/restaurants/${suggestion.id}`)
  }

  const searchBox = (className = '') => (
    <form onSubmit={handleSearch} className={`relative ${className}`}>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </span>
      <input
        type="search"
        value={search}
        onChange={handleSearchChange}
        onBlur={() => setTimeout(() => setSuggestionsOpen(false), 120)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setSuggestionsOpen(false)
            event.currentTarget.blur()
          }
        }}
        placeholder="Search restaurants…"
        aria-label="Search restaurants"
        aria-expanded={suggestionsOpen}
        className="w-full rounded-lg border border-line bg-canvas py-2 pl-8 pr-3 text-sm text-ink placeholder:text-muted"
      />
      {suggestionsOpen && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-card-hover">
          {suggestions.map((suggestion) => (
            <li key={suggestion.id}>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault()
                  pickSuggestion(suggestion)
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-canvas"
              >
                <span className="min-w-0 flex-1 truncate text-ink">{suggestion.name}</span>
                {suggestion.locality && (
                  <span className="shrink-0 text-xs text-muted">{suggestion.locality}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  )

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1080px] items-center gap-3 px-4">
        <Link
          to="/"
          className="flex items-center gap-2 font-display text-2xl font-semibold text-ink transition-colors duration-150 hover:text-accent"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-accent" fill="currentColor" aria-hidden="true">
            <path d="M12 2a5 5 0 0 0-5 5c0 2.2 1.3 4 3 4.7V14H8a2 2 0 0 0-2 2v1H4a1 1 0 0 0 0 2h2v2a1 1 0 0 0 2 0v-2h2v2a1 1 0 0 0 2 0v-6.3c1.7-.7 3-2.5 3-4.7a5 5 0 0 0-5-5z" />
          </svg>
          <span className="hidden sm:inline">Fooddit</span>
        </Link>

        <LocationBar />

        <div className="mx-auto hidden w-full max-w-md md:block">{searchBox()}</div>

        <button
          type="button"
          aria-label="Search"
          aria-expanded={mobileSearchOpen}
          onClick={() => setMobileSearchOpen((open) => !open)}
          className="ml-auto rounded-lg p-2 text-muted transition-colors duration-150 hover:text-accent active:scale-90 md:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>

        {isAuthenticated ? (
          <>
            <NotificationsDropdown />
            <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors duration-150 hover:bg-canvas active:scale-95"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-surface">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <span className="hidden text-sm font-medium text-ink sm:inline">{user.name}</span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="animate-fade-slide-in absolute right-0 top-full z-10 mt-2 w-48 origin-top-right overflow-hidden rounded-lg border border-line bg-surface shadow-card-hover"
              >
                <Link
                  to="/profile"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 text-sm text-ink transition-colors duration-150 hover:bg-canvas"
                >
                  My profile
                </Link>
                <Link
                  to="/profile?tab=saved"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 text-sm text-ink transition-colors duration-150 hover:bg-canvas"
                >
                  Saved restaurants
                </Link>
                <Link
                  to="/settings"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-3 text-sm text-ink transition-colors duration-150 hover:bg-canvas"
                >
                  Settings
                </Link>
                <div role="separator" className="border-t border-line" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="block w-full px-4 py-3 text-left text-sm text-ink transition-colors duration-150 hover:bg-canvas"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:border-accent hover:text-accent"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-surface transition duration-150 ease-out hover:bg-accent/90 active:scale-95"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>

      {mobileSearchOpen && (
        <div className="animate-fade-slide-in border-t border-line px-4 py-2 md:hidden">{searchBox()}</div>
      )}
    </header>
  )
}
