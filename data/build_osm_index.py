"""Build a compact index of Indian food POIs from the Geofabrik OSM extract.

Reads data/_osm/india-latest.osm.pbf once (pyosmium, way node locations
resolved), keeps every node/way tagged amenity=restaurant|cafe|fast_food that
has a name, and writes data/_osm/food_pois.jsonl.gz:

    {"name": ..., "lat": ..., "lon": ..., "suburb": ..., "city": ...}

The index is a local cache only - it never goes into the database (Neon's free
tier is 0.5 GB and India has hundreds of thousands of POIs).

Usage:
    python build_osm_index.py [--extract data/_osm/india-latest.osm.pbf]
"""
import argparse
import gzip
import json
import os
import sys
import time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_EXTRACT = os.path.join(REPO, "data", "_osm", "india-latest.osm.pbf")
DEFAULT_OUT = os.path.join(REPO, "data", "_osm", "food_pois.jsonl.gz")
DEFAULT_PLACES_OUT = os.path.join(REPO, "data", "_osm", "places.jsonl.gz")

FOOD_AMENITIES = {"restaurant", "cafe", "fast_food"}
# OSM place nodes are the dense, precise gazetteer for Indian locality strings
# ("Kandivali", "Thakur Village", …) - exactly what the LOCALITY tier needs.
PLACE_KINDS = {"suburb", "neighbourhood", "quarter", "village", "town", "hamlet", "locality"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--extract", default=DEFAULT_EXTRACT)
    ap.add_argument("--out", default=DEFAULT_OUT)
    ap.add_argument("--places-out", default=DEFAULT_PLACES_OUT)
    args = ap.parse_args()

    try:
        import osmium
    except ImportError:
        sys.exit("pyosmium missing - run: pip install osmium")
    if not os.path.exists(args.extract):
        sys.exit(f"OSM extract not found: {args.extract}")

    written_pois = 0
    written_places = 0
    seen = set()
    seen_places = set()

    def emit_poi(out, tags, lat, lon):
        nonlocal written_pois
        name = tags.get("name")
        if not name:
            return
        key = ("p", name, round(lat, 5), round(lon, 5))
        if key in seen:
            return
        seen.add(key)
        out.write(json.dumps({
            "name": name,
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "suburb": tags.get("addr:suburb") or tags.get("addr:neighbourhood"),
            "city": tags.get("addr:city"),
        }, ensure_ascii=False) + "\n")
        written_pois += 1

    def emit_place(out, tags, lat, lon):
        nonlocal written_places
        name = tags.get("name")
        if not name:
            return
        key = ("l", name, round(lat, 4), round(lon, 4))
        if key in seen_places:
            return
        seen_places.add(key)
        out.write(json.dumps({
            "name": name,
            "kind": tags.get("place"),
            "lat": round(lat, 6),
            "lon": round(lon, 6),
        }, ensure_ascii=False) + "\n")
        written_places += 1

    class Handler(osmium.SimpleHandler):
        def __init__(self, out_pois, out_places):
            super().__init__()
            self.out_pois = out_pois
            self.out_places = out_places

        def node(self, n):
            amenity = n.tags.get("amenity")
            if amenity in FOOD_AMENITIES:
                emit_poi(self.out_pois, n.tags, n.location.lat, n.location.lon)
            place = n.tags.get("place")
            if place in PLACE_KINDS:
                emit_place(self.out_places, n.tags, n.location.lat, n.location.lon)

        def way(self, w):
            if w.tags.get("amenity") not in FOOD_AMENITIES:
                return
            lats, lons = [], []
            for node in w.nodes:
                if node.location.valid():
                    lats.append(node.location.lat)
                    lons.append(node.location.lon)
            if lats:
                emit_poi(self.out_pois, w.tags,
                         sum(lats) / len(lats), sum(lons) / len(lons))

    start = time.time()
    with gzip.open(args.out, "wt", encoding="utf-8") as out_pois, \
         gzip.open(args.places_out, "wt", encoding="utf-8") as out_places:
        handler = Handler(out_pois, out_places)
        # locations=True lets way nodes resolve their coordinates (disk-backed cache)
        handler.apply_file(args.extract, locations=True)
    for path, n in ((args.out, written_pois), (args.places_out, written_places)):
        size_mb = os.path.getsize(path) / 1024 / 1024
        print(f"wrote {n:,} records -> {path} ({size_mb:.1f} MB gz)")
    print(f"done in {time.time() - start:.0f}s")


if __name__ == "__main__":
    main()
