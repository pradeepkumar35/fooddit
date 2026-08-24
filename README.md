# Fooddit

Restaurant discovery + reviews with Reddit-style threaded discussions.

- **Backend**: Spring Boot 3.5 (Java 21), JPA/Hibernate, Flyway migrations, JWT auth
- **Frontend**: React 18 + Vite + Tailwind, Vitest + Testing Library
- **Database**: PostgreSQL in production (Neon free tier), in-memory H2 (PostgreSQL mode) for local dev

## Repository layout

```
backend/   Spring Boot API (port 8080)
frontend/  React SPA (Vite, port 5173)
data/      Large raw datasets (gitignored, local import source only)
```

## Prerequisites

- Java 21 (e.g. Microsoft OpenJDK). Maven 3.9+ or use `backend/mvnw.cmd`
- Node 18+ (for the frontend)

## Run locally

A plain `Run` in IntelliJ IDEA (or `.\mvnw.cmd spring-boot:run` below) connects
straight to the Neon PostgreSQL database: the backend auto-loads `backend/.env`
(`spring.config.import`) and defaults to the `prod` profile, so no env vars need
to be entered in the run configuration. If `backend/.env` is missing, the app
fails fast — copy the sample below.

For a zero-install demo instead of Neon, add `SPRING_PROFILES_ACTIVE=dev` to the
run config (or set it in your shell): that profile uses an in-memory H2 database
seeded with a few sample restaurants.

```powershell
# terminal 1 — backend (http://localhost:8080)
cd backend
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.7.6-hotspot"
.\mvnw.cmd spring-boot:run

# terminal 2 — frontend (http://localhost:5173)
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to the backend on port 8080.

## PostgreSQL on Neon (free tier)

1. Create a free account/project at <https://neon.tech>. Neon's free ("Launch")
   plan includes ~512 MB storage, serverless autosuspend, and one database.
2. In the dashboard, open **Connection details** and copy the pooled or direct
   connection string:
   `postgresql://USER:PASSWORD@HOST/dbname?sslmode=require`
3. Create `backend/.env` (gitignored) with your connection — the backend loads
   it automatically at startup, so nothing needs to be set in the shell or the
   IntelliJ run configuration:

   | Variable          | Example                                              |
   |-------------------|------------------------------------------------------|
   | `DB_URL`          | `jdbc:postgresql://HOST:5432/dbname?sslmode=require` |
   | `DB_USERNAME`     | `<user>`                                             |
   | `DB_PASSWORD`     | `<password>`                                         |
   | `JWT_SECRET`      | a random string ≥ 32 bytes (HS256)                   |
   | `CORS_ALLOWED_ORIGINS` | comma-separated frontend origins                |
   | `PORT`            | `8080`                                               |

   Note: Neon's `DB_URL` connection string is `postgresql://...` — set
   `DB_URL` to a full `jdbc:postgresql://...` JDBC URL (or use
   `jdbc:postgresql://host/db`; the JDBC driver accepts the host form).

4. Run the backend — it picks up `.env` and the `prod` profile automatically:

   ```powershell
   cd backend
   $env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.7.6-hotspot"
   .\mvnw.cmd spring-boot:run
   ```

   On first boot Flyway migrates the empty Neon database (`V1__init.sql`, ...).
   Sanity-check connectivity:

   ```powershell
   Invoke-RestMethod "http://localhost:8080/api/cities" | ConvertTo-Json
   ```

   For production deployment (Render/Railway/etc.) set the same variables as
   environment variables in the hosting dashboard instead of `.env`.

### Flyway — schema management

Hibernate `ddl-auto` is disabled everywhere (`none`); all schema lives in
versioned migrations under `backend/src/main/resources/db/migration`:

- `V1__init.sql` — baseline (users, restaurants, reviews, comments, votes, saves,
  notifications, reports, password reset tokens)
- `V2__add_location_fields.sql` — real-dataset restaurant columns + user addresses

To add a change, create the next version file (`V3__...sql`), then run the app —
Flyway applies only new migrations and records them in `flyway_schema_history`.
Never edit an already-applied migration; add a new one instead.

## Keeping the backend warm (Render free tier)

Render's free tier spins the backend down after ~15 minutes without traffic;
the next request then waits through a 10–30 second cold start. To avoid that,
an external uptime monitor pings `GET /api/ping` every few minutes:

- `GET /api/ping` returns `{"status":"ok"}` and **touches nothing but the
  application process** — no database query, no auth. It exists purely so an
  external monitor can keep the Render service awake.
- `GET /api/health` remains Render's own health check endpoint and is
  unchanged; the warming ping does not need to use it.
- **Do not** point any pinger at an endpoint that queries the database
  (including Actuator-style health checks wired to a DataSource): waking Neon
  on every ping defeats its scale-to-zero design and burns its monthly
  compute-hour quota. Keep the two concerns separate — this warms Render only.

### Monitor setup (UptimeRobot — recommended)

1. Sign up at <https://uptimerobot.com> (free plan).
2. Add New Monitor → type **HTTP(s)**, friendly name e.g. `fooddit-backend-warm`,
   URL: `https://<your-render-backend-url>/api/ping`.
3. Set the check interval to **10 minutes** (the free plan allows 5-minute
   intervals; 10 is safely under Render's 15-minute spin-down threshold with
   margin — more frequent adds nothing).
4. Save, wait for the first few checks, and confirm the monitor shows
   successful responses (HTTP 200).

### Monitor setup (cron-job.org — alternative)

1. Sign up at <https://cron-job.org> (free).
2. Create a Cronjob, URL: `https://<your-render-backend-url>/api/ping`.
3. Set the execution interval to **every 10 minutes**.
4. Enable it and check the execution history shows HTTP 200 responses.

A GitHub Actions scheduled workflow (`curl` every 10 minutes) also works, but
only do this on a **public** repo: on a private repo the runs exceed GitHub
Free's 2,000 Actions-minutes/month quota and get throttled or billed partway
through the month. Prefer the external monitors above.

## Data import

The real restaurant dataset lives in `data/` (gitignored). Import is a **one-off
standalone script**, not part of app startup:

```powershell
pip install -r data/requirements.txt
python data/import_restaurants.py --dsn "postgresql://USER:PASSWORD@HOST/dbname"
```

The script reads `restaurants.parquet` (preferred over `restaurants.csv` — same
columns, same id set, typed), cleans rows, and batch-upserts
(`ON CONFLICT (external_id) DO UPDATE`) so it is safe to re-run. It prints a
summary of rows read / inserted / skipped.

## Tests

```powershell
# backend (76 integration/unit tests)
cd backend
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.7.6-hotspot"
.\mvnw.cmd test

# frontend (28 tests)
cd frontend
npm test
npm run build
```
