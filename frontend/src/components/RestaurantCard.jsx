import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { saveRestaurant, unsaveRestaurant } from '../api/restaurants'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import RatingStars from './RatingStars'
import AnimatedNumber from './AnimatedNumber'

// A zine sticker card. Slightly off-kilter, taped at the top, with a gold
// ticket-stub rating column (perforated edge), a spinning starburst for new
// places, and a magnetic save button. On hover it pops up off the page (lift +
// shadow grow) exactly like the Direction D reference.
export default function RestaurantCard({ restaurant, onSavedChange }) {
  const { isAuthenticated } = useAuth()
  const notify = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [saved, setSaved] = useState(restaurant.saved)
  const [busy, setBusy] = useState(false)
  const [pop, setPop] = useState(0)
  const hasReviews = restaurant.reviewCount > 0
  const isNew = !hasReviews
  const tilt = ['-rotate-[0.7deg]', 'rotate-[0.6deg]', '-rotate-[0.5deg]', 'rotate-[0.8deg]'][
    Math.abs(restaurant.name.length) % 4
  ]

  const handleSave = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } })
      return
    }
    if (busy) return
    setBusy(true)
    try {
      if (saved) {
        await unsaveRestaurant(restaurant.id)
      } else {
        await saveRestaurant(restaurant.id)
      }
      const next = !saved
      setSaved(next)
      setPop((n) => n + 1)
      notify(next ? 'Saved to your list' : 'Removed from saved')
      onSavedChange?.(next)
    } catch {
      /* leave state untouched on failure */
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className={`sticker group relative flex flex-col gap-3 p-4 ${tilt} cursor-pointer`}>
      <span className="tape" aria-hidden="true" />

        {/* Ticket-stub rating column (perforated right edge) */}
        <div className="flex w-full shrink-0 items-center gap-3">
          <div className="flex w-[52px] shrink-0 flex-col items-center justify-center gap-0.5 border-2 border-r-[3px] border-r-dashed border-ink bg-basil-100 py-2">
            {hasReviews ? (
              <>
                <span className="font-display text-xl font-semibold leading-none text-basil-600 tabular-nums">
                  <AnimatedNumber value={restaurant.avgRating} decimals={1} />
                </span>
                <span className="text-base leading-none text-basil-600">★</span>
                <span className="text-xs font-semibold leading-none text-basil-600/70 tabular-nums">
                  <AnimatedNumber value={restaurant.reviewCount} />
                </span>
              </>
            ) : (
              <span className="text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-basil-600">
                New
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <Link
                to={`/restaurants/${restaurant.id}`}
                className="font-display text-xl font-semibold uppercase leading-snug tracking-wide text-ink transition-colors duration-150 hover:text-accent"
              >
                {restaurant.name}
              </Link>
              <button
                type="button"
                onClick={handleSave}
                disabled={busy}
                aria-label={saved ? 'Remove from saved' : 'Save restaurant'}
                aria-pressed={saved}
                className={`sticker -mt-1 shrink-0 rounded-md p-2 text-sm transition duration-150 ease-out active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 ${
                  saved ? 'bg-up text-surface' : 'bg-surface text-muted hover:text-up'
                }`}
              >
                <svg
                  key={pop}
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 ${pop > 0 ? 'animate-save-pop' : ''}`}
                  fill={saved ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="border-2 border-ink bg-surface px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink shadow-card">
                {restaurant.cuisineType}
              </span>
              {restaurant.locality && (
                <span className="text-xs font-semibold text-muted">📍 {restaurant.locality}</span>
              )}
            </div>
          </div>
        </div>

        <p className="text-sm leading-snug text-ink/70">
          {hasReviews ? (
            <span className="flex flex-wrap items-center gap-2">
              <RatingStars value={restaurant.avgRating} className="text-sm" />
              <span className="text-muted tabular-nums">
                <AnimatedNumber value={restaurant.avgRating} decimals={1} /> ·{' '}
                <AnimatedNumber value={restaurant.reviewCount} />{' '}
                {restaurant.reviewCount === 1 ? 'review' : 'reviews'}
              </span>
            </span>
          ) : (
            <span className="text-muted">
              No reviews yet — be the first to try {restaurant.name}.
            </span>
          )}
        </p>

        <Link
          to={`/restaurants/${restaurant.id}`}
          className="hard-btn self-start border-2 bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink hover:bg-accent hover:text-surface"
        >
          View reviews →
        </Link>

        {isNew && (
          <span className="starburst absolute -right-3 -top-3 h-16 w-16 text-[9px] animate-pop-rotate" aria-hidden="true">
            New
          </span>
        )}
    </article>
  )
}