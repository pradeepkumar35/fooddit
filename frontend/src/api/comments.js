import { client } from './client'

/**
 * Fetch a review's comment thread. {@code sort} orders siblings within each
 * nesting level: best (time-decayed net score), top (raw score) or new
 * (chronological). The reply tree always stays attached to its parent.
 */
export const getThread = (reviewId, sort = 'best') =>
  client.get(`/reviews/${reviewId}/comments`, { params: { sort } }).then((res) => res.data)
export const createComment = (reviewId, data) =>
  client.post(`/reviews/${reviewId}/comments`, data).then((res) => res.data)
export const updateComment = (reviewId, commentId, data) =>
  client.patch(`/reviews/${reviewId}/comments/${commentId}`, data).then((res) => res.data)
