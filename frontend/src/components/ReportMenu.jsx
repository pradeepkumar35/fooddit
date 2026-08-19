import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
 *
 * The reason picker is rendered through a portal into {@code document.body} so
 * it is never clipped by overflow-hidden ancestors (comment reply threads use
 * overflow-hidden for their collapse animation); it is positioned from the
 * button and closes on outside mousedown, scrolling or resizing.
 */
export default function ReportMenu({ targetType, targetId }) {
  const { isAuthenticated } = useAuth()
  const notify = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onClickOutside = (event) => {
      if (event.target?.closest?.(`[data-report="${targetType}-${targetId}"]`)) return
      setOpen(false)
    }
    const close = () => setOpen(false)
    // mousedown lets us close before a click, without catching the trigger
    // itself; scroll/resize close so a fixed-position menu never goes stale.
    document.addEventListener('mousedown', onClickOutside)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open, targetType, targetId])

  const openMenu = () => {
    if (open) {
      setOpen(false)
      return
    }
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) {
      setPos({
        top: rect.bottom + 6,
        right: Math.max(0, window.innerWidth - rect.right),
      })
    }
    setOpen(true)
  }

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

  const guard = `${targetType}-${targetId}`

  if (state === 'done') {
    return <span className="text-xs text-muted">Reported</span>
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-report={guard}
        aria-label="More actions"
        aria-expanded={open}
        onClick={openMenu}
        className="border-2 border-ink bg-surface p-1 text-ink shadow-card transition duration-150 hover:bg-accent-soft active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            role="menu"
            data-report={guard}
            style={{ top: pos?.top ?? 0, right: pos?.right ?? 0 }}
            className="animate-fade-slide-in fixed z-50 w-44 overflow-hidden border-2 border-ink bg-surface py-1 shadow-card-hover"
          >
            <p className="sticker m-2 inline-block px-2 py-1 text-xs font-bold uppercase tracking-wide text-ink">
              Report
            </p>
            {REASONS.map((reason) => (
              <button
                key={reason.value}
                type="button"
                disabled={state === 'submitting'}
                onClick={() => handleReport(reason.value)}
                className="block w-full px-3 py-2 text-left text-sm font-semibold text-ink transition-colors duration-150 hover:bg-canvas disabled:opacity-50"
              >
                {reason.label}
              </button>
            ))}
            {state === 'error' && <p className="px-3 py-2 text-xs font-semibold text-chili-600">{error}</p>}
          </div>,
          document.body,
        )}
    </>
  )
}