/**
 * Shimmering skeleton placeholders. `Skeleton` is a bare bar; the two composite
 * skeletons mirror the real content's dimensions (feed card, comment thread) so
 * nothing jumps when data arrives.
 */
export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function RestaurantCardSkeleton() {
  return (
    <div className="sticker flex gap-4 p-4" aria-hidden="true">
      <div className="flex w-16 shrink-0 flex-col items-center gap-2 border-2 border-ink bg-basil-100 py-2">
        <Skeleton className="h-6 w-9" />
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-3 w-5" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-8 w-8" />
        </div>
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-3 w-52" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  )
}

export function CommentThreadSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <Skeleton className="h-6 w-32 border-2 border-ink" />
      <div className="border-2 border-ink bg-surface p-3 shadow-card">
        <Skeleton className="h-4 w-full" />
        <div className="mt-2 flex justify-end">
          <Skeleton className="h-7 w-24 border-2 border-ink" />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-2">
          <div className="flex flex-col items-center gap-2 border-2 border-ink bg-basil-100 p-1.5">
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-3 w-3" />
          </div>
          <div className="min-w-0 flex-1 space-y-2 border-2 border-ink bg-surface p-2 shadow-card">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
