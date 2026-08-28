import { useEffect } from 'react'
import { API_URL } from '../api/client'
import { publish } from '../lib/live'

/**
 * Opens a Server-Sent Events connection to the backend's per-restaurant stream
 * and fans out every event type the UI listens to — comment created/updated,
 * review created/updated, vote tallies — to local subscribers. The browser
 * reconnects automatically when the connection drops (EventSource handles
 * that natively), and the connection is closed when the component unmounts or
 * the restaurant id changes.
 */
const EVENTS = ['comment.created', 'comment.updated', 'review.created', 'review.updated', 'vote.updated']

export default function useLiveStream(restaurantId) {
  useEffect(() => {
    if (!restaurantId) return undefined

    const source = new EventSource(`${API_URL}/stream/restaurants/${restaurantId}`)

    for (const name of EVENTS) {
      source.addEventListener(name, (event) => {
        try {
          publish(name, JSON.parse(event.data))
        } catch {
          /* ignore malformed frames */
        }
      })
    }

    return () => source.close()
  }, [restaurantId])
}
