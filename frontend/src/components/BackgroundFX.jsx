import { useMemo } from 'react'

const GLYPHS = ['🍛', '🍜', '🍕', '🍰', '🍹', '🥘']
const PALETTE = ['#FF4D00', '#1F5CFF', '#FFD400', '#E8336B', '#5FA37A']

/**
 * Site-wide ambient background: slow-drifting gradient blobs and a few
 * low-opacity food glyphs floating upward. Purely decorative — aria-hidden,
 * pointer-events none, rendered behind everything. Disabled entirely for
 * reduced-motion.
 */
export default function BackgroundFX() {
  const glyphs = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => ({
        id: i,
        glyph: GLYPHS[i % GLYPHS.length],
        left: 4 + ((i * 13) % 92),
        delay: -(i * 3.2),
        duration: 18 + (i % 5) * 4,
        size: 22 + (i % 4) * 8,
      })),
    [],
  )
  const blobs = useMemo(
    () =>
      Array.from({ length: 3 }).map((_, i) => ({
        id: i,
        color: PALETTE[i % PALETTE.length],
        left: [8, 62, 78][i],
        top: [12, 55, 78][i],
        size: [380, 300, 340][i],
        delay: -i * 4,
      })),
    [],
  )

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {blobs.map((b) => (
        <span
          key={b.id}
          className="absolute rounded-full opacity-[0.14] dark:opacity-[0.10] animate-blob-drift"
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            width: b.size,
            height: b.size,
            background: `radial-gradient(circle at 30% 30%, ${b.color}, transparent 70%)`,
            filter: 'blur(70px)',
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
      {glyphs.map((g) => (
        <span
          key={g.id}
          className="absolute select-none opacity-[0.10] dark:opacity-[0.08] animate-glyph-float"
          style={{
            left: `${g.left}%`,
            bottom: '-5%',
            fontSize: g.size,
            animationDelay: `${g.delay}s`,
            animationDuration: `${g.duration}s`,
          }}
        >
          {g.glyph}
        </span>
      ))}
    </div>
  )
}