import { client } from './client'

export const getMe = () => client.get('/me').then((res) => res.data)
export const updateMe = (data) => client.patch('/me', data).then((res) => res.data)
export const updatePreferences = (data) => client.patch('/me/preferences', data).then((res) => res.data)
