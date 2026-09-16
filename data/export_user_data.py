"""Export the account-side data from the ORIGINAL Neon database to a JSON backup.

Dumps users, reviews, comments, votes, saved_restaurants, notifications,
reports and user_addresses, plus the old restaurants (id, external_id) pairs
that merge_user_data.py needs to remap restaurant ids onto the rebuilt catalog
(the new project generated fresh UUIDs; external_id is the stable key).

The original project is suspended on the free-plan compute-time quota until its
monthly reset, or until it is briefly moved to a paid plan, so this script will
refuse to connect until then - that is expected, not a bug.

Usage:
    python export_user_data.py                      # reads "backend env.txt"
    python export_user_data.py --old-env <file> --out data/_old_user_data.json
"""
import argparse
import json
import os
import re
import sys

import psycopg2
from psycopg2.extras import RealDictCursor

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_OLD_ENV = os.path.join(REPO, "backend env.txt")
DEFAULT_OUT = os.path.join(REPO, "data", "_old_user_data.json")

TABLES = [
    "users",
    "reviews",
    "comments",
    "votes",
    "saved_restaurants",
    "notifications",
    "reports",
    "user_addresses",
]


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
    m = re.match(r"(postgresql://[^?]+)", url)
    if not m:
        sys.exit(f"Unexpected DB_URL format: {url[:60]}...")
    return m.group(1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--old-env", default=DEFAULT_OLD_ENV,
                    help='the ORIGINAL project .env snapshot (default: "backend env.txt")')
    ap.add_argument("--out", default=DEFAULT_OUT)
    args = ap.parse_args()

    if not os.path.exists(args.old_env):
        sys.exit(f"Old credentials file not found: {args.old_env}")
    env = parse_env(args.old_env)
    for key in ("DB_URL", "DB_USERNAME", "DB_PASSWORD"):
        if not env.get(key):
            sys.exit(f"{args.old_env} is missing {key}")

    try:
        conn = psycopg2.connect(
            clean_dsn(env["DB_URL"]),
            user=env["DB_USERNAME"],
            password=env["DB_PASSWORD"],
            sslmode="require",
            connect_timeout=25,
        )
    except psycopg2.OperationalError as e:
        message = str(e).strip()
        if "compute time quota" in message:
            sys.exit(
                "The original project is still suspended on its compute-time quota.\n"
                "Either wait for the monthly reset (Neon console -> Billing shows the date)\n"
                "or briefly upgrade that project to a paid plan, then re-run this export."
            )
        sys.exit(f"Could not connect to the original database: {message}")

    backup = {"tables": {}, "restaurant_ids": []}
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        for table in TABLES:
            cur.execute(f"SELECT * FROM {table}")
            backup["tables"][table] = [dict(row) for row in cur.fetchall()]
        cur.execute("SELECT id, external_id FROM restaurants WHERE external_id IS NOT NULL")
        backup["restaurant_ids"] = [dict(row) for row in cur.fetchall()]
    conn.close()

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(backup, f, indent=1, default=str)

    print(f"Wrote {args.out}")
    for table in TABLES:
        print(f"  {table:<20} {len(backup['tables'][table]):>6,} rows")
    print(f"  {'restaurant_ids':<20} {len(backup['restaurant_ids']):>6,} rows (external_id map)")


if __name__ == "__main__":
    main()
