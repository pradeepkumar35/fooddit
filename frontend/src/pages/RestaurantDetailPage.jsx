import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { getRestaurant, listReviews, saveRestaurant, unsaveRestaurant } from '../api/restaurants'
import { useToast } from '../context/ToastContext'
import EmptyState from '../components/EmptyState'
import RatingStars from '../components/RatingStars'
import ReviewCard from '../components/ReviewCard'
import ReviewForm from '../components/ReviewForm'
import { RestaurantCardSkeleton, Skeleton } from '../components/Skeleton'
import { useAuth } from '../hooks/useAuth'
import useLiveStream from '../hooks/useLiveStream'
import { subscribe } from '../lib/live'

export default function RestaurantDetailPage() {
  const { id } = useParams()
  const { user, isAuthenticated } = useAuth()
  const notify = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  useLiveStream(id)
  const [restaurant, setRestaurant] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pop, setPop] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [restaurantData, reviewData] = await Promise.all([getRestaurant(id), listReviews(id)])
      setRestaurant(restaurantData)
      setReviews(reviewData)
      setNotFound(false)
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true)
      } else {
        setError('Failed to load this restaurant. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // A new review for this restaurant was posted by another client: refresh the
  // reviews list (and header rating) so it appears live, like comments already
  // do via the comment.created event.
  useEffect(() => {
    return subscribe('review.created', (event) => {
      if (event.restaurantId === id) loadData()
    })
  }, [id, loadData])

  const handleSave = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } })
      return
    }
    if (saving) return
    setSaving(true)
    try {
      if (restaurant.saved) {
        await unsaveRestaurant(id)
      } else {
        await saveRestaurant(id)
      }
      setRestaurant((prev) => ({ ...prev, saved: !prev.saved }))
      setPop((n) => n + 1)
      notify(restaurant.saved ? 'Removed from saved' : 'Saved to your list')
    } catch {
      /* leave state untouched on failure */
    } finally {
      setSaving(false)
    }
  }

  const alreadyReviewed = isAuthenticated && reviews.some((r) => r.author.id === user.id)

  if (loading) {
    return (
      <div className="mx-auto max-w-[1080px] space-y-4 px-4 pb-16 pt-6">
        <div className="mx-auto max-w-[680px] space-y-4">
          <Skeleton className="h-40 border-2 border-ink" />
          <Skeleton className="h-40 border-2 border-ink" />
          <RestaurantCardSkeleton />
          <RestaurantCardSkeleton />
        </div>
      </div>
    )
  }

  if (notFound || !restaurant) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-display text-3xl font-semibold uppercase tracking-wide text-ink">
          Restaurant not found
        </h1>
        <p className="mt-2 text-sm font-semibold text-muted">
          <Link to="/" className="font-bold text-accent hover:underline">
            Back to all restaurants
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1080px] px-4 pb-16 pt-6">
      <div className="flex gap-6">
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[680px]">
            <Link
              to="/"
              className="hard-btn border-2 bg-surface px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink hover:bg-canvas"
            >
              ← All restaurants
            </Link>

            <header className="sticker relative mt-3 p-6">
              <span className="tape" aria-hidden="true" />
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="font-display text-4xl font-semibold uppercase leading-tight tracking-wide text-ink">
                    {restaurant.name}
                  </h1>
                  <p className="mt-2 text-sm font-semibold text-muted">📍 {restaurant.address}</p>
                  <p className="mt-2 inline-block border-2 border-ink bg-surface px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-ink shadow-card">
                    {restaurant.cuisineType}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="text-right">
                    {restaurant.reviewCount > 0 ? (
                      <>
                        <div className="flex items-center justify-end gap-2">
                          <RatingStars value={restaurant.avgRating} className="text-lg" />
                          <span className="font-display text-4xl font-semibold text-ink tabular-nums">
                            {restaurant.avgRating.toFixed(1)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-muted">
                          {restaurant.reviewCount}{' '}
                          {restaurant.reviewCount === 1 ? 'review' : 'reviews'}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm font-semibold text-muted">No reviews yet</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    aria-pressed={restaurant.saved}
                    className={`hard-btn border-2 px-3 py-2 text-sm ${
                      restaurant.saved ? 'bg-up text-surface' : 'bg-surface text-ink hover:bg-up-soft hover:text-up'
                    }`}
                  >
                    <svg
                      key={pop}
                      viewBox="0 0 24 24"
                      className={`mr-1 inline h-4 w-4 ${pop > 0 ? 'animate-save-pop' : ''}`}
                      fill={restaurant.saved ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                    {restaurant.saved ? 'Saved' : 'Save'}
                  </button>
                </div>
              </div>
            </header>

            {error && (
              <div className="mt-4 border-2 border-chili-500 bg-surface px-4 py-3 text-sm font-semibold text-chili-600 shadow-card">
                {error}
              </div>
            )}

            <section className="mt-4">
              {isAuthenticated ? (
                alreadyReviewed ? (
                  <p className="sticker relative px-4 py-3 text-sm font-semibold text-muted">
                    <span className="tape" aria-hidden="true" />
                    You've already reviewed this restaurant.
                  </p>
                ) : (
                  <ReviewForm restaurantId={id} onCreated={loadData} />
                )
              ) : (
                <p className="sticker relative px-4 py-3 text-sm font-semibold text-muted">
                  <span className="tape" aria-hidden="true" />
                  <Link to="/login" className="font-bold text-accent hover:underline">
                    Log in
                  </Link>{' '}
                  to write a review.
                </p>
              )}
            </section>

            <section className="mt-6">
              <h2 className="mb-3 sticker inline-block px-3 py-1.5 font-display text-base font-semibold uppercase tracking-wide text-ink">
                Reviews
              </h2>
              {reviews.length === 0 ? (
                <EmptyState
                  title="No reviews yet"
                  description="Be the first to rate this place — your review starts the conversation."
                  icon={
                    <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
                  }
                />
              ) : (
                <ul className="space-y-4">
                  {reviews.map((review) => (
                    <li key={review.id} className="animate-fade-slide-in stagger-fill">
                      <ReviewCard review={review} onUpdated={loadData} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </main>

        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-24 space-y-4">
            <div className="sticker relative p-4">
              <span className="tape" aria-hidden="true" />
              <h2 className="font-display text-base font-semibold uppercase tracking-wide text-ink">
                About this place
              </h2>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="font-semibold text-muted">Cuisine</dt>
                  <dd className="font-bold text-ink">{restaurant.cuisineType}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-semibold text-muted">Average</dt>
                  <dd className="font-bold text-ink">{restaurant.avgRating.toFixed(1)} / 5</dd>
                </div>
              </dl>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
