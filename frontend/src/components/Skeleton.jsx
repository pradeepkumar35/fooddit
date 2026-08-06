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
    <div className="flex gap-3 rounded-lg border border-line bg-surface p-3">
      <div className="flex w-12 shrink-0 flex-col items-center gap-2 pt-1">
        <Skeleton className="h-5 w-8 rounded-md" />
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-3 w-5 rounded-md" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-4 w-4 rounded-md" />
        </div>
        <Skeleton className="h-3 w-24 rounded-md" />
        <Skeleton className="h-3 w-48 rounded-md" />
        <Skeleton className="h-4 w-20 rounded-md" />
      </div>
    </div>
  )
}

export function CommentThreadSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <Skeleton className="h-4 w-24 rounded-md" />
      <div className="rounded-lg border border-line p-3">
        <Skeleton className="h-4 w-full rounded-md" />
        <div className="mt-2 flex justify-end">
          <Skeleton className="h-6 w-24 rounded-lg" />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-2">
          <div className="flex flex-col items-center gap-2 pt-1">
            <Skeleton className="h-3 w-3 rounded-md" />
            <Skeleton className="h-3 w-4 rounded-md" />
            <Skeleton className="h-3 w-3 rounded-md" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-32 rounded-md" />
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-3/4 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}
