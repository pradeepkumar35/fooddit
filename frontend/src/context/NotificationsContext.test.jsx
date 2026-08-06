import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationsProvider, useNotifications } from './NotificationsContext'

const { listNotifications, useAuth } = vi.hoisted(() => ({
  listNotifications: vi.fn(),
  useAuth: vi.fn(),
}))

vi.mock('../api/notifications', () => ({
  listNotifications,
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
}))
vi.mock('../hooks/useAuth', () => ({ useAuth }))

const data = {
  notifications: [{ id: 'n1', title: 'A' }],
  unreadCount: 1,
}

const Probe = () => {
  const { items, unread } = useNotifications()
  return (
    <div>
      <span data-testid="unread">{unread}</span>
      <span data-testid="items">{items.length}</span>
    </div>
  )
}

const flush = () => act(async () => {})

describe('NotificationsProvider', () => {
  beforeEach(() => {
    // Fake only setInterval/clearInterval so React's own scheduler (setTimeout /
    // MessageChannel) keeps running real timers and `act` never hangs.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    listNotifications.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads the unread count immediately for a signed-in user and polls on a 30s cadence', async () => {
    listNotifications.mockResolvedValue(data)
    useAuth.mockReturnValue({ isAuthenticated: true })

    render(
      <NotificationsProvider>
        <Probe />
      </NotificationsProvider>,
    )

    await flush()
    expect(screen.getByTestId('unread').textContent).toBe('1')
    expect(screen.getByTestId('items').textContent).toBe('1')

    listNotifications.mockResolvedValue({ ...data, unreadCount: 4 })
    await act(async () => vi.advanceTimersByTime(30000))
    await flush()

    expect(screen.getByTestId('unread').textContent).toBe('4')
    expect(listNotifications).toHaveBeenCalledTimes(2)
  })

  it('stays idle for anonymous users', async () => {
    useAuth.mockReturnValue({ isAuthenticated: false })

    render(
      <NotificationsProvider>
        <Probe />
      </NotificationsProvider>,
    )

    await act(async () => vi.advanceTimersByTime(100000))
    await flush()

    expect(listNotifications).not.toHaveBeenCalled()
    expect(screen.getByTestId('unread').textContent).toBe('0')
  })
})