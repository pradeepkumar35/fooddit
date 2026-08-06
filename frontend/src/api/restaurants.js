import { client } from './client'

export const listRestaurants = (params = {}) => client.get('/restaurants', { params }).then((res) => res.data)
export const listCuisines = () => client.get('/restaurants/cuisines').then((res) => res.data)
export const getRestaurant = (id) => client.get(`/restaurants/${id}`).then((res) => res.data)
export const listReviews = (restaurantId) => client.get(`/restaurants/${restaurantId}/reviews`).then((res) => res.data)
export const createReview = (restaurantId, data) =>
  client.post(`/restaurants/${restaurantId}/reviews`, data).then((res) => res.data)
export const updateReview = (reviewId, data) => client.patch(`/reviews/${reviewId}`, data).then((res) => res.data)

export const saveRestaurant = (id) => client.post(`/restaurants/${id}/save`).then((res) => res.data)
export const unsaveRestaurant = (id) => client.delete(`/restaurants/${id}/save`).then((res) => res.data)
export const listSavedRestaurants = () => client.get('/restaurants/saved').then((res) => res.data)
