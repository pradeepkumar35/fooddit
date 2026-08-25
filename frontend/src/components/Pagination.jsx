/**
 * Page-based pagination in ledger folio style: mono numerals, hard-shadow
 * hover, ellipsis windows for long ranges. Never "show more" — the backend
 * owns slicing, this control just walks pages.
 */
export default function Pagination({ page, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null

  const numbers = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) numbers.push(i)
  } else {
    numbers.push(1)
    const start = Math.max(2, page + 1 - 1)
    const end = Math.min(totalPages - 1, page + 1 + 1)
    if (start > 2) numbers.push('…')
    for (let i = start; i <= end; i++) numbers.push(i)
    if (end < totalPages - 1) numbers.push('…')
    numbers.push(totalPages)
  }

  const base =
    'pg num inline-grid h-10 min-w-10 place-items-center border-[1.5px] border-ink bg-card px-3 text-[13px] font-medium text-ink transition duration-[120ms]'

  return (
    <nav className="pager mt-7 flex flex-wrap items-center justify-center gap-2" aria-label="Ledger pages">
      <button
        type="button"
        className={`${base} px-4`}
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        ‹ Prev
      </button>
      {numbers.map((n, i) =>
        n === '…' ? (
          <span key={`gap-${i}`} className="num px-1 text-muted">
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            aria-label={`Page ${n}`}
            aria-current={n - 1 === page ? 'page' : undefined}
            className={`num inline-grid h-10 min-w-10 place-items-center border-[1.5px] px-3 text-[13px] font-medium transition duration-[120ms] ${
              n - 1 === page
                ? 'border-ink bg-ink text-paper'
                : 'border-ink bg-card text-ink hover:-translate-y-px hover:shadow-hard-sm'
            }`}
            onClick={() => n - 1 !== page && onPageChange(n - 1)}
          >
            {n}
          </button>
        ),
      )}
      <button
        type="button"
        className={`${base} px-4`}
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
      >
        Next ›
      </button>
    </nav>
  )
}
