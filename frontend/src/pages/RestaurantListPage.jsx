import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchLedger, listCuisines, listRestaurants } from '../api/restaurants'
import EmptyState from '../components/EmptyState'
import LedgerRow from '../components/LedgerRow'
import LedgerSelect from '../components/LedgerSelect'
import Pagination from '../components/Pagination'
import TierSeal from '../components/TierSeal'
import { LedgerRowSkeleton } from '../components/Skeleton'
import { useLocation } from '../hooks/useLocation'

/* The Atlas is code-split: ledger visitors never download Leaflet. */
const MapView = lazy(() => import('../components/MapView'))

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

/**
 * Home. Two views behind the masthead tabs:
 *  - LEDGER (default): the City Ledger — server-paginated enriched rows,
 *    discussion-first hierarchy, Most Discussed default sort.
 *  - MAP: the Atlas — a real Leaflet map of the current slice, with a simple
 *    index below.
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
  // Restaurant the index focused on the map ({ id, n }; n retriggers a repeat tap).
  const [mapSelected, setMapSelected] = useState(null)

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

  const setPage = (nextPage) => {
    const next = new URLSearchParams(searchParams)
    nextPage > 0 ? next.set('page', String(nextPage)) : next.delete('page')
    setSearchParams(next)
  }

  // Index tap -> the Atlas flies to that pin and opens its popup. The map may
  // be scrolled out of view, so bring it back before the flight lands.
  const focusOnMap = (row) => {
    setMapSelected((s) => ({ id: row.id, n: (s?.n ?? 0) + 1 }))
    setHoveredId(row.id)
    document.querySelector('[data-testid="atlas-map"]')?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
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
          <Suspense
            fallback={
              <div className="grid place-items-center px-6 py-16 text-center" role="status" aria-label="Loading the map">
                <p className="text-sm font-semibold text-muted">Unfolding the atlas…</p>
              </div>
            }
          >
            <MapView rows={mapRows} loading={mapLoading} selected={mapSelected} />
          </Suspense>
          <div className="flex items-center gap-2 border-t border-hair bg-card px-3 py-2">
            <span className="micro-label">{mapLoading ? 'Plotting…' : `${mapRows.length} plotted`}</span>
            <Link to="/" className="micro-label ml-auto normal-case tracking-normal hover:text-ink">
              ← back to the ledger
            </Link>
          </div>
        </div>

        {/* Docked index under the atlas: a tap flies the map to that pin and
            opens its popup; the dossier stays one tap away on the right. */}
        <div className="mt-6 grid gap-px border border-hair bg-hair">
          {mapRows.map((r) => (
            <div
              key={r.id}
              onMouseEnter={() => setHoveredId(r.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`flex items-center gap-3 bg-paper px-4 py-3 transition-colors duration-150 hover:bg-card ${
                hoveredId === r.id || mapSelected?.id === r.id ? 'bg-card' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => focusOnMap(r)}
                aria-label={`Show ${r.name} on the map`}
                className="flex min-w-0 flex-1 items-baseline gap-3 text-left"
              >
                <span className="font-serif text-base font-semibold text-ink">{r.name}</span>
                <span className="truncate text-xs text-muted">{[r.cuisineType, r.locality].filter(Boolean).join(' · ')}</span>
                <span className="num ml-auto text-sm font-semibold text-ink">{Number(r.avgRating ?? 0).toFixed(1)}</span>
              </button>
              <Link
                to={`/restaurants/${r.id}`}
                aria-label={`Open the dossier for ${r.name}`}
                className="micro-label shrink-0 normal-case tracking-normal hover:text-ink"
              >
                dossier →
              </Link>
            </div>
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
      <div className="mb-5 text-xs leading-relaxed text-muted">
        <p className="max-w-[70ch]">
          <b className="font-semibold text-ink">#rank</b> is a restaurant's standing in the city — by
          rating, ties broken by review count. It travels with each entry; the sort below only changes
          your browse order.
        </p>
        {/* Legend: one unwrapping line so seals + words stay paired */}
        <p className="mt-1.5 flex flex-nowrap items-center gap-x-4 gap-y-1 whitespace-nowrap">
          <span className="shrink-0 font-semibold text-ink">Seals:</span>
          <span className="inline-flex items-center gap-1.5">
            <TierSeal tier="ELITE" animate={false} />
            <b className="font-semibold text-ink">elite</b>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <TierSeal tier="GREAT" animate={false} />
            <b className="font-semibold text-ink">great</b>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <TierSeal tier="SOLID" animate={false} />
            <b className="font-semibold text-ink">solid</b>
          </span>
        </p>
      </div>

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