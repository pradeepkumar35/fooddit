"""Resolve per-restaurant coordinates for the whole catalog, cost-free.

Tier chain (provenance in restaurants.coords_source):

  1. OSM      - the restaurant's name matches a named food POI in the local OSM
                India extract. Matches are disambiguated against the restaurant's
                LOCALITY centroid (resolved first) and hard-capped by distance
                (8 km from the locality, 25 km from the city centre when the
                locality itself did not resolve), so a same-named place in
                another town can never win.
  2. LOCALITY - the restaurant's locality/area string resolves to a named OSM
                place (suburb/neighbourhood/village/town, the dense gazetteer)
                or a GeoNames India entry. Candidates are tried most-specific
                first and the NEAREST candidate within 35 km of the city centre
                wins.
  3. CITY     - the original per-city point, kept but jittered deterministically
                so pins never stack (last resort; still identifiable in the DB).

Inputs (all free, all local):
    data/_osm/food_pois.jsonl.gz   (build_osm_index.py)
    data/_osm/places.jsonl.gz      (build_osm_index.py)
    data/_osm/IN.zip               (GeoNames India postal dump)
Writes: restaurants.latitude/longitude + coords_source/coords_matched_name/
        coords_updated_at, and GeoNames-derived locality_coords rows.

Usage:
    python resolve_coordinates.py [--dry-run] [--limit-cities N] [--report path]
"""
import argparse
import gzip
import hashlib
import io
import json
import math
import os
import re
import sys
import zipfile
from collections import defaultdict
from difflib import SequenceMatcher

import psycopg2
from psycopg2.extras import execute_values

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(REPO, "backend", ".env")
OSM_INDEX = os.path.join(REPO, "data", "_osm", "food_pois.jsonl.gz")
OSM_PLACES_INDEX = os.path.join(REPO, "data", "_osm", "places.jsonl.gz")
GEONAMES_ZIP = os.path.join(REPO, "data", "_osm", "IN.zip")
GEONAMES_FULL_ZIP = os.path.join(REPO, "data", "_osm", "IN_full.zip")
DEFAULT_REPORT = os.path.join(REPO, "data", "_osm", "match_report.json")

CITY_PREFILTER_KM = 60.0    # OSM POIs worth considering for a city
LOCALITY_RADIUS_KM = 35.0   # a gazetteer place must be this close to city centre
OSM_NEAR_LOCALITY_KM = 8.0  # restaurant-name match cap around its locality
OSM_NEAR_CITY_KM = 25.0     # ...or around the city centre when no locality hit
FUZZY_MIN = 0.87
LOCALITY_FUZZY_MIN = 0.84

# Locality strings arrive as free text ("Opp Bsnl Exchange", "Thakur Village,
# Kandivali (E)"). These tokens carry no locating power and are stripped when
# generating fallback candidate keys (the full string is always tried first).
NOISE_TOKENS = {
    "opp", "opposite", "near", "behind", "beside", "next", "to", "building", "bldg",
    "complex", "road", "rd", "street", "st", "lane", "ln", "main", "cross", "layout",
    "extension", "extn", "colony", "east", "west", "north", "south", "e", "w", "n", "s",
    "no", "shop", "floor", "ground", "grd", "above", "below", "inside", "in", "at",
}


# ------------------------------------------------------------------ helpers
def norm(s):
    return re.sub(r"[^a-z0-9]+", "", (s or "").lower())


def norm_tokens(s):
    return re.findall(r"[a-z0-9]+", (s or "").lower())


def trigrams(s):
    return {s[i:i + 3] for i in range(max(1, len(s) - 2))}


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def jitter(seed, radius_deg):
    """Deterministic offset in degrees from a string seed (stable across runs)."""
    h = hashlib.md5(str(seed).encode()).digest()
    dx = (h[0] / 255.0 - 0.5) * 2 * radius_deg
    dy = (h[1] / 255.0 - 0.5) * 2 * radius_deg
    return dx, dy


