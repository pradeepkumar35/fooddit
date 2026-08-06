import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { saveRestaurant, unsaveRestaurant } from '../api/restaurants'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import RatingStars from './RatingStars'

/**
 * A restaurant rendered like a Reddit post in the feed: a score column on the
 * left (the restaurant's average rating fills the slot Reddit gives to post
 * votes, since restaurants themselves aren't votable), then title, metadata,
 * excerpt-equivalent line, and a quiet action row with a bookmark toggle. The
 * card lifts slightly on hover; saving plays a small spring pop on the icon.
 */
export default function RestaurantCard({ restaurant, onSavedChange }) {
  const { isAuthenticated } = useAuth()
  const notify = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [saved, setSaved] = useState(restaurant.saved)
  const [busy, setBusy] = useState(false)
  const [pop, setPop] = useState(0)
  const hasReviews = restaurant.reviewCount > 0

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
    <article className="flex gap-3 rounded-lg border border-line bg-surface p-4 shadow-card transition duration-150 ease-out hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card-hover">
      <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 self-center rounded-lg bg-basil-100 py-2">
        {hasReviews ? (
          <>
            <span className="font-display text-lg font-semibold leading-none text-basil-600">
              {restaurant.avgRating.toFixed(1)}
            </span>
            <span className="text-sm leading-none text-basil-600">★</span>
            <span className="text-xs font-medium leading-none text-basil-600/70">
              {restaurant.reviewCount}
            </span>
          </>
        ) : (
          <span className="text-xs font-semibold uppercase tracking-wide text-basil-600">New</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/restaurants/${restaurant.id}`}
            className="font-display text-lg font-semibold leading-snug text-ink transition-colors duration-150 hover:text-accent"
          >
            {restaurant.name}
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            aria-label={saved ? 'Remove from saved' : 'Save restaurant'}
            aria-pressed={saved}
            className={`shrink-0 rounded-lg p-1 transition duration-150 ease-out active:scale-75 disabled:opacity-50 ${
              saved ? 'text-accent' : 'text-muted hover:text-accent'
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
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded-md bg-canvas px-2 py-1 text-xs font-medium text-ink/70">
            {restaurant.cuisineType}
          </span>
        </div>

        <p className="mt-2 text-sm leading-snug text-ink/70">
          {hasReviews ? (
            <span className="flex items-center gap-2">
              <RatingStars value={restaurant.avgRating} className="text-sm" />
              <span className="text-muted">
                {restaurant.avgRating.toFixed(1)} · {restaurant.reviewCount}{' '}
                {restaurant.reviewCount === 1 ? 'review' : 'reviews'}
              </span>
            </span>
          ) : (
            <span className="text-muted">
              No reviews yet — be the first to try {restaurant.name}.
            </span>
          )}
        </p>

        <div className="mt-2">
          <Link
            to={`/restaurants/${restaurant.id}`}
            className="flex items-center gap-2 text-xs font-medium text-muted transition-colors duration-150 hover:text-accent"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            View reviews
          </Link>
        </div>
      </div>
    </article>
  )
}
