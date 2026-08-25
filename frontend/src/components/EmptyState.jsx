import { Link } from 'react-router-dom'

/**
 * Empty / not-serviceable state: hairline panel, mono kicker, serif title.
 * `compact` drops the seal ring for inline placements (thread blocks).
 */
export default function EmptyState({ title, description, icon, action, compact = false }) {
  return (
    <div
      className={`panel-hair relative flex flex-col items-center gap-3 px-6 text-center ${
        compact ? 'py-8' : 'py-14'
      }`}
    >
      {!compact && (
        <>
          <span className="grid h-14 w-14 place-items-center rounded-full border-[1.5px] border-gold text-2xl text-gold">
            {icon && (
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                {icon}
              </svg>
            )}
          </span>
          <span className="micro-label">The Ledger</span>
        </>
      )}
      <h3 className="font-serif text-xl font-semibold text-ink">{title}</h3>
      {description && <p className="max-w-sm text-sm font-medium text-muted">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
      {!compact && (
        <Link to="/" className="micro-label mt-2 transition-colors duration-150 hover:text-ink">
          ← back to the ledger
        </Link>
      )}
    </div>
  )
}