def parse_env(path):
    env = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            m = re.match(r"\s*([A-Z_]+)\s*=\s*(.+?)\s*$", line)
            if m:
                env[m.group(1)] = m.group(2).strip().strip('"')
    return env


def clean_dsn(url):
    url = url.replace("jdbc:", "", 1)
    url = url.replace("channel_binding=require", "").replace("&&", "&").rstrip("?&")
    return re.match(r"(postgresql://[^?]+)", url).group(1)


def locality_candidates(locality, area):
    """Candidate lookup keys for a locality string, most specific first."""
    out, seen = [], set()

    def add(s):
        k = norm(s)
        if k and k not in seen:
            seen.add(k)
            out.append(k)

    for raw in (locality, area):
        raw = (raw or "").strip()
        if not raw:
            continue
        add(raw)                                   # full string
        add(re.sub(r"\([^)]*\)", " ", raw))        # without "(E)" style markers
        parts = [p.strip() for p in re.split(r"[,()/|]+", raw) if p.strip()]
        for p in parts:
            add(p)                                 # each segment
        for p in parts:
            toks = [t for t in norm_tokens(p) if t not in NOISE_TOKENS]
            add(" ".join(toks))                    # segment minus noise words
            for t in sorted(toks, key=len, reverse=True):
                if len(t) >= 5:
                    add(t)                         # individual significant tokens
    return out


# ----------------------------------------------------------------- load data
def load_osm():
    pois = []
    with gzip.open(OSM_INDEX, "rt", encoding="utf-8") as f:
        for line in f:
            p = json.loads(line)
            p["key"] = norm(p["name"])
            pois.append(p)
    return pois


def load_osm_places():
    by_key = defaultdict(list)
    with gzip.open(OSM_PLACES_INDEX, "rt", encoding="utf-8") as f:
        for line in f:
            p = json.loads(line)
            k = norm(p["name"])
            if k:
                by_key[k].append((p["lat"], p["lon"]))
    return by_key


def load_geonames():
    """key -> list of (lat, lon, accuracy) merged from the full India dump
    (660k places) and the postal dump. Duplicates across India are kept so the
    nearest candidate can be chosen per city (a single-value map once caused
    matches 1,600+ km away)."""
    by_key = defaultdict(list)
    for zip_path in (GEONAMES_FULL_ZIP, GEONAMES_ZIP):
        if not os.path.exists(zip_path):
            continue
        with zipfile.ZipFile(zip_path) as z:
            entries = [n for n in z.namelist() if n.lower().endswith(".txt")]
            name = next((n for n in entries if os.path.basename(n).lower() == "in.txt"),
                        max(entries, key=lambda n: z.getinfo(n).file_size) if entries else None)
            if not name:
                continue
            with z.open(name) as raw:
                for line in io.TextIOWrapper(raw, encoding="utf-8"):
                    parts = line.rstrip("\n").split("\t")
                    if len(parts) >= 19:
                        # Full dump layout: geonameid, name, asciiname, alternatenames,
                        # lat, lon, feature class, feature code, ...
                        if parts[6] not in ("P", "A"):
                            continue  # populated places + admin divisions only
                        ascii_name, local_name = parts[2], parts[1]
                        lat, lon, acc = float(parts[4]), float(parts[5]), 1
                        for cand in (ascii_name, local_name):
                            k = norm(cand)
                            if k:
                                by_key[k].append((lat, lon, acc))
                    elif len(parts) >= 12:
                        # Postal dump layout: country, postal, place, ..., lat, lon, accuracy
                        k = norm(parts[2])
                        if not k:
                            continue
                        try:
                            acc = int(parts[11])
                        except ValueError:
                            acc = 0
                        by_key[k].append((float(parts[9]), float(parts[10]), acc))
    return by_key


def nearest_within(cands, clat, clon, max_km):
    """Nearest (lat, lon) among candidates within max_km, else None."""
    best, best_km = None, max_km
    for lat, lon, *_ in cands:
        d = haversine_km(clat, clon, lat, lon)
        if d <= best_km:
            best, best_km = (lat, lon), d
    return best


