import { useEffect, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { getProfile } from '../api/users'
import { listSavedRestaurants } from '../api/restaurants'
import EmptyState from '../components/EmptyState'
import RatingStars from '../components/RatingStars'
import RestaurantCard from '../components/RestaurantCard'
import { RestaurantCardSkeleton, Skeleton } from '../components/Skeleton'
import VoteControl from '../components/VoteControl'
import { useAuth } from '../hooks/useAuth'
import { formatLongDate, formatRelativeTime } from '../utils/time'

/**
 * User profile showing their reviews and comments, plus a "Saved" tab on the
 * user's own profile. Used for the current user (/profile, protected) and for
 * any other user (/users/:userId, public).
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
      .then((data) => {
        if (!cancelled) setSaved(data)
      })
      .catch(() => {
        if (!cancelled) setSavedError('Failed to load saved restaurants.')
      })
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

  return (
    <div className="mx-auto max-w-[1080px] px-4 pb-16 pt-6">
      <div className="flex gap-6">
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[640px]">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-36 border-2 border-ink" />
                <RestaurantCardSkeleton />
                <RestaurantCardSkeleton />
              </div>
            ) : notFound || !profile ? (
              <div className="py-12 text-center">
                <h1 className="font-display text-3xl font-semibold uppercase tracking-wide text-ink">
                  User not found
                </h1>
              </div>
            ) : (
              <>
                <header className="sticker relative p-5">
                  <span className="tape" aria-hidden="true" />
                  <div className="flex items-center gap-4">
                    <div className="sticker grid h-16 w-16 shrink-0 -rotate-3 place-items-center bg-accent font-display text-3xl font-semibold text-surface">
                      {profile.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h1 className="font-display text-3xl font-semibold uppercase leading-tight tracking-wide text-ink">
                        {profile.user.name}
                      </h1>
                      <p className="mt-1 text-sm font-semibold text-muted">
                        {isOwnProfile && <span className="mr-2">{profile.user.email}</span>}
                        Joined {formatLongDate(profile.user.createdAt)}
                      </p>
                    </div>
                  </div>
                </header>

                {error && (
                  <div className="mt-4 border-2 border-chili-500 bg-surface px-4 py-3 text-sm font-semibold text-chili-600 shadow-card">
                    {error}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-2">
                  {tabs.map((t) => {
                    const label = t.charAt(0).toUpperCase() + t.slice(1)
                    const active = tab === t
                    return (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setTab(t)}
                        className={`border-2 border-ink px-3 py-1.5 text-sm font-bold uppercase tracking-wide transition duration-150 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                          active ? 'bg-accent text-surface shadow-card' : 'bg-surface text-ink shadow-card hover:bg-accent-soft'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>

                <div key={tab} className="animate-fade-slide-in">
                {tab === 'saved' ? (
                  <section className="mt-6">
                    {savedError && (
                      <p className="border-2 border-chili-500 bg-surface px-4 py-3 text-sm font-semibold text-chili-600 shadow-card">
                        {savedError}
                      </p>
                    )}
                    {saved === null && !savedError ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <RestaurantCardSkeleton key={i} />
                        ))}
                      </div>
                    ) : saved && saved.length > 0 ? (
                      <ul className="space-y-3">
                        {saved.map((restaurant) => (
                          <li key={restaurant.id}>
                            <RestaurantCard
                              restaurant={restaurant}
                              onSavedChange={(nowSaved) => {
                                if (!nowSaved) {
                                  setSaved((current) => current.filter((r) => r.id !== restaurant.id))
                                }
                              }}
                            />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <EmptyState
                        title="No saved restaurants yet"
                        description="Tap the bookmark on any restaurant to keep it here for later."
                        icon={
                          <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        }
                        action={
                          <Link
                            to="/"
                            className="hard-btn inline-block border-2 bg-surface px-3 py-2 text-sm font-bold uppercase tracking-wide text-accent hover:bg-accent hover:text-surface"
                          >
                            Browse restaurants →
                          </Link>
                        }
                      />
                    )}
                  </section>
                ) : tab === 'comments' ? (
                  <section className="mt-6">
                    <h2 className="mb-3 sticker inline-block px-3 py-1.5 font-display text-base font-semibold uppercase tracking-wide text-ink">
                      Comments ({profile.comments.length})
                    </h2>
                    {profile.comments.length === 0 ? (
                      <EmptyState
                        compact
                        title="No comments yet"
                        description="Comments you post on reviews will show up here."
                        icon={
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        }
                      />
                    ) : (
                      <ul className="space-y-4">
                        {profile.comments.map((comment) => (
                          <li key={comment.id} className="animate-fade-slide-in stagger-fill">
                            <article className="sticker relative flex gap-3 p-3">
                              <span className="tape" aria-hidden="true" />
                              <VoteControl
                                votableType="COMMENT"
                                votableId={comment.id}
                                initialScore={comment.score}
                                initialMyVote={comment.myVote}
                                size="sm"
                              />
                              <div className="min-w-0 flex-1 break-words">
                                <header className="flex flex-wrap items-center gap-2 text-sm">
                                  <span className="text-xs font-bold uppercase tracking-wide text-muted">on</span>
                                  <Link
                                    to={`/restaurants/${comment.restaurantId}`}
                                    className="font-bold text-accent transition-colors duration-150 hover:underline"
                                  >
                                    {comment.restaurantName}
                                  </Link>
                                  <span className="text-muted">
                                    · {formatRelativeTime(comment.createdAt)}
                                  </span>
                                  {comment.editedAt && (
                                    <span className="text-xs italic text-muted">(edited)</span>
                                  )}
                                </header>
                                <p className="mt-2 break-words whitespace-pre-wrap font-serif text-base leading-relaxed text-ink/85">
                                  {comment.content}
                                </p>
                                <p className="mt-2 line-clamp-2 border-l-2 border-ink/20 pl-3 font-serif text-sm italic text-muted">
                                  {comment.reviewContent}
                                </p>
                              </div>
                            </article>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ) : (
                  <section className="mt-6">
                    <h2 className="mb-3 sticker inline-block px-3 py-1.5 font-display text-base font-semibold uppercase tracking-wide text-ink">
                      Reviews ({profile.reviews.length})
                    </h2>
                    {profile.reviews.length === 0 ? (
                      <EmptyState
                        compact
                        title="No reviews yet"
                        description="Reviews you write will show up here."
                        icon={
                          <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
                        }
                      />
                    ) : (
                      <ul className="space-y-4">
                        {profile.reviews.map((review) => (
                          <li key={review.id} className="animate-fade-slide-in stagger-fill">
                            <article className="sticker relative flex gap-3 p-3">
                              <span className="tape" aria-hidden="true" />
                              <VoteControl
                                votableType="REVIEW"
                                votableId={review.id}
                                initialScore={review.score}
                                initialMyVote={review.myVote}
                              />
                              <div className="min-w-0 flex-1 break-words">
                                <header className="flex flex-wrap items-center gap-2 text-sm">
                                  <Link
                                    to={`/restaurants/${review.restaurantId}`}
                                    className="font-bold text-accent transition-colors duration-150 hover:underline"
                                  >
                                    {review.restaurantName}
                                  </Link>
                                  <RatingStars value={review.rating} className="text-base" />
                                  <span className="text-muted">
                                    · {formatRelativeTime(review.createdAt)}
                                  </span>
                                  {review.editedAt && (
                                    <span className="text-xs italic text-muted">(edited)</span>
                                  )}
                                </header>
                                <p className="mt-2 break-words whitespace-pre-wrap font-serif text-lg leading-relaxed text-ink/85">
                                  {review.content}
                                </p>
                              </div>
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
        </main>

        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-24 sticker relative p-4">
            <span className="tape" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold uppercase tracking-wide text-ink">
              About Fooddit
            </h2>
            <p className="mt-2 font-serif text-sm leading-relaxed text-muted">
              Restaurant reviews worth discussing. Rate what you ate, then join the threaded
              conversation under each review.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
