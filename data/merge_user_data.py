"""Merge an exported account backup (export_user_data.py) into the NEW database
pointed at by backend/.env, after the catalog was rebuilt with fresh UUIDs.

What it reconciles:
  * restaurants - old ids are remapped onto the new rows by external_id
    (the stable Swiggy id); any old restaurant without a match is dropped.
  * users - matched by email. If you already signed up again on the new site,
    that (new) account wins and old reviews/comments are re-pointed onto it.
    Otherwise the old account is restored verbatim, password hash included, so
    the original login keeps working.
  * reviews, comments, votes, saved_restaurants, notifications, reports and
    user_addresses - inserted with their original ids. Anything whose parent
    was skipped (missing restaurant, superseded review) is skipped too, and
    duplicates that already exist on the new side (same user reviewed the same
    restaurant, same vote, same save, same report) are left alone.

Dry run by default - pass --commit to write. All writes happen in one
transaction, so a failure changes nothing. Re-running is safe (id conflicts are
ignored), so a --commit run can be repeated after fixing an input.

Usage:
    python merge_user_data.py --in data/_old_user_data.json            # dry run
    python merge_user_data.py --in data/_old_user_data.json --commit
"""
import argparse
import json
import os
import re
import sys

import psycopg2

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEW_ENV = os.path.join(REPO, "backend", ".env")
DEFAULT_IN = os.path.join(REPO, "data", "_old_user_data.json")

COLUMNS = {
    "users": ["id", "name", "email", "password_hash", "display_mode",
              "notify_on_review_reply", "notify_on_comment_reply", "created_at"],
    "reviews": ["id", "user_id", "restaurant_id", "rating", "content", "created_at", "edited_at"],
    "comments": ["id", "review_id", "user_id", "parent_comment_id", "content", "created_at",
                 "edited_at", "is_deleted", "deleted_at"],
    "votes": ["id", "user_id", "votable_type", "votable_id", "vote_value", "created_at"],
    "saved_restaurants": ["id", "user_id", "restaurant_id", "created_at"],
    "notifications": ["id", "user_id", "type", "actor_id", "comment_id", "restaurant_id",
                      "restaurant_name", "actor_name", "reply_preview", "read_at", "created_at"],
    "reports": ["id", "reporter_id", "target_type", "target_id", "reason", "status", "created_at"],
    "user_addresses": ["id", "user_id", "label", "address_line", "locality", "city_name",
                       "city_slug", "latitude", "longitude", "is_default", "created_at"],
}


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


