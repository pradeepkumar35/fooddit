import { useEffect, useState } from 'react'

// Matches Tailwind's md breakpoint (48rem). Used to switch threading behavior:
// desktop gets a deeper indentation cap and no auto-collapse of long threads.
const MD_QUERY = '(min-width: 48rem)'

function matches() {
  return typeof window !== 'undefined' && window.matchMedia?.(MD_QUERY)?.matches === true
}

/**
 * Reactive "md and above" check. Modeled on useDarkMode's matchMedia usage;
 * returns false (mobile) when matchMedia is unavailable (e.g. jsdom) instead of
 * throwing.
 */
export default function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(matches)

  useEffect(() => {
    const media = window.matchMedia?.(MD_QUERY)
    if (!media) return undefined
    const update = () => setIsDesktop(media.matches)
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])

  return isDesktop
}
