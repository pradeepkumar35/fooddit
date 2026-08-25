import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchLedger, listCuisines, listRestaurants } from '../api/restaurants'
import EmptyState from '../components/EmptyState'
import LedgerRow from '../components/LedgerRow'
import LedgerSelect from '../components/LedgerSelect'
import Pagination from '../components/Pagination'
import RestaurantMap from '../components/RestaurantMap'
import TierSeal from '../components/TierSeal'
import { LedgerRowSkeleton } from '../components/Skeleton'
import { useLocation } from '../hooks/useLocation'

const SORT_OPTIONS = [
  { value: 'mostdiscussed', label: 'Most discussed' },
  { value: 'rating', label: 'Top rated' },
  { value: 'new', label: 'Newest' },
]

const RATING_OPTIONS = [
  { value: '', label: 'Any rating' },
  { value: '4', label: '4 star & up' },
  { value: '3', label: '3 star & up' },
]

/* Cuisine → pin color/glyph for the secondary MAP view. */
const CUISINE_STYLE = [
  [/biryani|indian|rice|thali|north|south|punjabi|maha|curry/i, '#B98A1F', '🍛'],
  [/burger|fast|street|snack|sandwich/i, '#8E2F3C', '🍔'],
  [/noodle|ramen|wok|chinese/i, '#1E6E5C', '🍜'],
  [/pizza|italian|pasta|conti/i, '#5F6B76', '🍕'],
  [/dessert|sweet|bakery|ice|cake/i, '#1C2430', '🍰'],
  [/beverage|juice|cafe|coffee|tea|bar/i, '#2E9E9B', '🍹'],
]
function styleFor(cuisine = '') {
  for (const [re, color, glyph] of CUISINE_STYLE) if (re.test(cuisine)) return { color, glyph }
  return { color: '#757064', glyph: '🍽️' }
}
function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

/**
 * Home. Two views behind the masthead tabs:
 *  - LEDGER (default): the City Ledger — server-paginated enriched rows,
 *    discussion-first hierarchy, Most Discussed default sort.
 *  - MAP: the full explorer map with pins synced to a simple index below.
 */
