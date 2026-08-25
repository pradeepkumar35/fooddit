/**
 * Shimmering placeholders tinted paper/hairline (never generic gray), shaped
 * like the real ledger surfaces so nothing jumps when data lands.
 */
export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

/** One ledger row worth of placeholder. */
export function LedgerRowSkeleton() {
  return (
    <div className="flex items-start gap-4 px-1 py-4" aria-hidden="true">
      <div className="flex w-14 shrink-0 flex-col items-start gap-2 pt-1">
        <Skeleton className="h-3.5 w-8" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-2.5 w-40" />
      </div>
      <div className="hidden w-20 shrink-0 flex-col items-end gap-2 sm:flex">
        <Skeleton className="h-6 w-12" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-2.5 w-10" />
      </div>
      <Skeleton className="h-9 w-9 rounded-full" />
    </div>
  )
}

/** Dossier fact-sheet rail placeholder. */
export function FactSheetSkeleton() {
  return (
    <div className="panel grid gap-4 p-5" aria-hidden="true">
      <Skeleton className="mx-auto h-16 w-16 rounded-full" />
      <Skeleton className="mx-auto h-3 w-24" />
      <div className="space-y-3 border-t border-hair pt-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
      <div className="space-y-2.5 border-t border-hair pt-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="grid grid-cols-[14px_1fr_28px] items-center gap-2">
            <Skeleton className="h-2.5 w-7" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2.5 w-6" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Dossier review card placeholder. */
export function ReviewCardSkeleton() {
  return (
    <div className="panel-hair p-5" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-3 w-14" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-11/12" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-8 w-24 border border-hair" />
        <Skeleton className="h-8 w-16 border border-hair" />
      </div>
    </div>
  )
}

/** Threaded replies placeholder. */
export function CommentThreadSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="panel-hair p-4">
        <Skeleton className="h-3.5 w-full" />
        <div className="mt-3 flex justify-end">
          <Skeleton className="h-8 w-24 border border-hair" />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className={`reply-notch relative border border-hair bg-paper p-3.5 ${i === 0 ? '' : 'ml-[26px]'}`}>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="mt-2 h-3 w-3/4" />
        </div>
      ))}
    </div>
  )
}
