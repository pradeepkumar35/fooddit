import { useEffect, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { getProfile } from '../api/users'
import { listSavedRestaurants } from '../api/restaurants'
import EmptyState from '../components/EmptyState'
import RatingStars from '../components/RatingStars'
import { Skeleton } from '../components/Skeleton'
import VoteControl from '../components/VoteControl'
import { useAuth } from '../hooks/useAuth'
import { formatLongDate, formatRelativeTime } from '../utils/time'

/**
 * A user's public record. Tabs mirror the ledger language: Reviews /
 * Comments / Saved (Saved only on your own profile). Reputation is the
 * lifetime net-upvote figure surfaced by the backend.
 */
export default function UserProfilePage() {
  const { userId: paramUserId } = useParams()
  const { user: me } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(null)
  const [savedError, setSavedError] = useState('')

  const userId = paramUserId ?? me?.id
  const requestedTab = searchParams.get('tab')
  const tab = requestedTab === 'saved' || requestedTab === 'comments' ? requestedTab : 'reviews'

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setLoading(true)
    setError('')
    getProfile(userId)
      .then((data) => {
        if (!cancelled) {
          setProfile(data)
          setNotFound(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (err.response?.status === 404) setNotFound(true)
          else setError('Failed to load this profile.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    if (tab !== 'saved') return
    let cancelled = false
    setSaved(null)
    setSavedError('')
    listSavedRestaurants()
      .then((data) => !cancelled && setSaved(data))
      .catch(() => !cancelled && setSavedError('Failed to load saved restaurants.'))
    return () => {
      cancelled = true
    }
  }, [tab])

  if (!userId) return <Navigate to="/" replace />

  const isOwnProfile = me?.id === profile?.user?.id
  const tabs = isOwnProfile ? ['reviews', 'comments', 'saved'] : ['reviews', 'comments']

  const setTab = (value) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'reviews') next.delete('tab')
    else next.set('tab', value)
    setSearchParams(next, { replace: true })
  }

  const reputation = profile?.reputation

  return (
    <div className="mx-auto max-w-[1160px] px-4 pb-20 pt-7 sm:px-6">
      <div className="mx-auto max-w-[720px]">
        {loading ? (
          <div className="panel p-6" aria-hidden="true">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
          </div>
        ) : notFound || !profile ? (
          <div className="py-16 text-center">
            <p className="micro-label mb-2">404 · no such record</p>
            <h1 className="font-serif text-3xl font-bold text-ink">User not found</h1>
          </div>
        ) : (
          <>
            {/* Identity header */}
            <header className="panel flex flex-wrap items-center gap-4 p-5">
              <span
                aria-hidden="true"
                className="grid h-14 w-14 shrink-0 -rotate-[5deg] place-items-center rounded-full font-mono text-lg font-bold text-white"
                style={{ background: 'linear-gradient(140deg,#33415C,#1C2430)' }}
              >
                {profile.user.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="font-serif text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
                  {profile.user.name}
                </h1>
                <p className="num mt-0.5 text-xs uppercase tracking-wider text-muted">
                  {isOwnProfile && <span className="mr-3 normal-case">{profile.user.email}</span>}
                  REP {typeof reputation === 'number' ? reputation : 0} · joined{' '}
                  {formatLongDate(profile.user.createdAt)}
                </p>
              </div>
            </header>

            {error && (
              <div className="mt-4 border-[1.5px] border-down bg-card px-4 py-3 text-sm font-semibold text-down">
                {error}
              </div>
            )}

            {/* Tabs */}
            <div className="mt-5 flex flex-wrap gap-2">
              {tabs.map((t) => {
                const label = t.charAt(0).toUpperCase() + t.slice(1)
                const active = tab === t
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTab(t)}
                    className={`border-[1.5px] px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition duration-150 ${
                      active ? 'border-ink bg-ink text-paper' : 'border-hair bg-card text-ink hover:border-ink'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            <div key={tab} className="animate-fade-slide-in mt-5">
              {tab === 'saved' ? (
                <section>
                  {savedError && (
                    <p className="mb-3 border-[1.5px] border-down bg-card px-4 py-3 text-sm font-semibold text-down">
                      {savedError}
                    </p>
                  )}
                  {saved === null && !savedError ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full border border-hair" />
                      ))}
                    </div>
                  ) : saved && saved.length > 0 ? (
                    <ul className="divide-y divide-hair border-y border-hair">
                      {saved.map((restaurant) => (
                        <li key={restaurant.id}>
                          <Link
                            to={`/restaurants/${restaurant.id}`}
                            onMouseEnter={undefined}
                            className="flex items-baseline gap-3 px-1 py-3 transition-colors duration-150 hover:bg-card"
                          >
                            <span className="font-serif text-base font-semibold text-ink">{restaurant.name}</span>
                            <span className="truncate text-xs text-muted">
                              {[restaurant.cuisineType, restaurant.locality].filter(Boolean).join(' · ')}
                            </span>
                            <span className="num ml-auto text-sm font-semibold">
                              {Number(restaurant.avgRating ?? 0).toFixed(1)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState
                      compact
                      title="Nothing saved yet"
                      description="Tap the heart on any ledger row or dossier to keep it here."
                      icon={<path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />}
                      action={
                        <Link to="/" className="btn-hard px-3.5 py-2 text-xs uppercase tracking-wide">
                          Browse the ledger →
                        </Link>
                      }
                    />
                  )}
                </section>
              ) : tab === 'comments' ? (
                <section>
                  {profile.comments.length === 0 ? (
                    <EmptyState
                      compact
                      title="No comments yet"
                      description="Replies posted under any review will be recorded here."
                      icon={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />}
                    />
                  ) : (
                    <ul className="space-y-3.5">
                      {profile.comments.map((comment) => (
                        <li key={comment.id}>
                          <article className="panel-hair relative p-4">
                            <header className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="micro-label normal-case tracking-normal">on</span>
                              <Link
                                to={`/restaurants/${comment.restaurantId}`}
                                className="font-bold text-emerald transition-colors duration-150 hover:underline"
                              >
                                {comment.restaurantName}
                              </Link>
                              <span className="num text-xs text-muted">· {formatRelativeTime(comment.createdAt)}</span>
                              {comment.editedAt && <span className="text-[10px] italic text-muted">(edited)</span>}
                              <VoteControl
                                votableType="COMMENT"
                                votableId={comment.id}
                                initialScore={comment.score}
                                initialMyVote={comment.myVote}
                                size="sm"
                              />
                            </header>
                            <p className="break-words whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-ink/90">
                              {comment.content}
                            </p>
                            <p className="line-clamp-2 border-l-2 border-hair pl-3 pt-0.5 font-serif text-xs italic text-muted">
                              {comment.reviewContent}
                            </p>
                          </article>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : (
                <section>
                  {profile.reviews.length === 0 ? (
                    <EmptyState
                      compact
                      title="No reviews yet"
                      description="Verdicts written for any restaurant will appear here."
                      icon={<path d="M4 11h16l-1.5 8H5.5zM8 7h8l-1-2H9z" />}
                    />
                  ) : (
                    <ul className="space-y-3.5">
                      {profile.reviews.map((review) => (
                        <li key={review.id}>
                          <article className="panel-hair relative p-4">
                            <header className="flex flex-wrap items-center gap-2 text-sm">
                              <Link
                                to={`/restaurants/${review.restaurantId}`}
                                className="font-serif text-base font-bold text-ink transition-colors duration-150 hover:text-emerald"
                              >
                                {review.restaurantName}
                              </Link>
                              <RatingStars value={review.rating} className="text-sm" />
                              <span className="num text-xs text-muted">· {formatRelativeTime(review.createdAt)}</span>
                              {review.editedAt && <span className="text-[10px] italic text-muted">(edited)</span>}
                              <VoteControl
                                votableType="REVIEW"
                                votableId={review.id}
                                initialScore={review.score}
                                initialMyVote={review.myVote}
                                size="sm"
                              />
                            </header>
                            <p className="mt-2 break-words whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-ink/90">
                              {review.content}
                            </p>
                          </article>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}