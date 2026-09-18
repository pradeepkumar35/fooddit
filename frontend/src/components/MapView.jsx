import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const LIGHT_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

/* Rating band -> ledger palette: emerald (elite), gold (great), slate (rest). */
function colorFor(rating) {
  if (rating >= 4.5) return '#1E6E5C'
  if (rating >= 4.0) return '#B98A1F'
  return '#5F6B76'
}

function validPoints(rows) {
  // NB: Number(null) === 0, so null/blank coordinates need an explicit guard —
  // otherwise those rows would pile up at Null Island (0, 0).
  const toNum = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v))
  return (rows ?? [])
    .map((r) => ({ row: r, lat: toNum(r.latitude), lng: toNum(r.longitude) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
}

/** Fits the viewport to each new result set, and flies to + opens the popup of
 *  whichever restaurant the index below selects ({ id, n }; n retriggers). */
function MapController({ points, signature, selected, markerRefs }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    let minLat = points[0].lat
    let maxLat = points[0].lat
    let minLng = points[0].lng
    let maxLng = points[0].lng
    for (const p of points) {
      if (p.lat < minLat) minLat = p.lat
      if (p.lat > maxLat) maxLat = p.lat
      if (p.lng < minLng) minLng = p.lng
      if (p.lng > maxLng) maxLng = p.lng
    }
    map.fitBounds(
      [
        [minLat, minLng],
        [maxLat, maxLng],
      ],
      { padding: [28, 28], maxZoom: 15 },
    )
  }, [map, signature]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selected) return
    const target = points.find((p) => String(p.row.id) === String(selected.id))
    if (!target) return
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom?.() ?? 12, 15), { duration: 0.8 })
    markerRefs.current[selected.id]?.openPopup?.()
  }, [map, selected, points, markerRefs])
  return null
}

function LocateButton() {
  const map = useMap()
  const [state, setState] = useState('idle')
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null
  const locate = () => {
    setState('busy')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState('idle')
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 14, { duration: 1.2 })
      },
      () => setState('idle'),
      { timeout: 8000 },
    )
  }
  return (
    <button
      type="button"
      onClick={locate}
      disabled={state === 'busy'}
      className="btn-hard absolute right-3 top-3 z-[500] bg-card px-3 py-2 text-xs font-bold"
      aria-label="Center the map on my location"
    >
      {state === 'busy' ? 'Locating…' : '◎ Locate me'}
    </button>
  )
}

/**
 * The Atlas: a real interactive Leaflet map of the current result set.
 * Canvas-rendered rating-colored circles (cheap at ~2k pins), popups with the
 * dossier link, auto-fit on every new slice, light/dark tiles that follow the
 * app's Settings theme toggle. `selected` ({ id, n }) flies to one restaurant
 * and opens its popup — driven by the index below the map.
 */
export default function MapView({ rows, loading, selected = null }) {
  const [dark, setDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  )
  const markerRefs = useRef({})

  useEffect(() => {
    const el = document.documentElement
    const observer = new MutationObserver(() =>
      setDark(el.classList.contains('dark')),
    )
    observer.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const points = useMemo(() => validPoints(rows), [rows])
  const signature = useMemo(
    () => points.map((p) => `${p.row.id}:${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|'),
    [points],
  )
  const center = points.length > 0 ? [points[0].lat, points[0].lng] : [22.97, 78.65]
  const selectedId = selected?.id != null ? String(selected.id) : null

  return (
    <div className="relative" style={{ aspectRatio: '16/9', minHeight: 320 }} data-testid="atlas-map">
      <MapContainer
        center={center}
        zoom={12}
        preferCanvas
        style={{ height: '100%', width: '100%' }}
        aria-label="Interactive map of restaurants"
      >
        <TileLayer url={dark ? DARK_TILES : LIGHT_TILES} attribution={ATTRIBUTION} maxZoom={19} />
        <MapController points={points} signature={signature} selected={selected} markerRefs={markerRefs} />
        <LocateButton />
        {points.map(({ row, lat, lng }) => {
          const rating = Number(row.avgRating ?? 0)
          const reviews = Number(row.reviewCount ?? 0)
          const img = row.imageUrl || row.fallbackUrl
          const isSelected = selectedId !== null && String(row.id) === selectedId
          return (
            <CircleMarker
              key={row.id}
              ref={(m) => {
                if (m) markerRefs.current[row.id] = m
                else delete markerRefs.current[row.id]
              }}
              center={[lat, lng]}
              radius={(reviews >= 20 ? 9 : reviews >= 5 ? 7 : 5) + (isSelected ? 3 : 0)}
              pathOptions={{
                color: isSelected ? '#8E2F3C' : '#1C2430',
                weight: isSelected ? 3 : 1.5,
                fillColor: colorFor(rating),
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <div style={{ width: 200 }}>
                  {img && (
                    <img
                      src={img}
                      alt=""
                      loading="lazy"
                      style={{ width: '100%', height: 96, objectFit: 'cover', borderRadius: 4 }}
                    />
                  )}
                  <div style={{ marginTop: 6, fontWeight: 700, fontSize: 14 }}>{row.name}</div>
                  <div style={{ fontSize: 12, color: '#555' }}>
                    {[row.cuisineType, row.locality].filter(Boolean).join(' · ')}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    ★ {rating.toFixed(1)} · {reviews} review{reviews === 1 ? '' : 's'}
                  </div>
                  <Link to={`/restaurants/${row.id}`} style={{ fontSize: 12, fontWeight: 700 }}>
                    Open the dossier →
                  </Link>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
      {points.length === 0 && !loading && (
        <div className="pointer-events-none absolute inset-0 z-[500] grid place-items-center px-6 text-center">
          <p className="border-[1.5px] border-hair bg-card px-4 py-3 text-sm font-semibold text-muted">
            No restaurants to plot here yet.
          </p>
        </div>
      )}
    </div>
  )
}
