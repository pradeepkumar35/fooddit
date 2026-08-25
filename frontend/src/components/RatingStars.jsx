/**
 * Renders a 5-star rating as a gold overlay clipped to the rating value.
 * Zero/null ratings show empty ink-300 stars. Gold = the ledger's ratings ink.
 */
export default function RatingStars({ value, className = '' }) {
  const pct = value > 0 ? Math.min((value / 5) * 100, 100) : 0
  return (
    <span className={`relative inline-block leading-none ${className}`} aria-label={`${value ?? 0} out of 5`}>
      <span style={{ color: 'var(--color-hair)' }}>★★★★★</span>
      <span
        className="absolute inset-0 overflow-hidden whitespace-nowrap"
        style={{ color: 'var(--color-gold)', width: `${pct}%` }}
      >
        ★★★★★
      </span>
    </span>
  )
}
