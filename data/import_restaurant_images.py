"""One-off importer for restaurant imagery into Postgres (Neon).

Resolves every restaurant an image via the chain:
  1. DIRECT             - own image from restaurant_images_final.csv (status=matched)
  2. BRANCH_FALLBACK    - same normalized name, image borrowed from another row
                          that has a DIRECT image (best-rated wins)
  3. CUISINE_PLACEHOLDER - a real photo from the best-rated restaurant sharing the
                          same cuisine bucket (falls back to that bucket's SVG
                          tile only if the bucket has no photo at all)
  4. NONE               - generic restaurant placeholder tile (no cuisine matched)

Safe to re-run: DIRECT phase always refreshes from the CSV; fallback phases
only touch rows still missing an image. `--reset` clears non-DIRECT values
first so the chain can be re-derived from scratch.

Usage:
    python import_restaurant_images.py [--phase all|direct|branch|cuisine|report]
                                       [--reset] [--dry-run]

DSN is read from backend/.env (DB_URL/DB_USERNAME/DB_PASSWORD) like the app.
Prints per-phase + final counts by image_source.
"""
import argparse
import os
import re
import sys

import psycopg2
from psycopg2.extras import execute_batch

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(REPO, "restaurant images", "restaurant_images_final.csv")
ENV_PATH = os.path.join(REPO, "backend", ".env")
PLACEHOLDER_DIR = "/images/cuisine"


# ---------------------------------------------------------------- config ----
def clean_dsn(url):
    """jdbc:postgresql://host:5432/db?params -> postgresql://host:5432/db (psycopg form)."""
    url = url.replace("jdbc:", "", 1)
    url = url.replace("channel_binding=require", "").replace("&&", "&").rstrip("?&")
    m = re.match(r"(postgresql://[^?]+)", url)
    if not m:
        sys.exit(f"Unexpected DB_URL format: {url[:40]}...")
    return m.group(1)


def connect():
    env = {}
    with open(ENV_PATH, encoding="utf-8") as f:
        for line in f:
            m = re.match(r"([A-Z_]+)=(.*)", line.strip())
            if m:
                env[m.group(1)] = m.group(2).strip().strip('"')
    if not env.get("DB_URL"):
        sys.exit("backend/.env missing DB_URL")
    return psycopg2.connect(
        clean_dsn(env["DB_URL"]),
        user=env["DB_USERNAME"],
        password=env["DB_PASSWORD"],
        sslmode="require",
        connect_timeout=30,
    )


# ------------------------------------------------------------ imagery ----
def norm(name):
    """Brand key: lowercase, drop non-alphanumerics entirely (matches finalize.py)."""
    return re.sub(r"[^a-z0-9]+", "", (name or "").lower())


def brand_key(name, locality, city):
    """Normalized name with trailing locality/city qualifier words removed."""
    n = (name or "").lower()
    n = re.split(r"[-–(]|\b(?:at|near|in|nearby|branch)\b", n)[0]  # "KFC - Malout Rd" -> "KFC"
    toks = re.findall(r"[a-z0-9]+", n)
    places = set()
    for p in (locality, city):
        places.update(re.findall(r"[a-z0-9]+", (p or "").lower()))
    while toks and toks[-1] in places:
        toks.pop()
    return re.sub(r"[^a-z0-9]+", "", "".join(toks))


