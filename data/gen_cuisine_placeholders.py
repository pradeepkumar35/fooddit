"""Generate the curated cuisine placeholder tiles into frontend/public/images/cuisine/.

Flat 16:10 ledger-styled SVG tiles: warm paper, hairline frame, food glyph and
uppercase label. Deterministic + license-free; replace by downloading real
photographs later (schema and importer paths stay identical).
"""
import os

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "frontend", "public", "images", "cuisine")

TILES = {
    "biryani":        ("Biryani",        "#B98A1F", "🍛"),
    "north-indian":   ("North Indian",   "#8E5A2B", "🍲"),
    "south-indian":   ("South Indian",   "#1E6E5C", "🥞"),
    "street-indian":  ("Street Food",    "#C46A1F", "🥙"),
    "chinese":        ("Chinese",        "#8E2F3C", "🍜"),
    "pizza":          ("Pizza",          "#C43E2B", "🍕"),
    "burger":         ("Burgers",        "#B98A1F", "🍔"),
    "rolls":          ("Rolls & Kebab",  "#7A4A21", "🌯"),
    "grill":          ("Grill",          "#5F4B8B", "🍢"),
    "seafood":        ("Seafood",        "#2E6E8E", "🍤"),
    "thali":          ("Thali",          "#1E6E5C", "🍱"),
    "sandwich":       ("Sandwiches",     "#6B7A2B", "🥪"),
    "bakery":         ("Bakery",         "#9A6B1F", "🥐"),
    "dessert":        ("Desserts",       "#8B4A6B", "🍰"),
    "ice-cream":      ("Ice Cream",      "#4A6B8B", "🍨"),
    "cafe":           ("Cafe & Drinks",  "#4A3B2B", "☕"),
    "fast-food":      ("Fast Food",      "#B98A1F", "🍟"),
    "generic":        ("Restaurant",     "#5F6B76", "🍽️"),
}

SVG = """<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
  <rect width="800" height="500" fill="{bg}"/>
  <rect x="14" y="14" width="772" height="472" fill="none" stroke="{line}" stroke-width="2"/>
  <text x="400" y="285" font-size="150" text-anchor="middle">{glyph}</text>
  <text x="400" y="420" font-family="IBM Plex Mono, monospace" font-size="30" letter-spacing="10"
        text-anchor="middle" fill="{fg}">{label}</text>
</svg>
"""

PALETTES = {
    "dark":  {"bg": "#171410", "line": "#4A463E", "fg": "#E8DFC8", "glyph": ""},
    "paper": {"bg": "#F1E9D8", "line": "#C9B98F", "fg": "#3B3320", "glyph": ""},
}


def main():
    os.makedirs(OUT, exist_ok=True)
    pal = PALETTES["dark"] if False else PALETTES["paper"]
    for slug, (label, accent, glyph) in TILES.items():
        svg = SVG.format(bg="#F1E9D8", line="#C9B98F", fg="#3B3320", glyph=glyph,
                         label=label.upper())
        # accent stripe for quick visual distinction between buckets
        svg = svg.replace("</svg>",
                          f'<rect x="0" y="0" width="800" height="10" fill="{accent}"/></svg>')
        with open(os.path.join(OUT, f"{slug}.svg"), "w", encoding="utf-8") as f:
            f.write(svg)
        print("wrote", f"{slug}.svg")
    print("total:", len(TILES), "tiles ->", OUT)


if __name__ == "__main__":
    main()
