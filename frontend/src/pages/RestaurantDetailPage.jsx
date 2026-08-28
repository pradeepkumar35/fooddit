import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getRestaurant,
  getRestaurantStats,
  listReviews,
  saveRestaurant,
  unsaveRestaurant,
} from '../api/restaurants'
import { fetchReputations } from '../api/users'
import { useToast } from '../context/ToastContext'
import EmptyState from '../components/EmptyState'
import ReviewCard from '../components/ReviewCard'
import ReviewForm from '../components/ReviewForm'
import TierSeal from '../components/TierSeal'
import { FactSheetSkeleton, ReviewCardSkeleton } from '../components/Skeleton'
import { useAuth } from '../hooks/useAuth'
import useLiveStream from '../hooks/useLiveStream'
import { subscribe } from '../lib/live'
import { resizeImageUrl } from '../utils/imageUrl'

const REVIEW_SORTS = [
  { value: 'best', label: 'Best' },
  { value: 'top', label: 'Top' },
  { value: 'new', label: 'New' },
]

/**
 * The Dossier — restaurant detail as a civic record. Slim title strip (no
 * poster, no monumental number); a fact-sheet rail carries the rank seal, the
 * 5→1 distribution and provenance; the main column is the composer plus the
 * sorted review stream with each review's threaded discussion attached.
 */
