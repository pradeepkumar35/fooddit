import { useEffect } from 'react'
import { API_URL } from '../api/client'
import { publish } from '../lib/live'

/**
 * Opens a Server-Sent Events connection to the backend's per-restaurant stream
 * and fans out parsed {@code comment.created} / {@code vote.updated} events to
 * every local subscriber. The browser reconnects automatically when the
 * connection drops (EventSource handles that natively), and the connection is
 * closed when the component unmounts or the restaurant id changes.
 */
export default function useLiveStream(restaurantId) {
  useEffect(() => {
    if (!restaurantId) return undefined

    const source = new EventSource(`${API_URL}/stream/restaurants/${restaurantId}`)

    source.addEventListener('comment.created', (event) => {
      try {
        publish('comment.created', JSON.parse(event.data))
      } catch {
        /* ignore malformed frames */
      }
    })
    source.addEventListener('vote.updated', (event) => {
      try {
        publish('vote.updated', JSON.parse(event.data))
      } catch {
        /* ignore malformed frames */
      }
    })

    return () => source.close()
  }, [restaurantId])
}
