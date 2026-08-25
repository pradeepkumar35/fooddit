const LABELS = { 5: 'exceptional', 4: 'great', 3: 'good', 2: 'poor', 1: 'awful' }

/**
 * Five-dot star verdict with the serif italic word. Filled = emerald ink.
 */
export default function VerdictDots({ value = 0 }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0))
  return (
    <span className="verdict flex items-center gap-2">
      <span className="inline-flex gap-1" aria-label={`${v} out of 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <i
            key={i}
            aria-hidden="true"
            className="inline-block h-[9px] w-[9px] rounded-full"
            style={{ border: '1.5px solid var(--color-emerald)', background: i <= v ? 'var(--color-emerald)' : 'transparent' }}
          />
        ))}
      </span>
      {v > 0 && <em className="font-serif text-[13px] italic text-muted">{LABELS[v]}</em>}
    </span>
  )
}