export default function RestaurantDetailPage() {
  const { id } = useParams()
  const { isAuthenticated } = useAuth()
  const notify = useToast()

  const [restaurant, setRestaurant] = useState(null)
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [reviews, setReviews] = useState(null)
  const [sort, setSort] = useState('best')
  const [reps, setReps] = useState({})
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [heroFailed, setHeroFailed] = useState(false)

  // Navigating between dossiers reuses this component (same route, new param),
  // so reset fetch state — otherwise restaurant A's data flashes while B loads,
  // and a stale `reviews` array defeats the loading guard below.
  useEffect(() => {
    setRestaurant(null)
    setReviews(null)
    setStats(null)
    setError('')
    setNotFound(false)
    setHeroFailed(false)
  }, [id])

  const loadData = useCallback(() => {
    if (!id) return
    getRestaurant(id)
      .then((data) => {
        setRestaurant(data)
        setSaved(Boolean(data.saved))
        setNotFound(false)
      })
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true)
        else setError('Failed to load this dossier.')
      })
    setStatsLoading(true)
    getRestaurantStats(id)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false))
  }, [id])

  useEffect(loadData, [loadData])

  // Review stream re-fetches when the sort changes.
  useEffect(() => {
    if (!id) return
    let cancelled = false
    listReviews(id, sort)
      .then(async (data) => {
        if (cancelled) return
        setReviews(data)
        const authorIds = [...new Set(data.map((r) => r.author?.id).filter(Boolean))]
        if (authorIds.length > 0) {
          try {
            setReps(await fetchReputations(authorIds))
          } catch {
            /* REP badges simply stay hidden */
          }
        }
      })
      .catch(() => !cancelled && setReviews([]))
    return () => {
      cancelled = true
    }
  }, [id, sort])

  // Live events on this dossier: a brand-new review (even the first one)
  // refreshes the sheet + stream in place; new comments arrive inside each
  // thread via the same stream.
  useLiveStream(id)

  useEffect(() => {
    return subscribe('review.created', (event) => {
      if (event.restaurantId !== id) return
      loadData()
      listReviews(id, sortRef.current).then(setRepsFrom).catch(() => {})
      notify('A new review just landed on this dossier.')
    })
  }, [id, loadData, notify])

  const sortRef = useRef(sort)
  useEffect(() => {
    sortRef.current = sort
  }, [sort])

  const handleSave = async () => {
    if (!isAuthenticated) return
    if (saving) return
    setSaving(true)
    try {
      if (saved) await unsaveRestaurant(id)
      else await saveRestaurant(id)
      const next = !saved
      setSaved(next)
      notify(next ? 'Saved to your list' : 'Removed from saved')
    } catch {
      /* keep state on failure */
    } finally {
      setSaving(false)
    }
  }

  // The dossier body needs `restaurant` — full stop. `reviews` resolving
  // first (an empty array is truthy!) must NOT release the skeleton, or
  // `restaurant.name` crashes on unreviewed entries.
  if (notFound) {
    return (
      <div className="mx-auto max-w-[1160px] px-4 py-20 text-center sm:px-6">
        <p className="micro-label mb-2">404 · no such entry</p>
        <h1 className="font-serif text-3xl font-bold text-ink">Dossier not found</h1>
        <Link to="/" className="btn-hard mt-6 inline-block px-4 py-2 text-sm">
          ← Back to the ledger
        </Link>
      </div>
    )
  }

  if (!restaurant) {
    if (error) {
      return (
        <div className="mx-auto max-w-[1160px] px-4 py-20 text-center sm:px-6">
          <p className="border-[1.5px] border-down bg-card px-4 py-3 text-sm font-semibold text-down">{error}</p>
          <button type="button" onClick={() => { setError(''); loadData(); }} className="btn-hard mt-6 px-4 py-2 text-sm">
            Retry
          </button>
        </div>
      )
    }
    return (
      <div className="mx-auto max-w-[1160px] px-4 pt-8 sm:px-6">
        <SkeletonStrip />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1160px] px-4 pb-20 pt-7 sm:px-6">
      {/* Hero A: full-bleed 16:7 band; name + meta over a gradient scrim.
          Same fallback chain as the rows: photo -> (broken) cuisine tile. */}
      <div className="relative overflow-hidden border-[1.5px] border-ink">
        <img
          src={heroFailed || !restaurant.imageUrl
            ? restaurant.fallbackUrl || '/images/cuisine/generic.svg'
            : resizeImageUrl(restaurant.imageUrl, 1200)}
          alt={`${restaurant.name} — the place`}
          onError={() => setHeroFailed(true)}
          className="aspect-[16/7] w-full object-cover object-center"
        />
        <div
          className="absolute inset-x-0 bottom-0 px-5 pb-4 pt-14 text-white sm:px-7"
          style={{ background: 'linear-gradient(to top, rgba(23,20,16,.88), rgba(23,20,16,.3) 60%, transparent)' }}
        >
          <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2">
            <h1 className="font-serif text-3xl font-bold tracking-tight drop-shadow-sm sm:text-[40px]">
              {restaurant.name}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 pb-1">
              {[restaurant.cuisineType, restaurant.priceRange, restaurant.locality]
                .filter(Boolean)
                .map((chipLabel) => (
                  <span
                    key={chipLabel}
                    className="border border-white/40 bg-black/25 px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm"
                  >
                    {chipLabel}
                  </span>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-strip: address + actions */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-sm font-medium text-muted">📍 {restaurant.address}</p>
        <div className="ml-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isAuthenticated}
            aria-pressed={saved}
            title={isAuthenticated ? undefined : 'Log in to save'}
            className={`btn-hard h-10 w-10 p-0 text-base ${saved ? 'border-up bg-up text-white' : ''}`}
          >
            ♥
          </button>
          <button type="button" onClick={() => window.scrollTo({ top: document.getElementById('composer')?.offsetTop - 90, behavior: 'smooth' })} className="btn-hard btn-hard-primary px-4 py-2 text-xs uppercase tracking-wide">
            Write a review
          </button>
        </div>
      </div>

      <div className="mt-7 grid items-start gap-9 lg:grid-cols-[290px_minmax(0,1fr)]">
        {/* Fact-sheet rail */}
        <aside className="lg:sticky lg:top-24">
          {statsLoading ? (
            <FactSheetSkeleton />
          ) : stats ? (
            <div className="panel p-5">
              <TierSeal tier={stats.tier} size="lg" />
              <p className="micro-label mt-3 text-center">in {restaurant.cityName}</p>
              <dl className="mt-4 space-y-0 border-t border-hair text-sm">
                <div className="flex items-baseline justify-between gap-3 border-b border-hair py-2.5">
                  <dt className="text-muted">Rank</dt>
                  <dd className="num text-base font-semibold">#{stats.rank}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-hair py-2.5">
                  <dt className="text-muted">Average</dt>
                  <dd className="num text-base font-semibold">{Number(restaurant.avgRating ?? 0).toFixed(1)} ★</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-hair py-2.5">
                  <dt className="text-muted">Reviews</dt>
                  <dd className="num text-base font-semibold">{stats.reviewCount}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-hair py-2.5">
                  <dt className="text-muted">First reviewed</dt>
                  <dd className="num text-[13px] font-semibold">
                    {stats.firstReviewedAt ? new Date(stats.firstReviewedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}
                  </dd>
                </div>
              </dl>
              <p className="micro-label mb-2 mt-4 text-left">Rating distribution</p>
              <div className="dist grid gap-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = Number(stats.distribution?.[star] ?? 0)
                  const total = Object.values(stats.distribution ?? {}).reduce((a, b) => a + Number(b), 0) || 1
                  return (
                    <div key={star} className="grid grid-cols-[26px_1fr_32px] items-center gap-2">
                      <span className="num text-[11px] text-muted">{star}★</span>
                      <span className="block h-2 w-full border border-hair bg-paper">
                        <span
                          className="block h-full"
                          style={{ width: `${total ? (count / total) * 100 : 0}%`, background: 'var(--color-gold)' }}
                        />
                      </span>
                      <span className="num text-right text-[11px] text-muted">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="panel-hair p-4 text-sm font-medium text-muted">Standing unavailable.</div>
          )}
        </aside>

        {/* Stream */}
        <div className="min-w-0">
          {error && (
            <div className="mb-4 border-[1.5px] border-down bg-card px-4 py-3 text-sm font-semibold text-down">
              {error}
            </div>
          )}

          <div id="composer" className="scroll-mt-24">
            {isAuthenticated ? (
              <ReviewForm
                restaurantId={id}
                onCreated={() => {
                  loadData()
                  setReviews(null)
                  listReviews(id, sort).then(setRepsFrom).catch(() => setReviews([]))
                }}
              />
            ) : (
              <div className="panel-hair mb-6 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <p className="text-sm font-semibold text-muted">
                  <Link to="/login" state={{ from: locationPath() }} className="font-bold text-emerald hover:underline">
                    Log in
                  </Link>{' '}
                  to write a review and join the discussion.
                </p>
                <Link to="/login" className="btn-hard px-4 py-2 text-xs uppercase tracking-wide">
                  Log in
                </Link>
              </div>
            )}
          </div>

          <div className="streamhead mb-4 mt-7 flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-xl font-bold text-ink">
              Reviews{' '}
              <span className="num align-middle text-sm font-medium text-muted">
                ({restaurant.reviewCount})
              </span>
            </h2>
            <div className="ml-auto flex gap-1.5">
              {REVIEW_SORTS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={sort === opt.value}
                  onClick={() => setSort(opt.value)}
                  className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition duration-150 ${
                    sort === opt.value ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {reviews === null ? (
            <div className="space-y-4">
              <ReviewCardSkeleton />
              <ReviewCardSkeleton />
            </div>
          ) : reviews.length === 0 ? (
            <EmptyState
              compact
              title="No reviews yet"
              description="Be the first entry in this dossier — your verdict starts the discussion."
              icon={<path d="M4 11h16l-1.5 8H5.5zM8 7h8l-1-2H9z" />}
            />
          ) : (
            <ul className="space-y-4">
              {reviews.map((review) => (
                <li key={review.id}>
                  <ReviewCard
                    review={review}
                    rep={reps[review.author?.id]}
                    onUpdated={() => {
                      loadData()
                      listReviews(id, sort).then(setRepsFrom).catch(() => {})
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )

  function setRepsFrom(data) {
    setReviews(data)
    const authorIds = [...new Set(data.map((r) => r.author?.id).filter(Boolean))]
    if (authorIds.length > 0) fetchReputations(authorIds).then(setReps).catch(() => {})
  }

  function locationPath() {
    return { pathname: `/restaurants/${id}` }
  }
}

function SkeletonStrip() {
  return (
    <div className="grid items-start gap-9 lg:grid-cols-[290px_minmax(0,1fr)]">
      <FactSheetSkeleton />
      <div className="space-y-4">
        <ReviewCardSkeleton />
        <ReviewCardSkeleton />
      </div>
    </div>
  )
}