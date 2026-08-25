import { client } from './client'

export const getProfile = (userId) => client.get(`/users/${userId}/profile`).then((res) => res.data)

/** Batched REP badges: lifetime net upvotes per author id → { id: number }. */
export const fetchReputations = (ids) =>
  client
    .get('/users/reputations', { params: { ids: ids.join(',') } })
    .then((res) => res.data)
