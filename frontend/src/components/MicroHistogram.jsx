/**
 * Five-bar star histogram (5★ → 1★, left to right) backing the ledger score.
 * Bar heights normalize against the tallest bucket; gold ink throughout.
 */
export default function MicroHistogram({ distribution }) {
  const buckets = [5, 4, 3, 2, 1].map((star) => Number(distribution?.[star] ?? 0))
  const max = Math.max(...buckets, 1)

  return (
    <span className="inline-flex items-end gap-[2.5px]" aria-hidden="true">
      {buckets.map((count, i) => {
        const height = count === 0 ? 3 : Math.max(4, Math.round((count / max) * 16))
        return (
          <i
            key={i}
            className="inline-block w-[5px] rounded-[1px]"
            style={{ height, background: 'var(--color-gold)', opacity: count === 0 ? 0.35 : 0.9 }}
          />
        )
      })}
    </span>
  )
}
