const TIER_STYLE = {
  ELITE: { letter: 'E', color: 'var(--color-gold)' },
  GREAT: { letter: 'G', color: 'var(--color-emerald)' },
  SOLID: { letter: 'S', color: 'var(--color-tierslate)' },
}

const TIER_LABEL = {
  ELITE: 'Elite · 4.5 and up',
  GREAT: 'Great · 4.0–4.49',
  SOLID: 'Solid · below 4.0',
}

/**
 * Circular tier seal, rotated like pressed by hand. Small rides inline on
 * ledger rows; large anchors the dossier fact sheet with a dashed inner ring.
 */
export default function TierSeal({ tier = 'SOLID', size = 'sm', animate = true }) {
  const style = TIER_STYLE[tier] ?? TIER_STYLE.SOLID

  if (size === 'lg') {
    return (
      <div
        title={TIER_LABEL[tier]}
        className={`seal-stamp seal-stamp-block relative mx-auto ${animate ? 'animate-stamp-in' : ''}`}
        style={{
          width: 64,
          height: 64,
          color: style.color,
          border: `2px solid ${style.color}`,
          fontSize: 19,
          fontWeight: 700,
        }}
      >
        <span aria-hidden="true" className="absolute rounded-full opacity-60"
          style={{ inset: 4, border: `1px dashed ${style.color}` }} />
        {style.letter}
      </div>
    )
  }

  return (
    <span
      role="img"
      aria-label={TIER_LABEL[tier]}
      title={TIER_LABEL[tier]}
      className={`seal-stamp shrink-0 ${animate ? 'animate-stamp-in' : ''}`}
      style={{
        width: 17,
        height: 17,
        color: style.color,
        border: `1.5px solid ${style.color}`,
        fontSize: 8.5,
        fontWeight: 700,
      }}
    >
      {style.letter}
    </span>
  )
}
