/**
 * A reliable iOS-style switch. The knob is anchored with an explicit left offset
 * and slides via a translate transform; the track recolors between accent (on)
 * and line (off).
 */
export default function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-11 shrink-0 items-center border-2 border-ink transition-colors duration-150 active:scale-95 ${
        checked ? 'bg-up' : 'bg-canvas'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 border-2 border-ink bg-surface shadow-card transition-transform duration-200 ease-out ${
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  )
}