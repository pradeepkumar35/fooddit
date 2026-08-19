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
  const [logoWiggle, setLogoWiggle] = useState(0)
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
  // ~280ms, from a single character up, aborting the in-flight request when the
  // query changes or the effect cleans up.
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
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink">
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
        className="w-full border-2 border-ink bg-canvas py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted transition-shadow duration-150 focus:shadow-card focus:outline-none"
      />
      {suggestionsOpen && suggestions.length > 0 && (
        <ul className="animate-pop-in absolute left-0 right-0 top-full z-30 mt-1.5 border-2 border-ink bg-surface shadow-card">
          {suggestions.map((suggestion) => (
            <li key={suggestion.id}>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault()
                  pickSuggestion(suggestion)
                }}
                className="flex w-full items-center justify-between gap-3 border-b border-ink/10 px-3 py-2.5 text-left text-sm transition-colors duration-100 last:border-b-0 hover:bg-accent-soft"
              >
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{suggestion.name}</span>
                {suggestion.locality && (
                  <span className="shrink-0 text-xs font-semibold text-muted">{suggestion.locality}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  )

  return (
    <header className="sticky top-0 z-20 border-b-2 border-ink bg-surface">
      <div className="mx-auto flex h-16 max-w-[1080px] items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <Link
          to="/"
          onMouseEnter={() => setLogoWiggle((n) => n + 1)}
          className="group flex shrink-0 items-center gap-2.5"
          aria-label="Fooddit home"
        >
          <span
            key={logoWiggle}
            className={`sticker grid h-10 w-10 place-items-center bg-accent text-surface transition-transform duration-150 group-hover:animate-wiggle ${
              logoWiggle ? 'animate-wiggle' : ''
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 11h16l-1.5 8h-13z" />
              <path d="M8 7h8l-1-2H9z" />
              <circle cx="9.5" cy="15.5" r="0.6" fill="currentColor" />
              <circle cx="14.5" cy="15.5" r="0.6" fill="currentColor" />
            </svg>
          </span>
          <span className="hidden font-display text-2xl uppercase tracking-wide text-ink transition-colors duration-150 group-hover:text-accent sm:inline">
            Fooddit
          </span>
        </Link>

        <LocationBar />

        <div className="mx-auto hidden w-full max-w-md md:block">{searchBox()}</div>

        <button
          type="button"
          aria-label="Search"
          aria-expanded={mobileSearchOpen}
          onClick={() => setMobileSearchOpen((open) => !open)}
          className="hard-btn ml-auto h-10 w-10 border-2 p-0 text-ink md:hidden"
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
                className="flex items-center gap-2 border-2 border-ink bg-surface px-1.5 py-1 shadow-card transition duration-150 hover:bg-accent-soft active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <span className="sticker grid h-8 w-8 -rotate-2 place-items-center bg-accent text-sm font-bold text-surface">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden text-sm font-semibold text-ink sm:inline">{user.name}</span>
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="animate-pop-in absolute right-0 top-full z-10 mt-2 w-48 border-2 border-ink bg-surface shadow-card"
                >
                  <Link
                    to="/profile"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block border-b border-ink/10 px-4 py-3 text-sm font-medium text-ink transition-colors duration-100 hover:bg-accent-soft"
                  >
                    My profile
                  </Link>
                  <Link
                    to="/profile?tab=saved"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block border-b border-ink/10 px-4 py-3 text-sm font-medium text-ink transition-colors duration-100 hover:bg-accent-soft"
                  >
                    Saved restaurants
                  </Link>
                  <Link
                    to="/settings"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block border-b border-ink/10 px-4 py-3 text-sm font-medium text-ink transition-colors duration-100 hover:bg-accent-soft"
                  >
                    Settings
                  </Link>
                  <div role="separator" className="border-t-2 border-ink" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="block w-full px-4 py-3 text-left text-sm font-medium text-ink transition-colors duration-100 hover:bg-accent-soft"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/login"
              className="hard-btn whitespace-nowrap border-2 bg-surface px-2.5 py-1.5 text-xs text-ink hover:bg-canvas sm:px-3 sm:py-2 sm:text-sm"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="hard-btn whitespace-nowrap border-2 bg-accent px-2.5 py-1.5 text-xs text-surface hover:bg-accent sm:px-3 sm:py-2 sm:text-sm"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>

      {mobileSearchOpen && (
        <div className="animate-fade-slide-in border-t-2 border-ink px-4 py-2 md:hidden">{searchBox()}</div>
      )}

      <div className="overflow-hidden border-t-2 border-ink bg-ink text-canvas">
        <div className="marquee-track flex whitespace-nowrap py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
          <span className="flex min-w-full shrink-0 items-center justify-around gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i} className="flex items-center gap-8">
                <span>Hot &amp; fresh reviews</span>
                <span className="text-accent">●</span>
                <span>Yours truly</span>
                <span className="text-accent">●</span>
                <span>Food that talks</span>
                <span className="text-accent">●</span>
              </span>
            ))}
          </span>
        </div>
      </div>
    </header>
  )
}