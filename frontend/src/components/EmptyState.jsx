/**
 * Consistent empty-state block used across the feed, detail page, profile and
 * comment threads. The icon sits in a soft basil disc; callers pass the SVG
 * paths/children (1.75 stroke) that define their situation. Use `compact` for
 * tight spaces like comment threads.
 */
export default function EmptyState({ title, description, icon, action, compact = false }) {
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-lg border border-line bg-surface text-center ${
        compact ? 'px-4 py-4' : 'px-6 py-10'
      }`}
    >
      <div
        className={`flex items-center justify-center rounded-full bg-basil-100 ${
          compact ? 'h-12 w-12' : 'h-16 w-16'
        }`}
      >
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
        <h3 className={`font-display font-semibold text-ink ${compact ? 'text-base' : 'text-lg'}`}>
          {title}
        </h3>
        <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      </div>
      {action}
    </div>
  )
}
