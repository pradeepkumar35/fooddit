import { client } from './client'

export const getProfile = (userId) => client.get(`/users/${userId}/profile`).then((res) => res.data)
