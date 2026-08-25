import { client } from './client'

export const listRestaurants = (params = {}) => client.get('/restaurants', { params }).then((res) => res.data)
/**
 * The City Ledger: server-paginated enriched rows (rank/tier, discussion
 * aggregates, monthly vote delta). Returns { content, page, size,
 * totalElements, totalPages } — slicing happens on the backend.
 */
export const fetchLedger = (params = {}) => client.get('/restaurants/ledger', { params }).then((res) => res.data)
/** Fact-sheet payload for the Dossier: rank seal, star distribution, provenance. */
export const getRestaurantStats = (id) => client.get(`/restaurants/${id}/stats`).then((res) => res.data)
export const listCuisines = () => client.get('/restaurants/cuisines').then((res) => res.data)
export const suggestRestaurants = (city, q, signal) =>
  client.get('/restaurants/suggestions', { params: { city, q }, signal }).then((res) => res.data)
export const getRestaurant = (id) => client.get(`/restaurants/${id}`).then((res) => res.data)
/**
 * The Dossier review stream. {@code sort}: best (net score, newest tiebreak —
 * default), top (star rating desc) or new (chronological).
 */
export const listReviews = (restaurantId, sort = 'new') =>
  client.get(`/restaurants/${restaurantId}/reviews`, { params: { sort } }).then((res) => res.data)
export const createReview = (restaurantId, data) =>
  client.post(`/restaurants/${restaurantId}/reviews`, data).then((res) => res.data)
export const updateReview = (reviewId, data) => client.patch(`/reviews/${reviewId}`, data).then((res) => res.data)

export const saveRestaurant = (id) => client.post(`/restaurants/${id}/save`).then((res) => res.data)
export const unsaveRestaurant = (id) => client.delete(`/restaurants/${id}/save`).then((res) => res.data)
export const listSavedRestaurants = () => client.get('/restaurants/saved').then((res) => res.data)
