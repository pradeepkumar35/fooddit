import { useLayoutEffect, useRef, useState } from 'react'

const SIZES = {
  sm: { pill: 'px-2 py-1 text-xs', container: 'p-1' },
  md: { pill: 'px-3 py-2 text-sm', container: 'p-1' },
}

/**
 * Segmented control used for feed sort, comment sort and profile tabs. The
 * active state is a solid pill that slides to the selected option instead of
 * just re-coloring text; the inactive options re-color via a quick color
 * transition. The active pill is measured against the container so it always
 * lines up exactly with its button.
 */
export default function PillTabs({ options, value, onChange, size = 'md', label }) {
  const containerRef = useRef(null)
  const [indicator, setIndicator] = useState(null)

  const measure = () => {
    const container = containerRef.current
    const active = container?.querySelector(`[data-value="${CSS.escape(value)}"]`)
    if (container && active) {
      setIndicator({ left: active.offsetLeft, width: active.offsetWidth })
    }
  }

  useLayoutEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [value])

  const { pill, container } = SIZES[size]

  return (
    <div
      ref={containerRef}
      role={label ? 'tablist' : undefined}
      aria-label={label}
      className={`relative flex items-center gap-1 rounded-md border border-line bg-surface ${container}`}
    >
      {indicator && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 top-1 rounded-md bg-accent transition-[left,width] duration-200 ease-out"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          data-value={option.value}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`relative z-10 rounded-md font-medium transition-colors duration-150 ease-out ${pill} ${
            value === option.value ? 'text-surface' : 'text-muted hover:text-ink'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