# primary cuisine -> curated placeholder bucket. Ordered rules; first match wins.
CUISINE_BUCKETS = [
    (("biryani", "biriyani"), "biryani"),
    (("dosa", "idli", "vada", "uttapam", "appam", "south indian"), "south-indian"),
    (("momo", "mandurian", "manchurian", "noodle", "chinese", "szechwan", "tibetan", "pasta", "ramen"), "chinese"),
    (("pizza",), "pizza"),
    (("burger",), "burger"),
    (("ice cream", "icely", "kulfi"), "ice-cream"),
    (("cake", "bakery", "pastry", "patisserie", "croissant", "donut", "cupcake"), "bakery"),
    (("dessert", "sweet", "mithai", "gulab", "halwa", "waffle", "pancake"), "dessert"),
    (("coffee", "cafe", "café", "tea", "juice", "shake", "smoothie", "beverage", "cold drink", "bubble tea"), "cafe"),
    (("roll", "kathi"), "rolls"),
    (("kebab", "tandoor", "bbq", "grill", "barbecue"), "grill"),
    (("seafood", "fish", "prawn", "crab", "coastal"), "seafood"),
    (("thali", "combo", "meal"), "thali"),
    (("sandwich", "sub", "wrap", "burrito", "taco", "mexican"), "sandwich"),
    (("paratha", "chole", "bhature", "pav", "vada pav", "mishti"), "street-indian"),
    (("north indian", "punjabi", "hindi", "curry", "indian", "rajasthani", "maha", "gujarati"), "north-indian"),
    (("fast food", "snack", "street food", "fried chicken", "sides"), "fast-food"),
]

GENERIC = "generic"


def cuisine_bucket(cuisine):
    c = (cuisine or "").lower()
    for needles, bucket in CUISINE_BUCKETS:
        if any(n in c for n in needles):
            return bucket
    return None


def bucket_representative_photos(conn, rows):
    """Best (highest-rated) DIRECT photo per cuisine bucket, from real restaurants.
    Used to satisfy "no image -> image of a restaurant with the same cuisine"."""
    with conn.cursor() as cur:
        cur.execute("""select external_id, image_url, coalesce(total_ratings, 0)
                       from restaurants
                       where image_source = 'DIRECT' and image_url is not null and image_url <> ''""")
        best = {}
        for ext, url, rating in cur:
            meta = rows.get(str(ext))
            if not meta:
                continue
            bucket = cuisine_bucket(meta["first_cuisine"])
            if bucket and (bucket not in best or rating > best[bucket][1]):
                best[bucket] = (url, rating)
        return {k: v[0] for k, v in best.items()}


