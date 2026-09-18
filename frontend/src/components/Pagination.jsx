import { useEffect, useState } from 'react'

/**
 * Page-based pagination in ledger folio style: mono numerals, hard-shadow
 * hover, ellipsis windows for long ranges, and a "jump to page" box so a
 * 500-page ledger doesn't have to be walked one step at a time. Never "show
 * more" — the backend owns slicing, this control just walks pages.
 */
export default function Pagination({ page, totalPages, onPageChange }) {
  const [draft, setDraft] = useState('')

  // The box is an entry field, not a display: clear it whenever the page (or
  // the result set) changes so its placeholder always shows where you are.
  useEffect(() => {
    setDraft('')
  }, [page, totalPages])

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

  const jumpTo = (event) => {
    event.preventDefault()
    const parsed = parseInt(draft, 10)
    setDraft('')
    if (!Number.isFinite(parsed)) return
    const target = Math.min(Math.max(parsed, 1), totalPages) - 1
    if (target !== page) onPageChange(target)
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

      {/* Jump box: type a folio number and press Enter (or Go) to land on it. */}
      <form onSubmit={jumpTo} className="ml-1 flex items-center gap-1.5">
        <span className="micro-label" aria-hidden="true">Go to</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={draft}
          onChange={(event) => setDraft(event.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder={String(page + 1)}
          aria-label="Go to page"
          className="num h-10 w-16 border-[1.5px] border-ink bg-card px-2 text-center text-[13px] font-medium text-ink placeholder:text-muted"
        />
        <button type="submit" disabled={!draft} className={`${base} px-3 disabled:opacity-40`}>
          Go
        </button>
      </form>
    </nav>
  )
}
