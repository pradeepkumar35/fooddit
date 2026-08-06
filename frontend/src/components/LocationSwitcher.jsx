import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as addressesApi from '../api/addresses'
import { listLocalities } from '../api/locations'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../hooks/useAuth'
import { useLocation } from '../hooks/useLocation'
import { apiErrorMessage } from '../utils/apiError'
import { resolveLocation } from '../utils/geo'

/**
 * Modal location switcher (Swiggy/Zomato-style): use your current location via
 * geolocation + Nominatim reverse geocoding, pick a serviceable city and
 * locality, or jump straight to a saved delivery address. Selecting a location
 * navigates to the feed with ?city=…&locality=… preserving the other filters.
 */
export default function LocationSwitcher() {
  const { isAuthenticated } = useAuth()
  const {
    cities,
    activeCity,
    activeLocality,
    setActiveLocation,
    addresses,
    refreshAddresses,
    switcherOpen,
    setSwitcherOpen,
  } = useLocation()
  const notify = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [query, setQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState(null)
  const [localities, setLocalities] = useState([])
  const [localitiesLoading, setLocalitiesLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [notServiceable, setNotServiceable] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ label: '', addressLine: '', locality: '', citySlug: '', isDefault: false })

  useEffect(() => {
    if (switcherOpen) {
      setSelectedCity(activeCity)
      setForm((current) => ({ ...current, citySlug: activeCity?.citySlug ?? '' }))
    }
  }, [switcherOpen, activeCity])

  useEffect(() => {
    if (!selectedCity) return
    let cancelled = false
    setLocalitiesLoading(true)
    listLocalities(selectedCity.citySlug)
      .then((data) => {
        if (!cancelled) setLocalities(data)
      })
      .catch(() => {
        if (!cancelled) setLocalities([])
      })
      .finally(() => {
        if (!cancelled) setLocalitiesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedCity])

  const filteredCities = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return cities
    return cities.filter(
      (c) => c.cityName.toLowerCase().includes(needle) || c.citySlug.toLowerCase().includes(needle),
    )
  }, [cities, query])

  const applyLocation = useCallback(
    (citySlug, locality) => {
      setActiveLocation(citySlug, locality)
      setSwitcherOpen(false)
      const next = new URLSearchParams(searchParams)
      next.set('city', citySlug)
      locality ? next.set('locality', locality) : next.delete('locality')
      navigate(`/?${next.toString()}`)
    },
    [searchParams, navigate, setActiveLocation, setSwitcherOpen],
  )

  const useMyLocation = useCallback(() => {
    setLocating(true)
    setNotServiceable(false)
    if (!('geolocation' in navigator)) {
      setLocating(false)
      setNotServiceable(true)
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const city = await resolveLocation(position.coords.latitude, position.coords.longitude, cities)
        setLocating(false)
        if (city) {
          setSelectedCity(city)
          setNotServiceable(false)
        } else {
          setNotServiceable(true)
        }
      },
      () => {
        setLocating(false)
        setNotServiceable(true)
      },
      { timeout: 8000 },
    )
  }, [cities])

  const handleAddAddress = async (event) => {
    event.preventDefault()
    if (!form.addressLine.trim() || !form.citySlug) return
    setSaving(true)
    const city = cities.find((c) => c.citySlug === form.citySlug)
    try {
      await addressesApi.createAddress({
        label: form.label.trim() || undefined,
        addressLine: form.addressLine.trim(),
        locality: form.locality.trim() || undefined,
        cityName: city?.cityName ?? form.citySlug,
        citySlug: form.citySlug,
        isDefault: form.isDefault || undefined,
      })
      await refreshAddresses()
      setShowForm(false)
      setForm({ label: '', addressLine: '', locality: '', citySlug: activeCity?.citySlug ?? '', isDefault: false })
      notify('Address saved')
    } catch (err) {
      notify(apiErrorMessage(err, 'Could not save the address'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSetDefault = async (id) => {
    try {
      await addressesApi.setDefaultAddress(id)
      await refreshAddresses()
    } catch (err) {
      notify(apiErrorMessage(err, 'Could not update the address'), 'error')
    }
  }

  const handleDelete = async (id) => {
    try {
      await addressesApi.deleteAddress(id)
      await refreshAddresses()
      notify('Address removed')
    } catch (err) {
      notify(apiErrorMessage(err, 'Could not remove the address'), 'error')
    }
  }

  if (!switcherOpen) return null

  const inputClass =
    'rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none'

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 px-4 pt-16"
      onClick={() => setSwitcherOpen(false)}
    >
      <div
        role="dialog"
        aria-label="Choose your location"
        className="animate-fade-slide-in w-full max-w-lg overflow-hidden rounded-xl border border-line bg-surface shadow-card-hover"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-display text-base font-semibold text-ink">Choose your location</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setSwitcherOpen(false)}
            className="rounded-lg p-1.5 text-muted transition-colors duration-150 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="flex w-full items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm font-medium text-ink transition-colors duration-150 hover:border-accent hover:text-accent"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2" />
            </svg>
            {locating ? 'Locating…' : 'Use my current location'}
          </button>

          {notServiceable && (
            <p className="rounded-lg border border-chili-500/40 bg-surface px-3 py-2 text-xs text-chili-600">
              We don't deliver to this location yet. Pick a city below instead.
            </p>
          )}

          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for a city…"
            aria-label="Search cities"
            className={`${inputClass} w-full`}
          />

          {selectedCity && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                {selectedCity.cityName} — choose a locality
              </p>
              {localitiesLoading ? (
                <p className="text-sm text-muted">Loading localities…</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyLocation(selectedCity.citySlug, null)}
                    className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink transition-colors duration-150 hover:border-accent hover:text-accent"
                  >
                    Entire {selectedCity.cityName}
                  </button>
                  {localities.slice(0, 40).map((locality) => (
                    <button
                      key={locality}
                      type="button"
                      onClick={() => applyLocation(selectedCity.citySlug, locality)}
                      className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink transition-colors duration-150 hover:border-accent hover:text-accent"
                    >
                      {locality}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">All cities</p>
            {filteredCities.length === 0 ? (
              <p className="text-sm text-muted">No cities match “{query}”.</p>
            ) : (
              <ul className="max-h-48 divide-y divide-line overflow-y-auto rounded-lg border border-line">
                {filteredCities.map((city) => (
                  <li key={city.citySlug}>
                    <button
                      type="button"
                      onClick={() => setSelectedCity(city)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-canvas ${
                        city.citySlug === (selectedCity?.citySlug ?? activeCity?.citySlug)
                          ? 'font-semibold text-accent'
                          : 'text-ink'
                      }`}
                    >
                      {city.cityName}
                      {city.citySlug === activeCity?.citySlug && activeLocality && (
                        <span className="text-xs font-normal text-muted">{activeLocality}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {isAuthenticated && (
            <div className="border-t border-line pt-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Saved addresses</p>
                <button
                  type="button"
                  onClick={() => setShowForm((was) => !was)}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  {showForm ? 'Cancel' : '+ Add address'}
                </button>
              </div>

              {showForm && (
                <form onSubmit={handleAddAddress} className="mb-3 space-y-2 rounded-lg border border-line p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      value={form.label}
                      onChange={(event) => setForm((f) => ({ ...f, label: event.target.value }))}
                      placeholder="Label (Home, Office…)"
                      aria-label="Address label"
                      className={inputClass}
                    />
                    <select
                      value={form.citySlug}
                      onChange={(event) => setForm((f) => ({ ...f, citySlug: event.target.value }))}
                      aria-label="Address city"
                      className={inputClass}
                    >
                      <option value="">City…</option>
                      {cities.map((city) => (
                        <option key={city.citySlug} value={city.citySlug}>
                          {city.cityName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    value={form.addressLine}
                    onChange={(event) => setForm((f) => ({ ...f, addressLine: event.target.value }))}
                    placeholder="Address (street, building…)"
                    aria-label="Address line"
                    required
                    className={`${inputClass} w-full`}
                  />
                  <input
                    value={form.locality}
                    onChange={(event) => setForm((f) => ({ ...f, locality: event.target.value }))}
                    placeholder="Locality / area (optional)"
                    aria-label="Address locality"
                    className={`${inputClass} w-full`}
                  />
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={form.isDefault}
                      onChange={(event) => setForm((f) => ({ ...f, isDefault: event.target.checked }))}
                      className="accent-accent"
                    />
                    Make this my default address
                  </label>
                  <button
                    type="submit"
                    disabled={saving || !form.addressLine.trim() || !form.citySlug}
                    className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-surface transition duration-150 ease-out hover:bg-accent/90 active:scale-95 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save address'}
                  </button>
                </form>
              )}

              {addresses.length === 0 ? (
                <p className="text-sm text-muted">No saved addresses yet.</p>
              ) : (
                <ul className="space-y-2">
                  {addresses.map((address) => (
                    <li
                      key={address.id}
                      className="flex items-center gap-3 rounded-lg border border-line px-3 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => applyLocation(address.citySlug, address.locality)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate text-sm text-ink">
                          {address.label || address.addressLine}
                          {address.isDefault && (
                            <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-accent">
                              Default
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {address.addressLine} · {address.cityName}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetDefault(address.id)}
                        aria-label={`Set ${address.label || 'address'} as default`}
                        className="shrink-0 rounded-lg p-1.5 text-muted transition-colors duration-150 hover:text-accent"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                          <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.8-5.4 2.8 1-6L3.2 9.4l6.1-.9L12 3z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(address.id)}
                        aria-label={`Delete ${address.label || 'address'}`}
                        className="shrink-0 rounded-lg p-1.5 text-muted transition-colors duration-150 hover:text-down"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75">
                          <path d="M3 6h18M8 6V4h8v2m1 0v14H7V6m4 4v6m4-6v6" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
