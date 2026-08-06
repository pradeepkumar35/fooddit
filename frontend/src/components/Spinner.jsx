/**
 * Small inline spinner shown inside submitting buttons. Inherits the button's
 * current text color so it works on both solid accent and ghost buttons.
 */
export default function Spinner({ className = 'h-3 w-3' }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} animate-spin`} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
