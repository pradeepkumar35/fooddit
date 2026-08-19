const LEGEND = ['Biryani', 'Noodle', 'Bakery', 'Seafood', 'Cafe']
function styleFor(cuisine = '') {
  const map = [
    [/biryani|indian|rice|thali|north|south|punjabi|maha|curry/i, '#FF4D00'],
    [/burger|fast|street|snack|sandwich/i, '#E0A13C'],
    [/noodle|ramen|wok|chinese/i, '#5FA37A'],
    [/pizza|italian|pasta|conti/i, '#E8336B'],
    [/dessert|sweet|bakery|ice|cake/i, '#7A5CF0'],
    [/beverage|juice|cafe|coffee|tea|bar/i, '#1F5CFF'],
    [/seafood|coastal|fish/i, '#2E9E9B'],
  ]
  for (const [re, color] of map) if (re.test(cuisine)) return color
  return '#5A5347'
}

/**
 * The zine street-map sticker for the feed explorer: a location button on top,
 * the map with cuisine-colored diamond pins (rotated, glyphs, rating tags) that
 * sync with the card on hover, a plotted-count legend bar, and a city-wide
 * total line. Rendered in two responsive slots by RestaurantListPage — inside a
 * left sticky column on desktop and, on mobile, pinned between the filters and
 * the scrollable card list.
 */
export default function RestaurantMap({
  pins,
  loading,
  count,
  selectedCity,
  locality,
  hoveredId,
  setHoveredId,
  setSwitcherOpen,
  totalCount,
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => setSwitcherOpen(true)}
        className="group mb-3 inline-flex items-center gap-2 border-2 border-ink bg-surface px-3 py-2 text-sm font-bold uppercase tracking-wide text-ink shadow-card transition duration-150 hover:bg-accent-soft active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
      >
        <span className="transition-transform duration-200 group-hover:animate-wiggle">📍</span>
        {selectedCity ? `${selectedCity.cityName}${locality ? ` · ${locality}` : ''}` : 'Choose location'}
        <span className="text-muted">change</span>
      </button>

      <div className="sticker relative -rotate-1 overflow-hidden p-0 lg:-rotate-[0.6deg]">
        <span className="tape" aria-hidden="true" />
        <div className="map-streets pointer-events-none absolute inset-0 opacity-70 dark:opacity-40" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(circle at 78% 18%, rgba(255,77,0,0.12), transparent 40%), radial-gradient(circle at 22% 82%, rgba(31,92,255,0.10), transparent 40%)',
          }}
        />
        <div className="relative aspect-[16/9] w-full lg:aspect-[4/3]">
          {pins.length === 0 && (
            <div className="absolute inset-0 grid place-items-center px-6 text-center">
              <p className="text-sm font-bold text-muted">No restaurants to plot yet.</p>
            </div>
          )}
          <div
            role="img"
            aria-label={`Map of restaurants in ${selectedCity?.cityName || 'your area'}`}
            className="h-full w-full"
          >
            {pins.map((pin, i) => (
              <button
                key={pin.id}
                type="button"
                onMouseEnter={() => setHoveredId(pin.id)}
                onMouseLeave={() => setHoveredId(null)}
                aria-label={`${pin.name}, rating ${pin.avgRating.toFixed(1)}`}
                className="animate-pop-rotate group absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1 transition-transform duration-200 ease-out hover:scale-110"
                style={{ left: `${pin.x}%`, top: `${pin.y}%`, animationDelay: `${Math.min(i, 8) * 50}ms` }}
              >
                <span
                  className={`relative grid h-11 w-11 rotate-45 place-items-center rounded-[6px] border-2 border-ink shadow-card transition-transform duration-200 ${
                    hoveredId === pin.id || pin.featured ? 'scale-110' : ''
                  }`}
                  style={{ background: pin.color }}
                >
                  <span className="-rotate-45 text-lg">{pin.glyph}</span>
                  {pin.featured && (
                    <span className="absolute -inset-2 -z-10 animate-glow-pulse rounded-md" style={{ color: pin.color }} aria-hidden="true" />
                  )}
                </span>
                <span className="border-2 border-ink bg-surface px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-ink shadow-card">
                  {pin.avgRating.toFixed(1)}★
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 border-t-2 border-ink bg-surface/95 px-3 py-2 backdrop-blur-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
            {loading ? 'Loading…' : `${count} plotted`}
          </span>
          <span className="ml-auto flex gap-1.5">
            {LEGEND.slice(0, 4).map((c) => (
              <span key={c} className="h-2.5 w-2.5 rounded-sm border border-ink" style={{ background: styleFor(c) }} aria-hidden="true" />
            ))}
          </span>
        </div>
      </div>

      {totalCount !== null && selectedCity && (
        <p className="mt-3 text-xs font-semibold text-muted">
          {totalCount} restaurants across {selectedCity.cityName} — hover a card to find it on the map.
        </p>
      )}
    </>
  )
}