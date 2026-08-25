import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { castVote } from '../api/votes'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import { subscribe } from '../lib/live'

/**
 * Upvote/downvote with toggle semantics as one bordered ledger cluster
 * [▲ | score | ▼]. Presses land like a stamp (crisp tick, no bounce), the
 * score crossfades between values, live votes from other clients update the
 * tally in place, and anonymous clicks redirect to /login preserving the path.
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

  useEffect(() => {
    setScore(initialScore)
    setMyVote(initialMyVote)
  }, [initialScore, initialMyVote])

  // Live vote from another client: update the visible tally in-place.
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
    const sizeClass = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
    const animating = pop.dir === direction
    return (
      <svg
        key={animating ? `${direction}-${pop.n}` : direction}
        viewBox="0 0 24 24"
        strokeWidth="1.75"
        strokeLinejoin="round"
        className={`${sizeClass} ${animating ? 'animate-tick-pop' : ''}`}
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
      >
        <path d={direction === 'up' ? 'M12 5.5 19.5 16h-15z' : 'M12 18.5 4.5 8h15z'} />
      </svg>
    )
  }

  const pad = size === 'sm' ? 'w-8 h-7' : 'w-9 h-9'
  const upOn = myVote === 1
  const downOn = myVote === -1

  return (
    <span className="inline-flex flex-col items-center">
      <span className="inline-flex items-center border-[1.5px] border-ink bg-card">
        <button
          type="button"
          onClick={() => handleVote(1)}
          disabled={busy}
          aria-label="Upvote"
          aria-pressed={upOn}
          className={`grid ${pad} place-items-center transition-colors duration-150 ${
            upOn ? 'bg-up text-paper' : 'text-muted hover:bg-paper'
          }`}
        >
          <Arrow direction="up" active={upOn} />
        </button>
        <span
          key={score}
          className={`num animate-score-in min-w-8 px-2 text-center text-[13px] font-semibold leading-none ${
            upOn ? 'text-up' : downOn ? 'text-down' : 'text-ink'
          }`}
        >
          {score}
        </span>
        <button
          type="button"
          onClick={() => handleVote(-1)}
          disabled={busy}
          aria-label="Downvote"
          aria-pressed={downOn}
          className={`grid ${pad} place-items-center transition-colors duration-150 ${
            downOn ? 'bg-down text-paper' : 'text-muted hover:bg-paper'
          }`}
        >
          <Arrow direction="down" active={downOn} />
        </button>
      </span>
      {error && <span className="mt-1 max-w-28 text-center text-xs font-semibold text-down">{error}</span>}
    </span>
  )
}