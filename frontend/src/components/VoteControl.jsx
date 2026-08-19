import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { castVote } from '../api/votes'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import { subscribe } from '../lib/live'

/**
 * Reddit-style upvote/downvote with toggle semantics, used by review posts and
 * comments alike. Arrows are outline when unvoted and filled when the user has
 * voted; color is the primary feedback (accent = upvote, slate = downvote).
 * Clicking bounces the arrow, the score fades/slides to its new value, and a
 * toast acknowledges the vote. Anonymous clicks are redirected to /login,
 * preserving the return path.
 */
export default function VoteControl({ votableType, votableId, initialScore, initialMyVote, size = 'md' }) {
  const { isAuthenticated } = useAuth()
  const notify = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [score, setScore] = useState(initialScore)
  const [myVote, setMyVote] = useState(initialMyVote)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pop, setPop] = useState({ dir: null, n: 0 })

  // Follow refreshed props (e.g. after a thread reload) so a stale initial value
  // never persists for this votable.
  useEffect(() => {
    setScore(initialScore)
    setMyVote(initialMyVote)
  }, [initialScore, initialMyVote])

  // Live vote from another client: update the visible tally in-place. We only
  // touch the score (myVote is viewer-specific and not part of the broadcast).
  useEffect(() => {
    return subscribe('vote.updated', (event) => {
      if (event.votableType === votableType && event.votableId === votableId) {
        setScore(event.score)
      }
    })
  }, [votableType, votableId])

  const handleVote = async (value) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } })
      return
    }
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await castVote(votableType, votableId, value)
      setScore(res.score)
      setMyVote(res.myVote)
      setPop((p) => ({ dir: value, n: p.n + 1 }))
      notify(res.myVote ? (res.myVote === 1 ? 'Upvoted' : 'Downvoted') : 'Vote removed')
    } catch (err) {
      setError(err.response?.data?.message || 'Vote failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const isChip = size === 'chip'
  const Arrow = ({ direction, active }) => {
    const sizeClass = size === 'sm' || isChip ? 'h-3 w-3' : 'h-4 w-4'
    const animating = pop.dir === direction
    return (
      <svg
        key={animating ? `${direction}-${pop.n}` : direction}
        viewBox="0 0 24 24"
        strokeWidth="1.75"
        strokeLinejoin="round"
        className={`${sizeClass} ${animating ? 'animate-vote-pop' : ''}`}
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
      >
        <path d={direction === 'up' ? 'M12 5.5 19.5 16h-15z' : 'M12 18.5 4.5 8h15z'} />
      </svg>
    )
  }

  const upClass = myVote === 1 ? 'bg-up text-surface border-up' : 'bg-surface text-muted border-ink hover:text-up'
  const downClass = myVote === -1 ? 'bg-down text-surface border-down' : 'bg-surface text-muted border-ink hover:text-down'
  const scoreClass =
    myVote === 1 ? 'text-up' : myVote === -1 ? 'text-down' : 'text-ink'
  const scoreSize = size === 'sm' ? 'text-sm' : isChip ? 'text-xs' : 'text-base'
  const padClass = size === 'sm' ? 'p-2.5' : isChip ? 'p-1.5' : 'p-3'
  const btnClass =
    'flex items-center justify-center border-2 shadow-card transition duration-150 ease-out hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0.5 active:shadow-none disabled:opacity-50'

  return (
    <div className={isChip ? 'flex items-center gap-2' : 'flex flex-col items-center'}>
      <button
        type="button"
        onClick={() => handleVote(1)}
        disabled={busy}
        aria-label="Upvote"
        className={`${btnClass} ${padClass} ${upClass}`}
      >
        <Arrow direction="up" active={myVote === 1} />
      </button>
      <span
        key={score}
        className={`${scoreSize} ${
          isChip
            ? 'min-w-8 border-2 border-ink bg-surface px-2 py-1 text-center shadow-card'
            : 'my-2.5'
        } animate-score-in font-bold leading-none tabular-nums ${scoreClass}`}
      >
        {score}
      </span>
      <button
        type="button"
        onClick={() => handleVote(-1)}
        disabled={busy}
        aria-label="Downvote"
        className={`${btnClass} ${padClass} ${downClass}`}
      >
        <Arrow direction="down" active={myVote === -1} />
      </button>
      {error && <p className="mt-1 max-w-24 text-center text-xs font-semibold text-chili-600">{error}</p>}
    </div>
  )
}
