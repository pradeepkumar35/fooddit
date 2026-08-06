import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listLocalities } from '../api/locations'
import { listCuisines, listRestaurants } from '../api/restaurants'
import EmptyState from '../components/EmptyState'
import PillTabs from '../components/PillTabs'
import RestaurantCard from '../components/RestaurantCard'
import { RestaurantCardSkeleton } from '../components/Skeleton'
import { useLocation } from '../hooks/useLocation'

const RATING_OPTIONS = [
  { value: '4', label: '4 star & up' },
  { value: '3', label: '3 star & up' },
  { value: '1', label: '1 star & up' },
]
const SORT_OPTIONS = [
  { value: 'top', label: 'Top' },
  { value: 'new', label: 'New' },
  { value: 'mostdiscussed', label: 'Most discussed' },
]

/**
 * Reddit-style feed: a centered ~640px column of restaurant cards plus a right
 * sidebar (desktop only) with an About card and a top-rated widget. The feed is
 * always scoped to a serviceable city (?city=city_slug, required) and can be
 * narrowed to a ?locality= within it. All filters live in the URL (?q=,
 * ?cuisine=, ?city=, ?locality=, ?rating=, ?sort=) so the navbar search and the
 * location switcher share state, filters survive navigation/refresh, and URLs
 * stay shareable. The URL is the single source of truth.
 */
