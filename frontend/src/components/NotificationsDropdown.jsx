import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationsContext'

function timeAgo(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

const TYPE_TEXT = {
  REVIEW_REPLY: 'commented on your review',
  COMMENT_REPLY: 'replied to your comment',
  THREAD_REPLY: 'joined the discussion',
}

/**
 * Bell + dropdown showing reply notifications. Polling and the unread badge are
 * owned by {@link NotificationsProvider} (hoisted to app level), so the badge
 * stays fresh even when this dropdown is not mounted. Opening the dropdown
 * additionally triggers an immediate refresh; clicking a notification opens the
 * restaurant page and marks it read.
 */
export default function NotificationsDropdown() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { items, unread, loading, load, markRead, markAllRead } = useNotifications()
  const ref = useRef(null)

  useEffect(() => {
    const onClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleOpen = () => {
    setOpen((was) => {
      if (!was) load()
      return !was
    })
  }

  const handleClick = (notification) => {
    setOpen(false)
    if (!notification.read) markRead(notification.id)
    navigate(`/restaurants/${notification.restaurantId}`)
  }

  const handleMarkAllRead = () => markAllRead()

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        aria-expanded={open}
        className="relative border-2 border-ink bg-surface p-1.5 text-ink shadow-card transition duration-150 hover:bg-accent-soft active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center border-2 border-ink bg-chili-500 px-1 text-[10px] font-bold text-surface">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-fade-slide-in absolute right-0 top-full z-10 mt-2 w-80 max-w-[calc(100vw-1rem)] origin-top-right overflow-hidden border-2 border-ink bg-surface shadow-card-hover">
          <div className="flex items-center justify-between border-b-2 border-ink bg-accent px-4 py-2.5">
            <span className="text-sm font-bold uppercase tracking-wide text-surface">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="border-2 border-ink bg-surface px-2 py-1 text-xs font-bold uppercase tracking-wide text-ink shadow-card transition duration-150 hover:bg-canvas active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm font-semibold text-muted">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm font-semibold text-muted">No notifications yet</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleClick(item)}
                  className={`block w-full border-b border-ink/10 px-4 py-3 text-left transition-colors duration-150 hover:bg-canvas ${
                    item.read ? 'opacity-70' : ''
                  }`}
                >
                  <span className="flex items-start gap-2">
                    {!item.read && <span className="mt-1.5 h-3 w-3 shrink-0 border-2 border-ink bg-basil-500" />}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-ink">
                        {item.actorName} {TYPE_TEXT[item.type] || 'replied'} at {item.restaurantName}
                      </span>
                      {item.replyPreview && (
                        <span className="mt-0.5 block truncate font-serif text-xs italic text-muted">
                          “{item.replyPreview}”
                        </span>
                      )}
                      <span className="mt-0.5 block text-xs font-semibold text-muted">{timeAgo(item.createdAt)}</span>
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
