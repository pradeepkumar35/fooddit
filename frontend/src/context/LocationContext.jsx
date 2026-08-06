import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as addressesApi from '../api/addresses'
import { listCities } from '../api/locations'
import { useAuth } from './AuthContext'

const LocationContext = createContext(null)

const STORAGE_KEY = 'fooddit.location'

function readStored() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    return parsed && typeof parsed.citySlug === 'string' ? parsed : null
  } catch {
    return null
  }
}

/**
 * Provides the serviceable cities (from /api/cities), the user's active city
 * and locality (persisted in localStorage so it survives refresh), and the
 * signed-in user's saved delivery addresses. The feed and navbar location bar
 * both read from here.
 */
export function LocationProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [cities, setCities] = useState([])
  const [citiesLoading, setCitiesLoading] = useState(true)
  const [citiesError, setCitiesError] = useState('')
  const [activeCity, setActiveCity] = useState(null)
  const [activeLocality, setActiveLocality] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [addressesLoading, setAddressesLoading] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setCitiesLoading(true)
    listCities()
      .then((data) => {
        if (cancelled) return
        setCities(data)
        setCitiesError('')
      })
      .catch(() => {
        if (!cancelled) setCitiesError('Could not load locations')
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Resolve the initial active location once the city list is known (or if the
  // stored city is no longer serviceable).
  useEffect(() => {
    if (cities.length === 0 || activeCity) return
    const stored = readStored()
    const initial = stored?.citySlug ? cities.find((c) => c.citySlug === stored.citySlug) : null
    const resolved = initial ?? cities[0]
    if (resolved) {
      setActiveCity(resolved)
      setActiveLocality(stored?.citySlug === resolved.citySlug ? (stored.locality ?? null) : null)
    }
  }, [cities, activeCity])

  const setActiveLocation = useCallback(
    (citySlug, locality) => {
      if (!citySlug) return
      const city = cities.find((c) => c.citySlug === citySlug) ?? { citySlug, cityName: citySlug }
      setActiveCity(city)
      setActiveLocality(locality ?? null)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ citySlug, locality: locality ?? null }))
    },
    [cities],
  )

  const refreshAddresses = useCallback(async () => {
    if (!isAuthenticated) return
    setAddressesLoading(true)
    try {
      setAddresses(await addressesApi.listAddresses())
    } catch {
      setAddresses([])
    } finally {
      setAddressesLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) {
      setAddresses([])
      return
    }
    refreshAddresses()
  }, [isAuthenticated, refreshAddresses])

  const value = useMemo(
    () => ({
      cities,
      citiesLoading,
      citiesError,
      activeCity,
      activeLocality,
      setActiveLocation,
      addresses,
      addressesLoading,
      refreshAddresses,
      switcherOpen,
      setSwitcherOpen,
    }),
    [
      cities,
      citiesLoading,
      citiesError,
      activeCity,
      activeLocality,
      setActiveLocation,
      addresses,
      addressesLoading,
      refreshAddresses,
      switcherOpen,
    ],
  )

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useLocation() {
  const context = useContext(LocationContext)
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}
