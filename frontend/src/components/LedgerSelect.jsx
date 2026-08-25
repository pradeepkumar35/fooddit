/**
 * Ledger-styled native select: hairline frame, mono chevron, themed option
 * popup. Keeps real <select> semantics (keyboard + screen reader friendly).
 */
export default function LedgerSelect({ className = '', children, ...props }) {
  return (
    <select
      {...props}
      className={`cursor-pointer appearance-none border-[1.5px] border-hair bg-card py-2 pl-3.5 pr-9 text-xs font-semibold text-ink transition-colors duration-150 hover:border-ink focus:border-ink focus:outline-none ${className}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6'><path d='M1 1l4 4 4-4' stroke='%23757064' stroke-width='1.6' fill='none' stroke-linecap='round'/></svg>\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 13px center',
      }}
    >
      {children}
    </select>
  )
}
