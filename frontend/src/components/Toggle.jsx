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
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-150 active:scale-95 ${
        checked ? 'border-accent bg-accent' : 'border-line bg-canvas'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-surface shadow transition-transform duration-200 ease-out ${
          checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  )
}