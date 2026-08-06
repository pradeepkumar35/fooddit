import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createReport } from '../api/reports'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'

const REASONS = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'FAKE_REVIEW', label: 'Fake review' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'OFF_TOPIC', label: 'Off-topic' },
]

/**
 * The overflow menu on a review or comment: a quiet "⋯" button that opens a
 * reason picker and submits a report. Anonymous users are redirected to /login
 * preserving the return path. Only ever removes itself from view after a
 * successful (or duplicate) report — there is no moderation UI in this PoC.
 */
export default function ReportMenu({ targetType, targetId }) {
  const { isAuthenticated } = useAuth()
  const notify = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const onClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleReport = async (reason) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } })
      return
    }
    if (state === 'submitting') return
    setError('')
    setState('submitting')
    try {
      await createReport({ targetType, targetId, reason })
      notify('Report submitted. Thanks!')
      setState('done')
    } catch (err) {
      if (err.response?.status === 409) {
        notify('You already reported this.', 'info')
        setState('done')
      } else {
        setState('error')
        setError(err.response?.data?.message || 'Report failed. Please try again.')
      }
    }
  }

  if (state === 'done') {
    return <span className="text-xs text-muted">Reported</span>
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        aria-label="More actions"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-md p-1 text-muted transition-colors duration-150 hover:bg-canvas hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>

      {open && (
        <div className="animate-fade-slide-in absolute right-0 top-full z-10 mt-1 w-44 rounded-lg border border-line bg-surface py-1 shadow-card-hover">
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Report
          </p>
          {REASONS.map((reason) => (
            <button
              key={reason.value}
              type="button"
              disabled={state === 'submitting'}
              onClick={() => handleReport(reason.value)}
              className="block w-full px-3 py-2 text-left text-sm text-ink transition-colors duration-150 hover:bg-canvas disabled:opacity-50"
            >
              {reason.label}
            </button>
          ))}
          {state === 'error' && <p className="px-3 py-2 text-xs text-chili-600">{error}</p>}
        </div>
      )}
    </div>
  )
}
