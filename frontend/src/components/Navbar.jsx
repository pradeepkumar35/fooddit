import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLocation } from '../hooks/useLocation'
import { suggestRestaurants } from '../api/restaurants'
import LocationBar from './LocationBar'
import NotificationsDropdown from './NotificationsDropdown'

/**
 * Sticky civic-record masthead: serif wordmark, Ledger|Map view tabs, location
 * pill, city-scoped autocomplete search, notification bell and auth controls.
 * The dark-mode toggle deliberately lives in Settings only.
 */
export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const { activeCity } = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const menuRef = useRef(null)
  const mobileInputRef = useRef(null)
  const searchTimerRef = useRef(null)

  const view = searchParams.get('view') === 'map' ? 'map' : 'ledger'

  useEffect(() => {
    setSearch(searchParams.get('q') || '')
  }, [searchParams])

  const setView = (next) => {
    // Navigate to the home route so the view tab works from any page (e.g.
    // clicking "Map" while inside a restaurant dossier takes you home, not
    // to /restaurants/:id?view=map which the detail page ignores).
    navigate(next === 'map' ? '/?view=map' : '/')
    setMobileSearchOpen(false)
  }

  // Navigate to the ledger with the query applied, preserving filters. During
  // live typing this replaces history so the URL stays one entry per search.
  const applySearch = useCallback(
    (value, replace = true) => {
      const trimmed = value.trim()
      const next = new URLSearchParams(searchParams)
      trimmed ? next.set('q', trimmed) : next.delete('q')
      navigate(`/?${next.toString()}`, { replace })
    },
    [searchParams, navigate],
  )

  // Live search-as-you-type: debounced push to the URL so the feed updates as
  // the user types instead of waiting for Enter.
  useEffect(() => {
    const current = searchParams.get('q') || ''
    const trimmed = search.trim()
    if (trimmed === current) return
    clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => applySearch(search), 260)
    return () => clearTimeout(searchTimerRef.current)
  }, [search, searchParams, applySearch])

  // Autocomplete: fetch city-scoped name suggestions while typing — from a
  // single character up. Debounced ~280ms, aborting in-flight requests.
  useEffect(() => {
    const city = activeCity?.citySlug || ''
    const trimmed = search.trim()
    if (!city || trimmed.length < 1) {
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

  // Jump straight to a restaurant picked from the autocomplete, cancelling any
  // pending feed-search navigation first.
  const pickSuggestion = (suggestion) => {
    clearTimeout(searchTimerRef.current)
    setSearch('')
    setSuggestionsOpen(false)
    setMobileSearchOpen(false)
    navigate(`/restaurants/${suggestion.id}`)
  }

  const tabClass = (activeView) =>
    `px-4 py-[9px] font-mono text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors duration-150 ${
      view === activeView ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
    }`

  const searchBox = (className = '') => (
    <form onSubmit={handleSearch} className={`relative ${className}`}>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
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
        className="w-full border-[1.5px] border-hair bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted transition-colors duration-150 focus:border-ink focus:outline-none"
      />
      {suggestionsOpen && suggestions.length > 0 && (
        <ul className="panel animate-pop-in absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden">
          {suggestions.map((suggestion) => (
            <li key={suggestion.id}>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault()
                  pickSuggestion(suggestion)
                }}
                className="flex w-full items-center justify-between gap-3 border-b border-hair px-3.5 py-2.5 text-left text-sm transition-colors duration-100 last:border-b-0 hover:bg-paper"
              >
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{suggestion.name}</span>
                {suggestion.locality && (
                  <span className="micro-label shrink-0 normal-case tracking-normal">{suggestion.locality}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  )

  return (
    <header className="sticky top-0 z-30 border-b border-hair bg-paper">
      <div className="mx-auto flex h-16 max-w-[1160px] items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <Link to="/" className="shrink-0" aria-label="Fooddit home">
          <span className="font-serif text-[25px] font-bold tracking-tight text-ink">Fooddit</span>
        </Link>

        {/* Ledger | Map view tabs */}
        <nav className="ml-1 hidden items-center border-[1.5px] border-ink md:flex" aria-label="Views">
          <button type="button" className={tabClass('ledger')} aria-current={view === 'ledger' ? 'page' : undefined} onClick={() => setView('ledger')}>
            Ledger
          </button>
          <button type="button" className={`${tabClass('map')} border-l-[1.5px] border-ink`} aria-current={view === 'map' ? 'page' : undefined} onClick={() => setView('map')}>
            Map
          </button>
        </nav>

        <LocationBar />

        <div className="mx-auto hidden w-full max-w-md md:block">{searchBox()}</div>

        <button
          type="button"
          aria-label="Search"
          aria-expanded={mobileSearchOpen}
          onClick={() => setMobileSearchOpen((open) => !open)}
          className="btn-hard ml-auto h-10 w-10 p-0 md:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
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
                className="flex items-center gap-2 border-[1.5px] border-hair bg-card px-1.5 py-1 transition duration-150 hover:border-ink"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <span className="grid h-8 w-8 -rotate-3 place-items-center rounded-full bg-gradient-to-br from-[#33415C] to-ink font-mono text-sm font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden text-sm font-semibold text-ink sm:inline">{user.name}</span>
                <svg viewBox="0 0 24 24" className="mr-1 h-3 w-3 text-muted" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {menuOpen && (
                <div role="menu" className="panel animate-pop-in absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden">
                  <Link to="/profile" role="menuitem" onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-medium text-ink transition-colors duration-100 hover:bg-paper">
                    My profile
                  </Link>
                  <Link to="/profile?tab=saved" role="menuitem" onClick={() => setMenuOpen(false)} className="block border-t border-hair px-4 py-3 text-sm font-medium text-ink transition-colors duration-100 hover:bg-paper">
                    Saved restaurants
                  </Link>
                  <Link to="/settings" role="menuitem" onClick={() => setMenuOpen(false)} className="block border-t border-hair px-4 py-3 text-sm font-medium text-ink transition-colors duration-100 hover:bg-paper">
                    Settings
                  </Link>
                  <div role="separator" className="border-t-[1.5px] border-ink" />
                  <button type="button" role="menuitem" onClick={handleLogout} className="block w-full px-4 py-3 text-left text-sm font-medium text-ink transition-colors duration-100 hover:bg-paper">
                    Log out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={`flex items-center gap-1.5 sm:gap-2 ${isAuthenticated ? '' : 'sm:ml-0 ml-auto'}`}>
            <Link to="/login" className="btn-hard whitespace-nowrap px-2.5 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm">
              Log in
            </Link>
            <Link to="/signup" className="btn-hard btn-hard-primary whitespace-nowrap px-2.5 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm">
              Sign up
            </Link>
          </div>
        )}
      </div>

      {mobileSearchOpen && (
        <div className="animate-fade-slide-in border-t border-hair px-4 py-2 md:hidden">{searchBox()}</div>
      )}

      {/* Mobile view tabs */}
      <div className="flex border-t border-hair md:hidden">
        <button type="button" className={`${tabClass('ledger')} flex-1 border-r border-hair`} aria-current={view === 'ledger' ? 'page' : undefined} onClick={() => setView('ledger')}>
          Ledger
        </button>
        <button type="button" className={`${tabClass('map')} flex-1`} aria-current={view === 'map' ? 'page' : undefined} onClick={() => setView('map')}>
          Map
        </button>
      </div>
    </header>
  )
}