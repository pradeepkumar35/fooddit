const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={lat}&lon={lon}'

/**
 * Finds a serviceable city (by display name, case-insensitive) that best matches
 * the place name Nominatim reports for a coordinate. Tries the common address
 * fields a reverse lookup returns for Indian cities.
 */
export function matchServiceableCity(placeName, cities) {
  if (!placeName) return null
  const needle = placeName.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!needle) return null
  return (
    cities.find((c) => c.cityName.toLowerCase() === needle) ??
    cities.find((c) => c.citySlug.toLowerCase() === needle) ??
    cities.find((c) => c.cityName.toLowerCase().includes(needle))
  )
}

/**
 * Resolves a browser geolocation ({latitude, longitude}) to a serviceable city
 * via Nominatim reverse geocoding, then matches it against the app's city list.
 * Returns the matching CityDto, or null when the location isn't serviceable.
 */
export async function resolveLocation(latitude, longitude, cities) {
  const url = NOMINATIM_URL.replace('{lat}', latitude).replace('{lon}', longitude)
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) return null
  const data = await response.json()
  const address = data?.address ?? {}
  const place =
    address.city ??
    address.town ??
    address.city_district ??
    address.state_district ??
    address.state ??
    ''
  return matchServiceableCity(place, cities)
}