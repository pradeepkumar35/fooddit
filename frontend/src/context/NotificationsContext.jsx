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
 * Polling lives here (not in the dropdown) so the unread badge stays fresh for
 * a signed-in user, and it is deliberately gentle: a slow cadence that pauses
 * entirely while the tab is hidden and refetches the moment it becomes visible
 * again. Every poll is a real database read, and this app runs on a serverless
 * Postgres whose free tier meters *compute time* — each query wakes the compute
 * for its idle window, so a background tab polling every 30s kept the database
 * awake around the clock and drained the monthly compute allowance (the account
 * was suspended on it). The bell dropdown also loads on open, so opening it is
 * always instant. Polling is disabled entirely for anonymous users.
 */
const POLL_INTERVAL_MS = 10 * 60 * 1000

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

  // Load immediately when auth state changes, then poll slowly while signed in.
  // Hidden tabs stay silent (their polls only cost metered compute time for
  // nobody's benefit); returning to the tab refreshes immediately.
  useEffect(() => {
    load()
    if (!isAuthenticated) return undefined

    const poll = () => {
      if (document.hidden) return
      load()
    }
    const id = setInterval(poll, POLL_INTERVAL_MS)
    const onVisibilityChange = () => {
      if (!document.hidden) load()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
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