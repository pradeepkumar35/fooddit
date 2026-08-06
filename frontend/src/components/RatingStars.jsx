/**
 * Renders a 5-star rating as a basil overlay clipped to the rating value.
 * A zero/null rating shows empty ink-300 stars.
 */
export default function RatingStars({ value, className = '' }) {
  const pct = value > 0 ? Math.min((value / 5) * 100, 100) : 0
  return (
    <span className={`relative inline-block leading-none ${className}`} aria-label={`${value ?? 0} out of 5`}>
      <span className="text-ink-300">★★★★★</span>
      <span
        className="absolute inset-0 overflow-hidden whitespace-nowrap text-basil-500"
        style={{ width: `${pct}%` }}
      >
        ★★★★★
      </span>
    </span>
  )
}
