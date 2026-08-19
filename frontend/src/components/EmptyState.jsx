/**
 * Consistent empty-state block used across the feed, detail page, profile and
 * comment threads. A zine sticker: gold starburst disc behind the icon, hard
 * border, offset shadow. Callers pass the SVG paths/children (1.75 stroke).
 */
export default function EmptyState({ title, description, icon, action, compact = false }) {
  return (
    <div
      className={`relative flex flex-col items-center gap-3 border-2 border-ink bg-surface text-center shadow-card ${
        compact ? 'px-4 py-5' : 'px-6 py-12'
      }`}
    >
      <span className="tape" aria-hidden="true" />
      <div
        className={`relative grid place-items-center rounded-full bg-basil-100 ${
          compact ? 'h-12 w-12' : 'h-16 w-16'
        }`}
      >
        <span className="absolute -inset-1 -z-10 rotate-6 rounded-full bg-basil-500/30 blur-sm" aria-hidden="true" />
        <svg
          viewBox="0 0 24 24"
          className={`text-basil-500 ${compact ? 'h-5 w-5' : 'h-7 w-7'}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {icon}
        </svg>
      </div>
      <div>
        <h3 className={`font-display font-semibold uppercase tracking-wide text-ink ${compact ? 'text-base' : 'text-lg'}`}>
          {title}
        </h3>
        <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      </div>
      {action}
    </div>
  )
}