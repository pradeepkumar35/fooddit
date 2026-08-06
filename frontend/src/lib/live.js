/**
 * Tiny in-process pub/sub bridging the SSE connection to the components that
 * care about live events. Components subscribe by event name (and usually
 * filter on ids in the payload); the EventSource hook publishes parsed events.
 */
const handlers = new Map()

export function subscribe(event, handler) {
  const set = handlers.get(event) ?? new Set()
  set.add(handler)
  handlers.set(event, set)
  return () => {
    set.delete(handler)
    if (set.size === 0) handlers.delete(event)
  }
}

export function publish(event, data) {
  const set = handlers.get(event)
  if (!set) return
  for (const handler of [...set]) {
    try {
      handler(data)
    } catch {
      /* a subscriber must never break the fan-out for others */
    }
  }
}
