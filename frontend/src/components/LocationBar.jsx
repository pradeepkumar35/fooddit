import { useLocation } from '../hooks/useLocation'
import LocationSwitcher from './LocationSwitcher'

/**
 * Navbar control showing the active city (and locality) with a pin. Opens the
 * location switcher modal, which navigates to the feed with the new location.
 */
export default function LocationBar() {
  const { activeCity, activeLocality, setSwitcherOpen } = useLocation()

  return (
    <>
      <button
        type="button"
        onClick={() => setSwitcherOpen(true)}
        aria-label="Choose location"
        className="group flex max-w-32 items-center gap-1.5 border-[1.5px] border-hair bg-card px-2.5 py-2 text-sm text-ink transition duration-150 hover:border-ink sm:max-w-44"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-emerald" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-left font-semibold leading-tight">
            {activeCity ? activeCity.cityName : 'Choose location'}
          </span>
          {activeCity && activeLocality && (
            <span className="block truncate text-left text-[11px] font-medium leading-tight text-muted">{activeLocality}</span>
          )}
        </span>
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <LocationSwitcher />
    </>
  )
}