def fuzzy_key(k, tri_index, freq, max_len_delta=6):
    """Best trigram-voted fuzzy match for a key, or None.

    India-wide gazetteers make common trigrams ("pur", "kan") huge, so the
    search is bounded: only the query's three RAREST trigrams are consulted and
    each contributes at most a few hundred candidates. Still finds the same
    matches (rare trigrams are the discriminating ones) at a fraction of the
    cost.
    """
    tris = sorted(trigrams(k), key=lambda t: freq.get(t, 0))
    votes = defaultdict(int)
    examined = 0
    for t in tris[:3]:
        postings = tri_index.get(t)
        if not postings:
            continue
        for pk in postings:
            votes[pk] += 1
            examined += 1
            if examined > 3000:
                break
        if examined > 3000:
            break
    best, best_key = 0.0, None
    for pk, _ in sorted(votes.items(), key=lambda kv: -kv[1])[:25]:
        if abs(len(pk) - len(k)) > max_len_delta:
            continue
        r = SequenceMatcher(None, k, pk).ratio()
        if r > best:
            best, best_key = r, pk
    return best_key if best >= LOCALITY_FUZZY_MIN else None


# ------------------------------------------------------------------ matching
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--report", default=DEFAULT_REPORT)
    ap.add_argument("--limit-cities", type=int, default=0)
    args = ap.parse_args()

    for path in (OSM_INDEX, OSM_PLACES_INDEX, GEONAMES_ZIP):
        if not os.path.exists(path):
            sys.exit(f"missing input: {path}")

    print("loading OSM food POIs ...")
    pois = load_osm()
    pois_by_key = defaultdict(list)
    tri_index = defaultdict(set)
    for i, p in enumerate(pois):
        if p["key"]:
            pois_by_key[p["key"]].append(i)
        for t in trigrams(p["key"]):
            tri_index[t].add(i)
    print(f"  {len(pois):,} named food POIs")

    print("loading OSM place gazetteer ...")
    osm_place_by_key = load_osm_places()
    osm_place_tri = defaultdict(set)
    for k in osm_place_by_key:
        for t in trigrams(k):
            osm_place_tri[t].add(k)
    print(f"  {sum(len(v) for v in osm_place_by_key.values()):,} placed records")

    print("loading GeoNames India places ...")
    geo_by_key = load_geonames()
    geo_tri = defaultdict(set)
    for k in geo_by_key:
        for t in trigrams(k):
            geo_tri[t].add(k)
    print(f"  {sum(len(v) for v in geo_by_key.values()):,} place records")

    # trigram document frequency, so the fuzzy search can pick the rarest ones
    osm_place_freq = {t: len(v) for t, v in osm_place_tri.items()}
    geo_freq = {t: len(v) for t, v in geo_tri.items()}

    # Coarse spatial grid (0.5° cells ~ 55 km) so each city only inspects nearby
    # POIs instead of all 48k - the difference between seconds and an hour.
    poi_grid = defaultdict(list)
    for i, p in enumerate(pois):
        poi_grid[(int(math.floor(p["lat"] / 0.5)), int(math.floor(p["lon"] / 0.5)))].append(i)

    def nearby_poi_indices(clat, clon, radius_km):
        ci, cj = int(math.floor(clat / 0.5)), int(math.floor(clon / 0.5))
        out = []
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                for i in poi_grid.get((ci + di, cj + dj), ()):
                    p = pois[i]
                    if haversine_km(clat, clon, p["lat"], p["lon"]) <= radius_km:
                        out.append(i)
        return out

    env = parse_env(ENV_PATH)
    conn = psycopg2.connect(clean_dsn(env["DB_URL"]), user=env["DB_USERNAME"],
                            password=env["DB_PASSWORD"], sslmode="require", connect_timeout=30)
    cur = conn.cursor()
    cur.execute("select city_slug, count(*) from restaurants group by city_slug order by 2 desc")
    cities = cur.fetchall()
    if args.limit_cities:
        cities = cities[:args.limit_cities]

    counts = {"OSM": 0, "LOCALITY": 0, "CITY": 0}
    locality_src = {}
    per_city = {}
    locality_rows, updates = [], []
    samples, loc_samples = [], []

    for city_slug, total in cities:
        cur.execute("""
            select id, external_id, name, locality, area,
                   latitude::float8, longitude::float8
            from restaurants where city_slug = %s
        """, (city_slug,))
        rows = cur.fetchall()
        if not rows:
            continue
        valid = [(r[5], r[6]) for r in rows if r[5] is not None and r[6] is not None]
        clat = sum(v[0] for v in valid) / len(valid) if valid else 0.0
        clon = sum(v[1] for v in valid) / len(valid) if valid else 0.0

        # candidate food POIs for this city (spatial grid + distance)
        near = nearby_poi_indices(clat, clon, CITY_PREFILTER_KM)
        near_set = set(near)

        city_counts = {"OSM": 0, "LOCALITY": 0, "CITY": 0}
        loc_cache = {}

        def resolve_locality(locality, area):
            """(lat, lon, source, matched_key) or None - nearest gazetteer place
            within LOCALITY_RADIUS_KM of the city centre."""
            keys = locality_candidates(locality, area)
            for k in keys:
                if k in loc_cache:
                    if loc_cache[k]:
                        return loc_cache[k]
                    continue
                hit = None
                cands = osm_place_by_key.get(k)
                if cands:
                    p = nearest_within([(la, lo) for la, lo in cands], clat, clon, LOCALITY_RADIUS_KM)
                    if p:
                        hit = (p[0], p[1], "OSM", k)
                if not hit:
                    cands = geo_by_key.get(k)
                    if cands:
                        p = nearest_within(cands, clat, clon, LOCALITY_RADIUS_KM)
                        if p:
                            hit = (p[0], p[1], "GEONAMES", k)
                loc_cache[k] = hit
                if hit:
                    return hit
            # fuzzy pass: OSM places, then GeoNames
            for k in keys:
                if len(k) < 6:
                    continue
                for source, tri, freq, by_key in (("OSM", osm_place_tri, osm_place_freq, osm_place_by_key),
                                                  ("GEONAMES", geo_tri, geo_freq, geo_by_key)):
                    fk = fuzzy_key(k, tri, freq)
                    if not fk:
                        continue
                    cands = [(la, lo) for la, lo, *_ in by_key.get(fk, [])]
                    p = nearest_within(cands, clat, clon, LOCALITY_RADIUS_KM)
                    if p:
                        return (p[0], p[1], source, fk)
            return None

        for rid, ext, name, locality, area, lat, lon in rows:
            loc = resolve_locality(locality, area)
            ref_lat, ref_lon = (loc[0], loc[1]) if loc else (clat, clon)
            cap = OSM_NEAR_LOCALITY_KM if loc else OSM_NEAR_CITY_KM

            key = norm(name)
            match = None

            # tier 1a: exact normalised name, nearest to the reference point
            cands = [i for i in pois_by_key.get(key, []) if i in near_set]
            best, best_km = None, cap
            for i in cands:
                p = pois[i]
                d = haversine_km(ref_lat, ref_lon, p["lat"], p["lon"])
                if d <= best_km:
                    best, best_km = i, d
            if best is not None:
                match = pois[best]

            # tier 1b: fuzzy, trigram-prefiltered, same cap
            if match is None and len(key) >= 6:
                votes = defaultdict(int)
                for t in trigrams(key):
                    for i in tri_index.get(t, ()):
                        votes[i] += 1
                best_ratio, best_i, best_km = 0.0, None, cap
                for i, _ in sorted(votes.items(), key=lambda kv: -kv[1])[:40]:
                    if i not in near_set:
                        continue
                    p = pois[i]
                    d = haversine_km(ref_lat, ref_lon, p["lat"], p["lon"])
                    if d > best_km:
                        continue
                    r = SequenceMatcher(None, key, p["key"]).ratio()
                    if r > best_ratio:
                        best_ratio, best_i, best_km = r, i, d
                if best_i is not None and best_ratio >= FUZZY_MIN:
                    match = pois[best_i]

            if match is not None:
                dx, dy = jitter(ext, 0.0002)
                updates.append((rid, round(match["lat"] + dy, 6), round(match["lon"] + dx, 6),
                                "OSM", match["name"]))
                counts["OSM"] += 1
                city_counts["OSM"] += 1
                if len(samples) < 15:
                    samples.append({"city": city_slug, "ours": name, "osm": match["name"],
                                    "km_from_ref": round(best_km, 2)})
                continue

            if loc:
                glat, glon, src, matched_key = loc
                dx, dy = jitter(ext, 0.004)
                updates.append((rid, round(glat + dy, 6), round(glon + dx, 6),
                                "LOCALITY", matched_key[:255]))
                if src == "GEONAMES":
                    locality_rows.append((city_slug, matched_key[:255], glat, glon, "GEONAMES"))
                locality_src[src] = locality_src.get(src, 0) + 1
                counts["LOCALITY"] += 1
                city_counts["LOCALITY"] += 1
                if len(loc_samples) < 20:
                    loc_samples.append({"city": city_slug, "ours": f"{locality or ''} / {area or ''}".strip(" /"),
                                        "matched": matched_key, "source": src,
                                        "km_from_city": round(haversine_km(clat, clon, glat, glon), 2)})
                continue

            # tier 3: city point, jittered so pins don't stack
            dx, dy = jitter(ext, 0.008)
            updates.append((rid, round(clat + dy, 6), round(clon + dx, 6), "CITY", None))
            counts["CITY"] += 1
            city_counts["CITY"] += 1

        per_city[city_slug] = {"total": total, **city_counts}
        print(f"  {city_slug:<22} {total:>5} -> OSM {city_counts['OSM']:>4} | "
              f"LOCALITY {city_counts['LOCALITY']:>5} | CITY {city_counts['CITY']:>5}")

    dedup_locality = list({(r[0], r[1]): r for r in locality_rows}.values())

    if args.dry_run:
        conn.rollback()
        print("\nDRY RUN - nothing written")
    else:
        cur.execute("""
            CREATE TEMP TABLE coord_updates (
                id uuid PRIMARY KEY, lat numeric(9,6), lon numeric(9,6),
                src varchar(20), mname varchar(255)
            ) ON COMMIT DROP
        """)
        execute_values(cur, "INSERT INTO coord_updates (id, lat, lon, src, mname) VALUES %s",
                       updates, page_size=5000)
        cur.execute("""
            UPDATE restaurants r
            SET latitude = u.lat, longitude = u.lon,
                coords_source = u.src, coords_matched_name = u.mname,
                coords_updated_at = now()
            FROM coord_updates u
            WHERE r.id = u.id
        """)
        execute_values(cur, """
            INSERT INTO locality_coords (city_slug, locality, latitude, longitude, source, created_at)
            VALUES %s ON CONFLICT (city_slug, locality) DO NOTHING
        """, dedup_locality, page_size=2000,
            template="(%s, %s, %s, %s, %s, now())")
        conn.commit()

    total_rows = sum(c[1] for c in cities)
    print("\n=== coordinate provenance ===")
    for src in ("OSM", "LOCALITY", "CITY"):
        n = counts[src]
        print(f"  {src:<9} {n:>7,}  ({100 * n / max(total_rows, 1):5.1f}%)")
    print(f"  {'TOTAL':<9} {total_rows:>7,}")
    if locality_src:
        split = " · ".join(f"{k} {v:,}" for k, v in sorted(locality_src.items(), key=lambda kv: -kv[1]))
        print(f"  locality tier source: {split}")

    report = {"totals": counts, "locality_sources": locality_src, "per_city": per_city,
              "samples": samples, "locality_samples": loc_samples}
    with open(args.report, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=1)
    print(f"report -> {args.report}")
    conn.close()


if __name__ == "__main__":
    main()
