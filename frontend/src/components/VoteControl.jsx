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

  const Arrow = ({ direction, active }) => {
    const sizeClass = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
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

  const upClass = myVote === 1 ? 'text-accent' : 'text-muted hover:text-accent'
  const downClass = myVote === -1 ? 'text-down' : 'text-muted hover:text-down'
  const scoreClass =
    myVote === 1 ? 'text-accent' : myVote === -1 ? 'text-down' : 'text-ink'
  const scoreSize = size === 'sm' ? 'text-sm' : 'text-base'
  const padClass = size === 'sm' ? 'p-4' : 'p-3.5'

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => handleVote(1)}
        disabled={busy}
        aria-label="Upvote"
        className={`-m-2 flex items-center justify-center rounded-full ${padClass} ${upClass} transition duration-150 ease-out active:scale-75 disabled:opacity-50`}
      >
        <Arrow direction="up" active={myVote === 1} />
      </button>
      <span key={score} className={`${scoreSize} animate-score-in my-1.5 font-semibold leading-none tabular-nums ${scoreClass}`}>
        {score}
      </span>
      <button
        type="button"
        onClick={() => handleVote(-1)}
        disabled={busy}
        aria-label="Downvote"
        className={`-m-2 flex items-center justify-center rounded-full ${padClass} ${downClass} transition duration-150 ease-out active:scale-75 disabled:opacity-50`}
      >
        <Arrow direction="down" active={myVote === -1} />
      </button>
      {error && <p className="mt-1 max-w-24 text-center text-xs text-chili-600">{error}</p>}
    </div>
  )
}
