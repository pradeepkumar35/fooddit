import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { saveRestaurant, unsaveRestaurant } from '../api/restaurants'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import AnimatedNumber from './AnimatedNumber'
import MicroHistogram from './MicroHistogram'
import TierSeal from './TierSeal'
import { resizeImageUrl } from '../utils/imageUrl'

const TIER_EDGE = {
  ELITE: 'var(--color-gold)',
  GREAT: 'var(--color-emerald)',
  SOLID: 'var(--color-tierslate)',
}

const FRESH_WINDOW_MS = 10 * 60 * 1000
const isFresh = (iso) => iso && Date.now() - new Date(iso).getTime() < FRESH_WINDOW_MS

/**
 * One City Ledger row. Hierarchy per the approved design: name + the
 * discussion block (latest-reply snippet, comment count, last activity) carry
 * headline weight; rank + tier seal sit to the left as restrained context and
 * the score cluster sits right-aligned as secondary data. Clicking the row
 * opens an accordion panel with the newest review and a jump into the dossier;
 * the heart saves the restaurant; the whole row links through to the dossier.
 */
export default function LedgerRow({ row, index = 0 }) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const notify = useToast()

  const [saved, setSaved] = useState(row.saved)
  const [busy, setBusy] = useState(false)
  const [pop, setPop] = useState(0)
  const [expanded, setExpanded] = useState(false)
  // Content mounts on first expand and stays mounted afterwards, so the
  // grid-rows accordion animates both open AND close.
  const [everExpanded, setEverExpanded] = useState(false)
  useEffect(() => {
    if (expanded) setEverExpanded(true)
  }, [expanded])

  const hasReviews = row.reviewCount > 0
  const freshReview = isFresh(row.latestReview?.createdAt)
  const freshActivity = !freshReview && isFresh(row.lastActivityAt)

  const handleSave = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } })
      return
    }
    if (busy) return
    setBusy(true)
    try {
      if (saved) await unsaveRestaurant(row.id)
      else await saveRestaurant(row.id)
      const next = !saved
      setSaved(next)
      setPop((n) => n + 1)
      notify(next ? 'Saved to your list' : 'Removed from saved')
    } catch {
      /* leave state untouched on failure */
    } finally {
      setBusy(false)
    }
  }

  const openDossier = () => navigate(`/restaurants/${row.id}`)

  // Runtime fallback chain: stored image -> (broken/missing) -> cuisine tile ->
  // (no tile in payload) -> generic. Never a broken-image icon.
  const [imgFailed, setImgFailed] = useState(false)
  const tile = row.fallbackUrl || '/images/cuisine/generic.svg'
  const imgSrc = imgFailed || !row.imageUrl ? tile : resizeImageUrl(row.imageUrl, 300)

  return (
    <article
      onClick={openDossier}
      className="ledger-row group relative min-h-[110px] cursor-pointer overflow-hidden border-t border-hair transition-colors duration-150 first:border-t-0 hover:bg-card sm:min-h-[126px]"
      style={{ '--tier-edge': TIER_EDGE[row.tier] ?? 'transparent', animationDelay: `${Math.min(index, 11) * 40}ms` }}
      data-stagger="1"
    >
      {/* Treatment B: flush-left image bleeding the full row height. */}
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[72px] border-r border-hair sm:w-[150px]">
        <img
          src={imgSrc}
          alt=""
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover object-center"
        />
      </span>
      {/* Tier-color edge bar (over the image's hairline) on hover, mockup-exact. */}
      <span aria-hidden="true" className="edge-bar absolute bottom-3 left-[70px] top-3 w-[3px] sm:left-[148px]" />

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 py-4 pr-2 pl-[80px] sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-x-4 sm:pl-[162px] sm:pr-3">
        {/* Co-headline: identity + discussion */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 pb-0.5">
            <span className="num whitespace-nowrap text-[11.5px] text-muted">
              #<b className="font-semibold text-ink"><AnimatedNumber value={row.rank} /></b>
            </span>
            <TierSeal tier={row.tier} />
          </div>
          <Link
            to={`/restaurants/${row.id}`}
            className="font-serif text-lg font-semibold leading-snug text-ink transition-colors duration-150 hover:text-emerald sm:text-[19px]"
          >
            {row.name}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted">
            {[row.cuisineType, row.locality].filter(Boolean).join(' · ')}
          </p>

          <div className="mt-2 grid min-w-0 gap-1">
            {(row.latestReview?.content || !hasReviews) && (
              <p className="truncate font-serif text-[13.5px] italic text-ink/80">
                {hasReviews ? (
                  <>
                    “{row.latestReview.content}” — {row.latestReview.authorName}
                  </>
                ) : (
                  <>No reviews yet — be the first to write one.</>
                )}
              </p>
            )}
            <div className="flex items-center gap-3.5 text-[11.5px] text-muted">
              <span className="num font-semibold text-ink">💬 {row.commentCount}</span>
              <span className="num">{row.lastActivityAt ? `last activity ${timeAgoShort(row.lastActivityAt)}` : 'no activity yet'}</span>
              {freshReview && (
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="animate-ping-fresh h-[7px] w-[7px] rounded-full bg-emerald" />
                  <span className="num text-[10.5px] uppercase tracking-wider text-emerald">new review</span>
                </span>
              )}
              {freshActivity && <span aria-hidden="true" className="animate-ping-fresh h-[7px] w-[7px] rounded-full bg-emerald" />}
            </div>
          </div>
        </div>

        {/* Secondary data cluster (auto-placed after body: DOM order defines columns) */}
        <div className="hidden text-right sm:block" style={{ minWidth: 96 }}>
          <div className="num text-[22px] font-semibold leading-none text-ink">
            <AnimatedNumber value={row.avgRating ?? 0} decimals={1} />
          </div>
          <div className="mt-1.5">
            <MicroHistogram distribution={row.distribution} />
          </div>
          <div className="num mt-1.5 text-[11px] text-muted">{row.reviewCount} reviews</div>
          {row.monthlyVotes > 0 && (
            <div className="num mt-0.5 text-[10.5px] text-emerald">▲ {row.monthlyVotes} this month</div>
          )}
        </div>

        {/* Save + expand */}
        <div className="flex flex-row items-center gap-2 sm:flex-col sm:gap-2.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleSave(); }}
            disabled={busy}
            aria-label={saved ? 'Remove from saved' : 'Save restaurant'}
            aria-pressed={saved}
            className={`grid h-9 w-9 place-items-center rounded-full border-[1.5px] transition duration-150 ${
              saved ? 'border-up bg-up text-paper' : 'border-hair bg-card text-muted hover:border-ink hover:text-ink'
            }`}
          >
            <svg
              key={pop}
              viewBox="0 0 24 24"
              className={`h-4 w-4 ${pop > 0 ? 'animate-save-settle' : ''}`}
              fill={saved ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            aria-expanded={expanded}
            aria-label={expanded ? `Hide details for ${row.name}` : `Show details for ${row.name}`}
            className={`grid h-8 w-8 place-items-center border border-hair text-muted transition duration-150 hover:border-ink hover:text-ink ${
              expanded ? 'bg-ink text-paper' : ''
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-3 w-3 transition-transform duration-200 ease-in-out ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>

        {/* Accordion: animated height via grid-rows, newest review preview */}
        <div className="col-span-full grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}>
          <div className="min-h-0 overflow-hidden">
            {everExpanded && (
              <div className="mb-3 mt-1 border-l-2 border-hair pl-4">
              {hasReviews ? (
                <>
                  <p className="max-w-[68ch] font-serif text-sm leading-relaxed text-ink/85">
                    {row.latestReview?.content ?? 'No live reviews to preview.'}
                  </p>
                  {row.latestReview?.authorName && (
                    <p className="num mt-1.5 text-[11px] uppercase tracking-wider text-muted">
                      {row.latestReview.authorName} · {row.latestReview.rating ?? '—'}★ ·{' '}
                      {row.latestReview.createdAt ? timeAgoShort(row.latestReview.createdAt) : ''}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm font-medium text-muted">
                  Nothing recorded yet — open the dossier and write the entry.
                </p>
              )}
              <Link
                to={`/restaurants/${row.id}`}
                onClick={(e) => e.stopPropagation()}
                className="btn-hard mt-3 px-3.5 py-1.5 text-xs uppercase tracking-wide"
              >
                Open the dossier →
              </Link>
            </div>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

function timeAgoShort(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}