export default function RestaurantListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { activeCity, activeLocality, setActiveLocation, setSwitcherOpen, cities } = useLocation()

  const view = searchParams.get('view') === 'map' ? 'map' : 'ledger'
  const cuisine = searchParams.get('cuisine') || ''
  const urlCity = searchParams.get('city') || ''
  const locality = searchParams.get('locality') || ''
  const rating = searchParams.get('rating') || ''
  const rawSort = searchParams.get('sort') || 'mostdiscussed'
  const sort = ['mostdiscussed', 'rating', 'new'].includes(rawSort) ? rawSort : 'mostdiscussed'
  const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10) || 0)
  const city = urlCity || activeCity?.citySlug || ''

  // Defensive: a failed/malformed locations payload must never blank the page.
  const cityList = Array.isArray(cities) ? cities : []

  // ---- ledger state ----
  const [ledgerRows, setLedgerRows] = useState(null)
  const [ledgerError, setLedgerError] = useState('')
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [retryTick, setRetryTick] = useState(0)

  // ---- map-view state ----
  const [mapRows, setMapRows] = useState([])
  const [mapLoading, setMapLoading] = useState(true)
  const [hoveredId, setHoveredId] = useState(null)

  const [cuisineOptions, setCuisineOptions] = useState([])

  // Defensive: a failed/malformed locations payload must never blank the page.

  const setParam = (key, value) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        value ? next.set(key, value) : next.delete(key)
        if (key !== 'page') next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  useEffect(() => {
    listCuisines()
      .then(setCuisineOptions)
      .catch(() => {})
  }, [])

  // Keep the location context in step with an explicit ?city= deep link.
  useEffect(() => {
    if (!city) return
    const matched =
      cityList.find((c) => c.citySlug === city) ?? cityList.find((c) => c.cityName === city)
    if (matched && matched.citySlug !== (activeCity?.citySlug ?? '')) {
      setActiveLocation(matched.citySlug, locality || null)
    }
  }, [city, locality, cities, activeCity, setActiveLocation])

  // Inject the context city into the URL when the visitor landed without one.
  // Explicit deep-link params (?city=&locality=) always win and are preserved.
  useEffect(() => {
    if (urlCity) return
    if (!activeCity?.citySlug) return
    if (searchParams.get('city') === activeCity.citySlug) return
    const next = new URLSearchParams(searchParams)
    next.set('city', activeCity.citySlug)
    if (!searchParams.get('locality')) {
      activeLocality ? next.set('locality', activeLocality) : next.delete('locality')
    }
    setSearchParams(next, { replace: true })
  }, [urlCity, activeCity, activeLocality, city, searchParams, setSearchParams])

  // The ledger query — one request per page of rows.
  useEffect(() => {
    if (view !== 'ledger' || !city) return
    let cancelled = false
    setLedgerRows(null)
    setLedgerError('')
    const params = { city, sort, page, size: 30 }
    if (cuisine) params.cuisine = cuisine
    if (locality) params.locality = locality
    if (rating) params.rating = rating
    fetchLedger(params)
      .then((data) => {
        if (cancelled) return
        setLedgerRows(data.content ?? [])
        setTotalElements(data.totalElements ?? 0)
        setTotalPages(data.totalPages ?? 0)
      })
      .catch(() => {
        if (!cancelled) setLedgerError('Failed to load the ledger. Please try again.')
      })
    return () => {
      cancelled = true
    }
  }, [view, city, sort, page, cuisine, locality, rating, retryTick])

  // MAP view keeps using the full-list feed endpoint.
  useEffect(() => {
    if (view !== 'map' || !city) return
    let cancelled = false
    setMapLoading(true)
    const params = { city }
    if (cuisine) params.cuisine = cuisine
    if (locality) params.locality = locality
    if (rating) params.rating = rating
    listRestaurants(params)
      .then((data) => !cancelled && setMapRows(data))
      .catch(() => !cancelled && setMapRows([]))
      .finally(() => !cancelled && setMapLoading(false))
    return () => {
      cancelled = true
    }
  }, [view, city, cuisine, locality, rating])

  const selectedCity = cityList.find((c) => c.citySlug === city) ?? cityList.find((c) => c.cityName === city)

  const mapPins = useMemo(() => {
    const lats = mapRows.map((r) => Number(r.latitude)).filter(Number.isFinite)
    const lngs = mapRows.map((r) => Number(r.longitude)).filter(Number.isFinite)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    const spread = (v, min, max) => {
      if (!Number.isFinite(v)) return null
      const t = max === min ? 0.5 : (v - min) / (max - min)
      return 14 + t * 72
    }
    return mapRows.map((r) => {
      const x = spread(Number(r.longitude), minLng, maxLng)
      const y = spread(Number(r.latitude), minLat, maxLat)
      const { color, glyph } = styleFor(r.cuisineType || (r.cuisines && r.cuisines[0]) || '')
      return {
        ...r,
        x: x ?? 12 + (hash(r.id) % 76),
        y: y ?? 14 + ((hash(r.id) >> 4) % 72),
        color,
        glyph,
        featured: false,
      }
    })
  }, [mapRows])

  const setPage = (nextPage) => {
    const next = new URLSearchParams(searchParams)
    nextPage > 0 ? next.set('page', String(nextPage)) : next.delete('page')
    setSearchParams(next)
  }

  /* ============================== MAP VIEW ============================== */
  if (view === 'map') {
    return (
      <div className="mx-auto max-w-[1160px] px-4 pb-16 pt-6 sm:px-6">
        <div className="kicker-line">
          <h1 className="font-serif text-2xl font-bold text-ink">
            Atlas · {selectedCity ? selectedCity.cityName : '…'}
            {activeLocality ? ` · ${activeLocality}` : ''}
          </h1>
        </div>

        <div className="panel relative -rotate-[0.4deg] overflow-hidden p-0" style={{ minHeight: 320 }}>
          <div className="map-streets pointer-events-none absolute inset-0 opacity-70 dark:opacity-40" aria-hidden="true" />
          <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
            {mapPins.length === 0 && !mapLoading && (
              <div className="absolute inset-0 grid place-items-center px-6 text-center">
                <p className="text-sm font-semibold text-muted">No restaurants to plot here yet.</p>
              </div>
            )}
            <div role="img" aria-label={`Map of restaurants in ${selectedCity?.cityName || 'your area'}`} className="h-full w-full">
              {mapPins.map((pin, i) => (
                <button
                  key={pin.id}
                  type="button"
                  onMouseEnter={() => setHoveredId(pin.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => setHoveredId(pin.id)}
                  aria-label={`${pin.name}, rating ${Number(pin.avgRating).toFixed(1)}`}
                  className="animate-pop-rotate absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1 transition-transform duration-200 hover:scale-110"
                  style={{ left: `${pin.x}%`, top: `${pin.y}%`, animationDelay: `${Math.min(i, 8) * 50}ms` }}
                >
                  <span
                    className={`grid h-10 w-10 rotate-45 place-items-center rounded-md border-[1.5px] border-ink transition-transform duration-200 ${
                      hoveredId === pin.id ? 'scale-110' : ''
                    }`}
                    style={{ background: pin.color }}
                  >
                    <span className="-rotate-45 text-base">{pin.glyph}</span>
                  </span>
                  <span className="num border-[1.5px] border-hair bg-card px-1.5 py-0.5 text-[10px] font-bold text-ink">
                    {Number(pin.avgRating).toFixed(1)}★
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-hair bg-card px-3 py-2">
            <span className="micro-label">{mapLoading ? 'Plotting…' : `${mapPins.length} plotted`}</span>
            <Link to="/" className="micro-label ml-auto normal-case tracking-normal hover:text-ink">
              ← back to the ledger
            </Link>
          </div>
        </div>

        {/* Docked index under the atlas */}
        <div className="mt-6 grid gap-px border border-hair bg-hair">
          {mapRows.map((r) => (
            <Link
              key={r.id}
              to={`/restaurants/${r.id}`}
              onMouseEnter={() => setHoveredId(r.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`flex items-baseline gap-3 bg-paper px-4 py-3 transition-colors duration-150 hover:bg-card ${
                hoveredId === r.id ? 'bg-card' : ''
              }`}
            >
              <span className="font-serif text-base font-semibold text-ink">{r.name}</span>
              <span className="truncate text-xs text-muted">{[r.cuisineType, r.locality].filter(Boolean).join(' · ')}</span>
              <span className="num ml-auto text-sm font-semibold text-ink">{Number(r.avgRating ?? 0).toFixed(1)}</span>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  /* ============================ LEDGER VIEW ============================ */
  return (
    <div className="mx-auto max-w-[1160px] px-4 pb-20 pt-7 sm:px-6">
      <div className="mb-1.5 flex items-baseline gap-4">
        <h1 className="font-serif text-[28px] font-bold tracking-tight text-ink sm:text-[34px]">
          {selectedCity ? selectedCity.cityName : 'The City Ledger'}
          {activeLocality && locality ? ` · ${locality}` : ''}
        </h1>
        {!ledgerError && (
          <span className="num animate-score-in text-xs text-muted">{totalElements} entries</span>
        )}
      </div>
      <p className="mb-5 max-w-[70ch] text-xs leading-relaxed text-muted">
        <b className="font-semibold text-ink">#rank</b> is a restaurant's standing in the city — by rating,
        ties broken by review count. It travels with each entry; the sort below only changes your browse order.
        Seals: <TierSeal tier="ELITE" animate={false} /> elite · <TierSeal tier="GREAT" animate={false} /> great ·{' '}
        <TierSeal tier="SOLID" animate={false} /> solid.
      </p>

      {/* Controls */}
      <div className="sticky top-16 z-10 -mx-4 mb-1 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-hair bg-paper px-4 py-3 sm:-mx-6 sm:px-6">
        <span className="micro-label hidden sm:inline">Sort</span>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={sort === opt.value}
              onClick={() => setParam('sort', opt.value === 'mostdiscussed' ? '' : opt.value)}
              className={`border-[1.5px] px-3.5 py-2 text-xs font-semibold transition duration-150 ${
                sort === opt.value
                  ? 'border-ink bg-ink text-paper'
                  : 'border-hair bg-card text-ink hover:border-ink'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <LedgerSelect
            value={cuisine}
            onChange={(e) => setParam('cuisine', e.target.value)}
            aria-label="Filter by cuisine"
          >
            <option value="">All cuisines</option>
            {cuisineOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </LedgerSelect>
          <LedgerSelect
            value={rating}
            onChange={(e) => setParam('rating', e.target.value)}
            aria-label="Filter by rating"
          >
            {RATING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </LedgerSelect>
        </div>
      </div>

      {/* Rows */}
      {ledgerError ? (
        <div className="mt-6 border-[1.5px] border-down bg-card px-4 py-3 text-sm font-semibold text-down">
          {ledgerError}{' '}
          <button type="button" onClick={() => setRetryTick((t) => t + 1)} className="ml-1 font-bold underline">
            Retry
          </button>
        </div>
      ) : ledgerRows === null ? (
        <div className="mt-2" role="status" aria-label="Loading the ledger">
          {[...Array(6)].map((_, i) => (
            <LedgerRowSkeleton key={i} />
          ))}
        </div>
      ) : ledgerRows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nothing on the ledger yet"
            description={
              selectedCity
                ? `No entries match this slice of ${selectedCity.cityName}. Clear a filter or switch locality.`
                : 'Pick a serviceable city from the location pill to open its ledger.'
            }
            icon={<path d="M4 11h16l-1.5 8H5.5zM8 7h8l-1-2H9z" />}
          />
        </div>
      ) : (
        <>
          <div className="ledger mt-2 border-b border-hair">
            {ledgerRows.map((row, i) => (
              <LedgerRow key={row.id} row={row} index={i} />
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          <p className="pagenote num mt-3 text-center text-[11px] text-muted">
            30 restaurants per page · page {page + 1} of {Math.max(totalPages, 1)} · paginated by the backend
          </p>
        </>
      )}
    </div>
  )
}