import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications'
import { useAuth } from '../hooks/useAuth'

/**
 * Shared notification state + background polling.
 *
 * Polling lives here (not in the dropdown) so the unread badge stays fresh as
 * long as an authenticated user is on the site — regardless of whether the bell
 * dropdown has ever been mounted or opened. The dropdown just consumes this
 * state and lets the provider own the reads. Polling is disabled entirely for
 * anonymous users.
 */
const NotificationsContext = createContext(null)

export function NotificationsProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([])
      setUnread(0)
      return
    }
    setLoading(true)
    try {
      const data = await listNotifications()
      setItems(data.notifications || [])
      setUnread(data.unreadCount || 0)
    } catch {
      /* keep the badge as-is on failure */
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  // Load immediately when auth state changes, then poll on a 30s cadence while
  // signed in so the badge reflects new replies without a page refresh.
  useEffect(() => {
    load()
    if (!isAuthenticated) return undefined
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [load, isAuthenticated])

  const markRead = useCallback((id) => {
    setUnread((n) => Math.max(0, n - 1))
    setItems((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)))
    markNotificationRead(id).catch(() => {})
  }, [])

  const markAllRead = useCallback(async () => {
    setItems((current) => current.map((item) => ({ ...item, read: true })))
    setUnread(0)
    try {
      await markAllNotificationsRead()
    } catch {
      /* revert handled by the next poll */
    }
  }, [])

  const value = useMemo(
    () => ({ items, unread, loading, load, markRead, markAllRead }),
    [items, unread, loading, load, markRead, markAllRead],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export const useNotifications = () => useContext(NotificationsContext)