def load_csv():
    """rid -> {status, image_url, name, locality, city, first_cuisine} (first row wins)."""
    import csv

    first = {}
    with open(CSV_PATH, encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            rid = (r.get("restaurant_id") or "").strip()
            if not rid or rid in first:
                continue
            cuis = (r.get("cuisines") or "").split("|")
            first[rid] = {
                "status": (r.get("status") or "").strip(),
                "image_url": (r.get("image_url") or "").strip(),
                "name": (r.get("name") or "").strip(),
                "locality": (r.get("locality") or "").strip(),
                "city": (r.get("city_name") or "").strip(),
                "first_cuisine": (cuis[0].strip() if cuis else ""),
            }
    return first


# ------------------------------------------------------------- phases ----
def phase_direct(conn, rows, dry):
    pairs = [(r["image_url"], rid) for rid, r in rows.items()
             if r["status"] == "matched" and r["image_url"]]
    if not dry:
        with conn.cursor() as cur:
            execute_batch(
                cur,
                """UPDATE restaurants SET image_url = %s, image_source = 'DIRECT'
                   WHERE external_id = %s""",
                pairs,
                page_size=2000,
            )
        conn.commit()
    total = count_total(conn)
    print(f"[direct ] own-image rows written: {len(pairs):,} / total restaurants: {total:,} "
          f"({100 * len(pairs) / total:.1f}%)")


def phase_branch(conn, rows, dry):
    """Restaurants still missing an image borrow the best-rated branch's DIRECT photo."""
    with conn.cursor() as cur:
        cur.execute("select id, external_id, name, locality, city_name from restaurants "
                    "where image_url is null or image_url = ''")
        missing = cur.fetchall()
        cur.execute("""select name, image_url, coalesce(total_ratings, 0)
                       from restaurants where image_source = 'DIRECT'
                         and image_url is not null and image_url <> ''""")
        direct_rows = cur.fetchall()

    # best image per brand key across DIRECT rows (ties: highest total_ratings)
    best = {}
    for name, url, rating in direct_rows:
        k = norm(name)
        if k and (k not in best or rating > best[k][1]):
            best[k] = (url, rating)

    updates = []
    for _id, ext, name, locality, city in missing:
        k = norm(name)
        hit = best.get(k)
        # also try the location-stripped brand key
        if not hit:
            hit = best.get(brand_key(name, locality, city))
        if hit:
            updates.append((hit[0], _id))

    if not dry:
        with conn.cursor() as cur:
            execute_batch(
                cur,
                """UPDATE restaurants SET image_url = %s, image_source = 'BRANCH_FALLBACK'
                   WHERE id = %s""",
                updates,
                page_size=2000,
            )
        conn.commit()
    print(f"[branch ] filled from a same-name branch: {len(updates):,} "
          f"(of {len(missing):,} missing)")


def phase_cuisine(conn, rows, dry):
    """Everything left: same-cuisine real photo (best-rated DIRECT holder of that
    cuisine bucket) -> else the bucket's SVG tile -> else generic tile (NONE)."""
    with conn.cursor() as cur:
        cur.execute("select id, external_id from restaurants "
                    "where image_url is null or image_url = ''")
        missing = cur.fetchall()

    reps = bucket_representative_photos(conn, rows)
    by_id = {rid: r for rid, r in rows.items()}
    updates, bucket_counts = [], {}
    for _id, ext in missing:
        meta = by_id.get(str(ext))
        bucket = cuisine_bucket(meta["first_cuisine"]) if meta else None
        if bucket:
            url = reps.get(bucket)
            src = "CUISINE_PLACEHOLDER"
            kind = f"{bucket}:photo" if url else f"{bucket}:tile"
            url = url or f"{PLACEHOLDER_DIR}/{bucket}.svg"
        else:
            url = f"{PLACEHOLDER_DIR}/{GENERIC}.svg"
            src = "NONE"
            kind = GENERIC
        updates.append((url, src, _id))
        bucket_counts[kind] = bucket_counts.get(kind, 0) + 1

    if not dry:
        with conn.cursor() as cur:
            execute_batch(
                cur,
                """UPDATE restaurants SET image_url = %s, image_source = %s
                   WHERE id = %s""",
                updates,
                page_size=2000,
            )
        conn.commit()
    photo = sum(n for k, n in bucket_counts.items() if k.endswith(":photo"))
    tile = sum(n for k, n in bucket_counts.items() if k.endswith(":tile"))
    print(f"[cuisine] same-cuisine real photos: {photo:,} · bucket tiles: {tile:,} · "
          f"generic (NONE): {bucket_counts.get(GENERIC, 0):,}")
    for k, n in sorted(bucket_counts.items(), key=lambda x: -x[1])[:22]:
        print(f"          {k:<24} {n:,}")


def report(conn):
    with conn.cursor() as cur:
        cur.execute("""select image_source, count(*) from restaurants
                       group by image_source order by 2 desc""")
        print("\n=== final counts by image_source ===")
        for src, n in cur.fetchall():
            print(f"  {src:<18} {n:,}")
        cur.execute("select count(*) from restaurants where image_url is null or image_url = ''")
        print(f"  {'NO IMAGE':<18} {cur.fetchone()[0]:,}  (expected 0)")


def count_total(conn):
    with conn.cursor() as cur:
        cur.execute("select count(*) from restaurants")
        return cur.fetchone()[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--phase", default="all",
                    choices=["all", "direct", "branch", "cuisine", "report"])
    ap.add_argument("--reset", action="store_true",
                    help="clear all image values first so the chain re-derives cleanly")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    rows = load_csv()
    print(f"CSV restaurants: {len(rows):,}")
    conn = connect()

    if args.reset and not args.dry_run:
        with conn.cursor() as cur:
            cur.execute("UPDATE restaurants SET image_url = NULL, image_source = 'NONE'")
        conn.commit()
        print("[reset] cleared all image values")

    if args.phase in ("all", "direct"):
        phase_direct(conn, rows, args.dry_run)
    if args.phase in ("all", "branch"):
        phase_branch(conn, rows, args.dry_run)
    if args.phase in ("all", "cuisine"):
        phase_cuisine(conn, rows, args.dry_run)
    report(conn)
    conn.close()


if __name__ == "__main__":
    main()
