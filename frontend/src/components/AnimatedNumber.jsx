import { useEffect, useRef, useState } from 'react'

/**
 * Counts up to `value` with an ease-out curve (Dribbble-style animated numbers).
 * Re-runs whenever `value` changes, animating from the current display value to
 * the new target. Falls back to an instant snap for reduced-motion. There is no
 * one-shot guard here: an effect that gets cleaned up early (e.g. React
 * StrictMode's double-invoke in dev) simply restarts and still lands on the
 * target instead of freezing near zero.
 */
export default function AnimatedNumber({ value, decimals = 0, duration = 650 }) {
  const [display, setDisplay] = useState(() => Number(value) || 0)
  const fromRef = useRef(Number(value) || 0)
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

  useEffect(() => {
    const target = Number(value) || 0
    if (reduce || typeof requestAnimationFrame === 'undefined') {
      setDisplay(target)
      fromRef.current = target
      return
    }
    const from = fromRef.current
    const start = performance.now()
    let raf
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const current = from + (target - from) * eased
      setDisplay(current)
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration, reduce])

  return <>{display.toFixed(decimals)}</>
}