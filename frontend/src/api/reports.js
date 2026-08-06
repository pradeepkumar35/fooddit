import { client } from './client'

/**
 * Flag a review or comment. Reasons are one of SPAM, FAKE_REVIEW, HARASSMENT,
 * OFF_TOPIC. Returns 409 if the acting user has already reported the target.
 */
export const createReport = (data) => client.post('/reports', data).then((res) => res.data)
