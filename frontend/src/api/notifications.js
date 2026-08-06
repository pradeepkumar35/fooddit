import { client } from './client'

export const listNotifications = () => client.get('/me/notifications').then((res) => res.data)
export const markNotificationRead = (id) => client.patch(`/notifications/${id}/read`).then((res) => res.data)
export const markAllNotificationsRead = () => client.post('/notifications/read-all').then((res) => res.data)
export const clearNotifications = () => client.delete('/me/notifications').then((res) => res.data)
