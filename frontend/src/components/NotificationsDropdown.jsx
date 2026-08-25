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
 * Bell + dropdown showing reply notifications. Polling and the unread badge
 * are owned by NotificationsProvider, so the badge stays fresh even when this
 * dropdown is not mounted. Opening triggers an immediate refresh; clicking a
 * notification opens the restaurant page and marks it read.
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
        className="grid h-10 w-10 place-items-center rounded-full border-[1.5px] border-hair bg-card text-ink transition duration-150 hover:border-ink"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {/* Badge pops (keyed remount) when the polled count changes. */}
        {unread > 0 && (
          <b
            key={unread}
            className="num animate-pop-in absolute -right-1 -top-1 grid h-[19px] min-w-[19px] place-items-center rounded-full border-2 border-paper bg-down px-1 text-[10px] font-bold text-white"
          >
            {unread > 99 ? '99+' : unread}
          </b>
        )}
      </button>

      {open && (
        <div className="panel animate-pop-in absolute right-0 top-full z-20 mt-2 w-80 max-w-[calc(100vw-1rem)] origin-top-right overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-hair bg-paper px-4 py-2.5">
            <span className="micro-label">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="border border-hair px-2 py-1 text-[11px] font-semibold text-muted transition hover:border-ink hover:text-ink"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm font-medium text-muted">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm font-medium text-muted">No notifications yet</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleClick(item)}
                  className={`block w-full border-b border-hair px-4 py-3 text-left transition-colors duration-150 last:border-b-0 hover:bg-paper ${
                    item.read ? 'opacity-70' : ''
                  }`}
                >
                  <span className="flex items-start gap-2.5">
                    {!item.read && (
                      <span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 bg-gold" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-ink">
                        <b>{item.actorName}</b> {TYPE_TEXT[item.type] || 'replied'} at{' '}
                        <span className="font-semibold">{item.restaurantName}</span>
                      </span>
                      {item.replyPreview && (
                        <span className="mt-0.5 block truncate font-serif text-xs italic text-muted">
                          “{item.replyPreview}”
                        </span>
                      )}
                      <span className="num mt-0.5 block text-[11px] text-muted">{timeAgo(item.createdAt)}</span>
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