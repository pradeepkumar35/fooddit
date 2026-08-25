/**
 * Square ledger switch: ink-framed track, card knob sliding on a fixed rail.
 * Emerald fill when on. Keeps the role="switch" contract.
 */
export default function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center border-[1.5px] border-ink transition-colors duration-150 active:scale-[0.97] ${
        checked ? 'bg-up' : 'bg-paper'
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 border-[1.5px] border-ink bg-card transition-transform duration-200 ease-out ${
          checked ? 'translate-x-[24px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  )
}