export default function RestaurantListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { activeCity, activeLocality, setActiveLocation, cities } = useLocation()
  const [restaurants, setRestaurants] = useState([])
  const [cuisineOptions, setCuisineOptions] = useState([])
  const [localityOptions, setLocalityOptions] = useState([])
  const [totalCount, setTotalCount] = useState(null)
  const [topRated, setTopRated] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shownParamsKey, setShownParamsKey] = useState('')

  const cuisine = searchParams.get('cuisine') || ''
  const urlCity = searchParams.get('city') || ''
  const locality = searchParams.get('locality') || ''
  const rating = searchParams.get('rating') || ''
  const sort = searchParams.get('sort') || 'top'

  // The URL is the source of truth; when it has no city yet, fall back to the
  // active location (from the switcher / localStorage) and write it into the URL.
  const city = urlCity || activeCity?.citySlug || ''

  const setParam = (key, value) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        value ? next.set(key, value) : next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  // Persist the URL location into the context so the navbar bar stays in sync.
  useEffect(() => {
    if (!city) return
    const matched =
      cities.find((c) => c.citySlug === city) ?? cities.find((c) => c.cityName === city)
    if (matched && matched.citySlug !== (activeCity?.citySlug ?? '')) {
      setActiveLocation(matched.citySlug, locality || null)
    }
  }, [city, locality, cities, activeCity, setActiveLocation])

  // Once the active location is known and the URL has no city, backfill it.
  useEffect(() => {
    if (!urlCity && activeCity?.citySlug && city) {
      const next = new URLSearchParams(searchParams)
      next.set('city', activeCity.citySlug)
      activeLocality ? next.set('locality', activeLocality) : next.delete('locality')
      setSearchParams(next, { replace: true })
    }
  }, [urlCity, activeCity, activeLocality, city, searchParams, setSearchParams])

  useEffect(() => {
    listCuisines()
      .then(setCuisineOptions)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!city) return
    let cancelled = false
    listLocalities(city)
      .then((data) => {
        if (!cancelled) setLocalityOptions(data)
      })
      .catch(() => {
        if (!cancelled) setLocalityOptions([])
      })
    return () => {
      cancelled = true
    }
  }, [city])

  useEffect(() => {
    if (!city) return
    let cancelled = false
    listRestaurants({ sort: 'rating', city })
      .then((all) => {
        if (cancelled) return
        setTopRated(all.slice(0, 5))
        setTotalCount(all.length)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [city])

  const params = useMemo(() => {
    const p = {}
    const q = searchParams.get('q') || ''
    if (q.trim()) p.q = q.trim()
    if (cuisine) p.cuisine = cuisine
    if (city) p.city = city
    if (locality) p.locality = locality
    if (rating) p.rating = rating
    p.sort = sort
    return p
  }, [searchParams, cuisine, city, locality, rating, sort])

  const resultsKey = [searchParams.get('q') || '', cuisine, city, locality, rating, sort].join('|')

  // On fresh results, advance the animation key so the list re-mounts with a
  // staggered fade-in. Cards cascade in one-by-one (cheap single-layer opacity
  // fade) instead of the whole list crossfading, which ghosts and stutters.
  useEffect(() => {
    if (!city) return
    let cancelled = false
    setLoading(true)
    listRestaurants(params)
      .then((data) => {
        if (cancelled) return
        setRestaurants(data)
        setError('')
        setShownParamsKey(resultsKey)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load restaurants. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [params, resultsKey, city])

  const selectClass =
    'h-8 rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:outline-none'

  const handleCityChange = (slug) => {
    const next = new URLSearchParams(searchParams)
    next.set('city', slug)
    next.delete('locality')
    setSearchParams(next, { replace: true })
  }

  const selectedCity = cities.find((c) => c.citySlug === city) ?? cities.find((c) => c.cityName === city)

  return (
    <div className="mx-auto max-w-[1080px] px-4 pb-16 pt-6">
      <div className="flex gap-6">
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[640px]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <PillTabs options={SORT_OPTIONS} value={sort} onChange={(v) => setParam('sort', v)} />

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={cuisine}
                  onChange={(e) => setParam('cuisine', e.target.value)}
                  className={selectClass}
                  aria-label="Filter by cuisine"
                >
                  <option value="">All Cuisines</option>
                  {cuisineOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={city}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className={selectClass}
                  aria-label="Filter by city"
                >
                  {cities.map((c) => (
                    <option key={c.citySlug} value={c.citySlug}>
                      {c.cityName}
                    </option>
                  ))}
                </select>
                <select
                  value={locality}
                  onChange={(e) => setParam('locality', e.target.value)}
                  className={selectClass}
                  aria-label="Filter by locality"
                >
                  <option value="">All Localities</option>
                  {localityOptions.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
                <select
                  value={rating}
                  onChange={(e) => setParam('rating', e.target.value)}
                  className={selectClass}
                  aria-label="Filter by rating"
                >
                  <option value="">All Ratings</option>
                  {RATING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="mb-3 text-xs text-muted">
              {loading ? 'Loading…' : `${restaurants.length} restaurant${restaurants.length === 1 ? '' : 's'}`}
            </p>

            {error && (
              <div className="mb-4 rounded-lg border border-chili-500/40 bg-surface px-4 py-3 text-sm text-chili-600">
                {error}
              </div>
            )}

            {loading && restaurants.length === 0 ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <RestaurantCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div key={shownParamsKey}>
                {restaurants.length === 0 ? (
                  <div className="animate-fade-slide-in">
                    <EmptyState
                      title="No restaurants match your filters"
                      description="Try removing a filter, or search for a different restaurant or cuisine."
                      icon={
                        <>
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.35-4.35" />
                        </>
                      }
                    />
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {restaurants.map((restaurant, index) => (
                      <li
                        key={restaurant.id}
                        className="animate-fade-slide-in stagger-fill"
                        style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
                      >
                        <RestaurantCard restaurant={restaurant} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </main>

        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-20 space-y-4">
            <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
              <h2 className="font-display text-base font-semibold text-ink">About Fooddit</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Restaurant reviews worth discussing. Rate what you ate, then join the threaded
                conversation under each review.
              </p>
              {totalCount !== null && selectedCity && (
                <p className="mt-3 text-xs text-muted">
                  {totalCount} restaurants in {selectedCity.cityName}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
              <h2 className="font-display text-base font-semibold text-ink">Top rated</h2>
              <ul className="mt-3 space-y-2">
                {topRated.map((restaurant, index) => (
                  <li key={restaurant.id}>
                    <Link
                      to={`/restaurants/${restaurant.id}`}
                      className="group flex items-baseline gap-3"
                    >
                      <span className="font-display text-sm font-semibold tabular-nums text-muted group-hover:text-accent">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-ink group-hover:text-accent">
                        {restaurant.name}
                      </span>
                      <span className="text-xs tabular-nums text-muted">
                        {restaurant.avgRating.toFixed(1)} ★
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                to="/"
                className="mt-3 block text-xs font-medium text-accent hover:underline"
              >
                Browse all →
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
