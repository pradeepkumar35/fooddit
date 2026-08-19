import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listLocalities } from '../api/locations'
import { listCuisines, listRestaurants } from '../api/restaurants'
import EmptyState from '../components/EmptyState'
import RestaurantCard from '../components/RestaurantCard'
import RestaurantMap from '../components/RestaurantMap'
import { RestaurantCardSkeleton } from '../components/Skeleton'
import ZineSelect from '../components/ZineSelect'
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

const CUISINE_STYLE = [
  [/biryani|indian|rice|thali|north|south|punjabi|maha|curry/i, '#FF4D00', '🍛'],
  [/burger|fast|street|snack|sandwich/i, '#E0A13C', '🍔'],
  [/noodle|ramen|wok|chinese/i, '#5FA37A', '🍜'],
  [/pizza|italian|pasta|conti/i, '#E8336B', '🍕'],
  [/dessert|sweet|bakery|ice|cake/i, '#7A5CF0', '🍰'],
  [/beverage|juice|cafe|coffee|tea|bar/i, '#1F5CFF', '🍹'],
  [/seafood|coastal|fish/i, '#2E9E9B', '🥘'],
]
const DEFAULT_STYLE = ['#5A5347', '🍽️']
function styleFor(cuisine = '') {
  for (const [re, color, glyph] of CUISINE_STYLE) if (re.test(cuisine)) return { color, glyph }
  return { color: DEFAULT_STYLE[0], glyph: DEFAULT_STYLE[1] }
}
function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

export default function RestaurantListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { activeCity, activeLocality, setActiveLocation, setSwitcherOpen, cities } = useLocation()
  const [restaurants, setRestaurants] = useState([])
  const [cuisineOptions, setCuisineOptions] = useState([])
  const [localityOptions, setLocalityOptions] = useState([])
  const [totalCount, setTotalCount] = useState(null)
  const [topRated, setTopRated] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shownParamsKey, setShownParamsKey] = useState('')
  const [hoveredId, setHoveredId] = useState(null)

  const cuisine = searchParams.get('cuisine') || ''
  const urlCity = searchParams.get('city') || ''
  const locality = searchParams.get('locality') || ''
  const rating = searchParams.get('rating') || ''
  const sort = searchParams.get('sort') || 'top'

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

  useEffect(() => {
    if (!city) return
    const matched =
      cities.find((c) => c.citySlug === city) ?? cities.find((c) => c.cityName === city)
    if (matched && matched.citySlug !== (activeCity?.citySlug ?? '')) {
      setActiveLocation(matched.citySlug, locality || null)
    }
  }, [city, locality, cities, activeCity, setActiveLocation])

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

  const handleCityChange = (slug) => {
    const next = new URLSearchParams(searchParams)
    next.set('city', slug)
    next.delete('locality')
    setSearchParams(next, { replace: true })
  }

  const selectedCity = cities.find((c) => c.citySlug === city) ?? cities.find((c) => c.cityName === city)

  const pins = useMemo(() => {
    const lats = restaurants.map((r) => Number(r.latitude)).filter(Number.isFinite)
    const lngs = restaurants.map((r) => Number(r.longitude)).filter(Number.isFinite)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const spread = (v, min, max) => {
      if (!Number.isFinite(v)) return null
      const t = max === min ? 0.5 : (v - min) / (max - min)
      return 14 + t * 72
    }
    return restaurants.map((r) => {
      const x = spread(Number(r.longitude), minLng, maxLng)
      const y = spread(Number(r.latitude), minLat, maxLat)
      const { color, glyph } = styleFor(r.cuisineType || (r.cuisines && r.cuisines[0]) || '')
      return {
        ...r,
        x: x ?? 12 + (hash(r.id) % 76),
        y: y ?? 14 + ((hash(r.id) >> 4) % 72),
        color,
        glyph,
        featured: topRated[0]?.id === r.id,
      }
    })
  }, [restaurants, topRated])

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-16 pt-6">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        {/* ============ ZINE MAP PANE (left, desktop) ============ */}
        <aside className="order-2 hidden min-w-0 lg:order-1 lg:block">
          <div className="lg:sticky lg:top-24">
            <RestaurantMap
              pins={pins}
              loading={loading}
              count={restaurants.length}
              selectedCity={selectedCity}
              locality={locality}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
              setSwitcherOpen={setSwitcherOpen}
              totalCount={totalCount}
            />
          </div>
        </aside>

        {/* ============ ZINE COLLAGE PANE (right) ============ */}
        <main className="order-1 min-w-0 lg:order-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Sort reviews">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="tab"
                  aria-selected={sort === opt.value}
                  onClick={() => setParam('sort', opt.value)}
                  className={`border-2 border-ink px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition duration-150 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                    sort === opt.value
                      ? 'bg-accent text-surface shadow-card'
                      : 'bg-surface text-ink shadow-card hover:bg-accent-soft'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ZineSelect
                value={cuisine}
                onChange={(e) => setParam('cuisine', e.target.value)}
                aria-label="Filter by cuisine"
              >
                <option value="">All Cuisines</option>
                {cuisineOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </ZineSelect>
              <ZineSelect
                value={city}
                onChange={(e) => handleCityChange(e.target.value)}
                aria-label="Filter by city"
              >
                {cities.map((c) => (
                  <option key={c.citySlug} value={c.citySlug}>
                    {c.cityName}
                  </option>
                ))}
              </ZineSelect>
              <ZineSelect
                value={locality}
                onChange={(e) => setParam('locality', e.target.value)}
                aria-label="Filter by locality"
              >
                <option value="">All Localities</option>
                {localityOptions.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </ZineSelect>
              <ZineSelect
                value={rating}
                onChange={(e) => setParam('rating', e.target.value)}
                aria-label="Filter by rating"
              >
                <option value="">All Ratings</option>
                {RATING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </ZineSelect>
            </div>
          </div>

          {/* Mobile: map pinned between filters and the scrollable cards */}
          <div className="sticky top-24 z-10 mb-4 lg:hidden">
            <RestaurantMap
              pins={pins}
              loading={loading}
              count={restaurants.length}
              selectedCity={selectedCity}
              locality={locality}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
              setSwitcherOpen={setSwitcherOpen}
              totalCount={totalCount}
            />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="border-2 border-ink bg-accent px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-surface shadow-card">
              {loading ? 'Loading…' : `${restaurants.length} restaurant${restaurants.length === 1 ? '' : 's'}`}
            </span>
            {error && (
              <span className="border-2 border-ink bg-chili-500 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-surface shadow-card">
                {error}
              </span>
            )}
          </div>

          {loading && restaurants.length === 0 ? (
            <div className="columns-1 gap-4 sm:columns-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="mb-4 break-inside-avoid">
                  <RestaurantCardSkeleton />
                </div>
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
                <div className="columns-1 gap-4 sm:columns-2">
                  {restaurants.map((restaurant, index) => (
                    <div
                      key={restaurant.id}
                      onMouseEnter={() => setHoveredId(restaurant.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className="animate-pop-rotate stagger-fill mb-4 break-inside-avoid"
                      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                    >
                      <RestaurantCard restaurant={restaurant} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}