class Merge:
    def __init__(self, cur):
        self.cur = cur
        self.counts = {}

    def note(self, table, inserted=0, skipped=0):
        c = self.counts.setdefault(table, {"inserted": 0, "skipped": 0})
        c["inserted"] += inserted
        c["skipped"] += skipped

    def insert_counting(self, table, rows):
        """Insert rows and count actual inserts using RETURNING id."""
        if not rows:
            return 0
        cols = COLUMNS[table]
        placeholders = ", ".join(["%s"] * len(cols))
        sql = (f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({placeholders}) "
               f"ON CONFLICT (id) DO NOTHING RETURNING id")
        inserted = 0
        for row in rows:
            self.cur.execute(sql, [row.get(c) for c in cols])
            if self.cur.fetchone():
                inserted += 1
        return inserted


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="backup", default=DEFAULT_IN)
    ap.add_argument("--commit", action="store_true", help="write changes (default: dry run)")
    args = ap.parse_args()

    if not os.path.exists(args.backup):
        sys.exit(f"Backup not found: {args.backup} (run export_user_data.py first)")
    with open(args.backup, encoding="utf-8") as f:
        backup = json.load(f)
    tables = backup.get("tables", {})
    old_restaurant_pairs = backup.get("restaurant_ids", [])
    if not tables:
        sys.exit("Backup has no tables - is this the right file?")

    env = parse_env(NEW_ENV)
    conn = psycopg2.connect(clean_dsn(env["DB_URL"]), user=env["DB_USERNAME"],
                            password=env["DB_PASSWORD"], sslmode="require", connect_timeout=25)
    conn.autocommit = False
    cur = conn.cursor()
    m = Merge(cur)

    # ---- 1. restaurant id remap (old uuid -> new uuid via external_id) ----
    cur.execute("SELECT external_id, id FROM restaurants WHERE external_id IS NOT NULL")
    new_by_ext = {ext: str(rid) for ext, rid in cur.fetchall()}
    rest_map, missing_rest = {}, 0
    for pair in old_restaurant_pairs:
        new_id = new_by_ext.get(str(pair["external_id"]))
        if new_id:
            rest_map[str(pair["id"])] = new_id
        else:
            missing_rest += 1

    # ---- 2. users: match by email, else restore the original account ----
    cur.execute("SELECT id, lower(email) FROM users")
    new_by_email = {email: str(uid) for uid, email in cur.fetchall()}
    new_user_ids = set(new_by_email.values())
    user_map, user_rows, matched = {}, [], 0
    for u in tables.get("users", []):
        key = (u.get("email") or "").lower()
        if key and key in new_by_email:
            user_map[str(u["id"])] = new_by_email[key]
            matched += 1
        else:
            user_map[str(u["id"])] = str(u["id"])
            user_rows.append(u)
            new_by_email[key] = str(u["id"])
    inserted_users = m.insert_counting("users", user_rows) if args.commit else len(user_rows)
    m.note("users", inserted=inserted_users, skipped=matched)

    # ---- 3. reviews (skip missing restaurant/user; keep newer duplicate) ----
    cur.execute("SELECT user_id, restaurant_id FROM reviews")
    existing_review_keys = {(str(u), str(r)) for u, r in cur.fetchall()}
    cur.execute("SELECT id FROM reviews")
    new_review_ids = {str(r) for r, in cur.fetchall()}
    review_rows, skipped_reviews, dropped_reviews = [], set(), 0
    for r in tables.get("reviews", []):
        new_rest = rest_map.get(str(r["restaurant_id"]))
        new_user = user_map.get(str(r["user_id"]))
        if not new_rest or not new_user:
            skipped_reviews.add(str(r["id"]))
            dropped_reviews += 1
        elif (new_user, new_rest) in existing_review_keys:
            skipped_reviews.add(str(r["id"]))
            dropped_reviews += 1
        else:
            row = dict(r)
            row["user_id"], row["restaurant_id"] = new_user, new_rest
            review_rows.append(row)
    inserted_reviews = m.insert_counting("reviews", review_rows) if args.commit else len(review_rows)
    m.note("reviews", inserted=inserted_reviews, skipped=dropped_reviews)
    merged_review_ids = {str(r["id"]) for r in review_rows} | new_review_ids

    # ---- 4. comments (parents before children; skip orphaned threads) ----
    comment_rows, skipped_comments = [], 0
    for c in sorted(tables.get("comments", []), key=lambda c: str(c.get("created_at"))):
        new_user = user_map.get(str(c["user_id"]))
        if str(c["review_id"]) not in merged_review_ids or not new_user:
            skipped_comments += 1
            continue
        row = dict(c)
        row["user_id"] = new_user
        comment_rows.append(row)
    inserted_comments = m.insert_counting("comments", comment_rows) if args.commit else len(comment_rows)
    m.note("comments", inserted=inserted_comments, skipped=skipped_comments)
    cur.execute("SELECT id FROM comments")
    merged_comment_ids = {str(c["id"]) for c in comment_rows} | {str(c) for c, in cur.fetchall()}

    # ---- 5. votes (dedupe on user+votable; skip dangling targets) ----
    cur.execute("SELECT user_id, votable_type, votable_id FROM votes")
    existing_votes = {(str(u), t, str(v)) for u, t, v in cur.fetchall()}
    vote_rows, skipped_votes = [], 0
    for v in tables.get("votes", []):
        new_user = user_map.get(str(v["user_id"]))
        target_ok = (str(v["votable_id"]) in merged_review_ids if v["votable_type"] == "REVIEW"
                     else str(v["votable_id"]) in merged_comment_ids)
        if not new_user or not target_ok or (new_user, v["votable_type"], str(v["votable_id"])) in existing_votes:
            skipped_votes += 1
            continue
        row = dict(v)
        row["user_id"] = new_user
        vote_rows.append(row)
    inserted_votes = m.insert_counting("votes", vote_rows) if args.commit else len(vote_rows)
    m.note("votes", inserted=inserted_votes, skipped=skipped_votes)

    # ---- 6. saved restaurants (dedupe on user+restaurant) ----
    cur.execute("SELECT user_id, restaurant_id FROM saved_restaurants")
    existing_saves = {(str(u), str(r)) for u, r in cur.fetchall()}
    save_rows, skipped_saves = [], 0
    for s in tables.get("saved_restaurants", []):
        new_user = user_map.get(str(s["user_id"]))
        new_rest = rest_map.get(str(s["restaurant_id"]))
        if not new_user or not new_rest or (new_user, new_rest) in existing_saves:
            skipped_saves += 1
            continue
        row = dict(s)
        row["user_id"], row["restaurant_id"] = new_user, new_rest
        save_rows.append(row)
    inserted_saves = m.insert_counting("saved_restaurants", save_rows) if args.commit else len(save_rows)
    m.note("saved_restaurants", inserted=inserted_saves, skipped=skipped_saves)

    # ---- 7. notifications (skip when their comment/restaurant is gone) ----
    notif_rows, skipped_notifs = [], 0
    for n in tables.get("notifications", []):
        new_user = user_map.get(str(n["user_id"]))
        new_actor = user_map.get(str(n["actor_id"])) if n.get("actor_id") else None
        new_rest = rest_map.get(str(n["restaurant_id"])) if n.get("restaurant_id") else None
        comment_ok = str(n["comment_id"]) in merged_comment_ids
        if not new_user or not comment_ok or (n.get("restaurant_id") and not new_rest):
            skipped_notifs += 1
            continue
        row = dict(n)
        row["user_id"], row["actor_id"], row["restaurant_id"] = new_user, new_actor, new_rest
        notif_rows.append(row)
    inserted_notifs = m.insert_counting("notifications", notif_rows) if args.commit else len(notif_rows)
    m.note("notifications", inserted=inserted_notifs, skipped=skipped_notifs)

    # ---- 8. reports (dedupe on reporter+target; skip dangling targets) ----
    cur.execute("SELECT reporter_id, target_type, target_id FROM reports")
    existing_reports = {(str(r), t, str(i)) for r, t, i in cur.fetchall()}
    report_rows, skipped_reports = [], 0
    for r in tables.get("reports", []):
        new_reporter = user_map.get(str(r["reporter_id"]))
        target_ok = (str(r["target_id"]) in merged_review_ids if r["target_type"] == "REVIEW"
                     else str(r["target_id"]) in merged_comment_ids)
        if not new_reporter or not target_ok or (new_reporter, r["target_type"], str(r["target_id"])) in existing_reports:
            skipped_reports += 1
            continue
        row = dict(r)
        row["reporter_id"] = new_reporter
        report_rows.append(row)
    inserted_reports = m.insert_counting("reports", report_rows) if args.commit else len(report_rows)
    m.note("reports", inserted=inserted_reports, skipped=skipped_reports)

    # ---- 9. addresses ----
    addr_rows, skipped_addr = [], 0
    for a in tables.get("user_addresses", []):
        new_user = user_map.get(str(a["user_id"]))
        if not new_user:
            skipped_addr += 1
            continue
        row = dict(a)
        row["user_id"] = new_user
        addr_rows.append(row)
    inserted_addr = m.insert_counting("user_addresses", addr_rows) if args.commit else len(addr_rows)
    m.note("user_addresses", inserted=inserted_addr, skipped=skipped_addr)

    if args.commit:
        conn.commit()
    else:
        conn.rollback()
    conn.close()

    mode = "COMMITTED" if args.commit else "DRY RUN (nothing written - pass --commit to apply)"
    print(f"=== merge {mode} ===")
    for table, c in m.counts.items():
        print(f"  {table:<20} insert {c['inserted']:>5} | skipped {c['skipped']:>5}")
    users_matched = m.counts.get("users", {}).get("skipped", 0)
    if users_matched:
        print(f"  note: {users_matched} account(s) matched an existing email - their old content was re-pointed to the new account.")
    if missing_rest:
        print(f"  note: {missing_rest} old restaurant(s) had no external_id match and were dropped.")


if __name__ == "__main__":
    main()
