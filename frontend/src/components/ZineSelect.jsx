/**
 * Zine-styled dropdown: keeps native <select> semantics (keyboard + screen
 * reader friendly) but strips the browser chrome (appearance-none) and dresses
 * it as a chunky bordered sticker with a hard shadow and an ink chevron that
 * adapts to dark mode via currentColor.
 */
export default function ZineSelect({ className = '', children, ...props }) {
  return (
    <div className={`relative inline-block align-middle ${className}`}>
      <select
        {...props}
        className="zine-select h-9 min-w-0 max-w-[10.5rem] cursor-pointer appearance-none border-2 border-ink bg-surface pl-3 pr-8 text-xs font-bold uppercase tracking-wide text-ink shadow-card transition duration-150 hover:bg-accent-soft active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus:outline-none sm:max-w-none"
      >
        {children}
      </select>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-ink"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  )
}