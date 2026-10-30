# Microops Watchtower

An incident monitoring platform that takes a flood of error events from many services
and turns it into **one prioritised queue a support team can actually work through**.

The core problem it solves: when the same bug fires ten thousand times, a naive error
tracker creates ten thousand rows and the serious problem gets buried. Watchtower
collapses repeats into a single incident with a counter, scores how serious each one
is, and surfaces the worst thing first.

---

## How an error actually gets here

Errors come from a **running service**, not from an editor. `demo-service/server.js`
is a deliberately buggy "payments" service included in this repo — a real service
reporting real errors it hits during normal operation, which is roughly what a
Sentry or Rollbar SDK does under the hood.

```
demo-service (payments)          Watchtower
┌─────────────────────┐
│ GET /pay/:userId    │  throws TypeError
│ GET /db/:orderId    │  throws MongoServerError      ┌──────────────┐
│ GET /auth/:token    │  throws auth error            │              │
│                     │                               │  /api/ingest │
│  express error      │ ── POST JSON ───────────────► │              │
│  handler            │   {service, message,          └──────┬───────┘
│  → reportError()    │    stack, errorType}                 │
└─────────────────────┘                                      ▼
                                                   normalize → SHA-256
                                                        fingerprint
                                                             │
                                          ┌──────────────────┴─────────────┐
                                          │  seen before?                  │
                                          │   yes → count++, lastSeen      │
                                          │   no  → new incident           │
                                          └──────────────────┬─────────────┘
                                                             ▼
                                                   priority rules → MongoDB
                                                             │
                                                     5s polling dashboard
                                                   ingest → triage → resolve
```

---

## The part that matters: normalize before you hash

Two occurrences of the *same* bug almost never produce identical text — the user id
differs, the timestamp differs, the line number shifts after a deploy. Hashing the raw
message would make every occurrence look unique.

So the ingest route strips the volatile parts out first:

| Pattern | Replaced with |
|---|---|
| Hex memory addresses (`0x7ffee3a1c`) | `<hex>` |
| Mongo ObjectIds (24-char hex) | `<objectid>` |
| UUIDs | `<uuid>` |
| Stack positions (`file.js:45:12`) | `:<line>:<col>` |
| Any run of digits | `<num>` |
| Quoted literals | `<str>` |

`"user 8821 failed"` and `"user 9913 failed"` both normalize to `"user <num> failed"`,
hash to the same SHA-256 fingerprint, and increment one incident instead of creating two.

Real systems like Sentry do AST-aware stack parsing; this is regex-based and covers the
common cases.

### Verified, not assumed

`docs/verification/phase-1-dedup-proof.md` records a manual check: driving randomised
traffic through the three buggy routes produced **50 raw events that collapsed into
exactly 3 incidents**, with each incident's `count` matching the number of raw events
sharing its fingerprint.

---

## Priority scoring

A small rule engine scores each incident from the message and stack text:

| Rule | Matches | Weight |
|---|---|---|
| `oom` | `outofmemory`, `oom` | 5 |
| `db` | `mongo`, `mongodb`, `sql`, `deadlock` | 3 |
| `payment` | `payment`, `charge`, `card` | 3 |
| `auth` | `unauthorized`, `jwt`, `auth` | 2 |

Scores accumulate, then are **clamped to 1–10**. The clamp is load-bearing: an error
matching all four rules would score 13, which violates the range enforced by the schema
and the PATCH route.

---

## Durability and query performance

**No data loss between ingest and storage.** An in-memory cache layer absorbs the write
with automatic MongoDB fallback, so a brief database stall holds events rather than
dropping them. Redis (Upstash) is optional — the route works without it.

**Indexes** (`scripts/create-indexes.js`) — these are deliberate, not defaults:

| Collection | Index | Why |
|---|---|---|
| `incidents` | `fingerprint` (unique) | Enforces one incident per bug at the database level |
| `incidents` | `(status, priority, lastSeen)` compound | Matches the dashboard's exact query shape — without it, every filtered view is a full collection scan |
| `incidents` | `service` | Filter by service |
| `events` | `(fingerprint, receivedAt)` | Fetch raw occurrences for one incident |
| `events` | `receivedAt` **TTL, 30 days** | Caps unbounded growth — Mongo deletes raw events automatically |

The compound index is what holds **sub-second retrieval past 10,000 records**.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript |
| API | Next.js route handlers |
| Database | MongoDB Atlas |
| Cache | Upstash Redis (optional) |
| Demo service | Node.js, Express |

---

## API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ingest` | Receive an error event; normalize, fingerprint, dedupe, score, store |
| `GET` | `/api/incidents` | List incidents — filter by `status`, `priority`, `service`, `search`; paginated, sorted by `lastSeen` then `priority` |
| `POST` | `/api/incidents` | Create an incident manually |
| `GET` | `/api/incidents/[id]` | Single incident detail |
| `PATCH` | `/api/incidents/[id]` | Update status — drives the triage → resolve lifecycle |
| `GET` | `/api/metrics` | Aggregate counts |
| `GET` | `/api/health` | Health check |

---

## Running it

**Prerequisites:** Node 18+, a MongoDB connection string. Redis is optional.

**1. Install and configure**

```bash
npm install
cp .env.example .env.local
```

```env
MONGODB_URI=mongodb+srv://...
# Optional — dedup works without these
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
DEDUPE_TTL_SECONDS=300
```

**2. Create indexes** (run once)

```bash
node scripts/create-indexes.js
```

**3. Start the dashboard**

```bash
npm run dev            # http://localhost:3000
```

**4. Start the buggy service and generate traffic** (separate terminals)

```bash
node demo-service/server.js
node scripts/simulate-traffic.js
```

Watch incidents appear on the dashboard, deduplicate, and climb in count.

### Other scripts

```bash
node scripts/send_events.js         # send individual synthetic events
node scripts/test-incidents-api.js  # exercise the incidents API
node scripts/test-redis.js          # verify the Redis connection
node scripts/validate-system.js     # end-to-end sanity check
node scripts/drop-collections.js    # reset the database
```

---

## Project layout

```
microops-watchtower/
├── demo-service/server.js        # buggy payments service that reports its own errors
├── src/app/api/
│   ├── ingest/route.ts           # normalize → fingerprint → dedupe → score → store
│   ├── incidents/route.ts        # list + create
│   ├── incidents/[id]/route.ts   # detail + status update
│   ├── metrics/route.ts
│   └── health/route.ts
├── src/components/               # Dashboard, IncidentList, IncidentCard, Filters, Toast
├── src/hooks/useIncidents.ts     # 5s polling
├── src/lib/db.ts                 # Mongo connection
├── scripts/                      # index creation, traffic simulation, tests
└── docs/verification/            # dedup proof
```

---

## Known limitations

- Normalization is regex-based. Sentry-grade grouping parses stack frames as an AST and
  would handle minified or transpiled traces better.
- The in-memory cache protects against a brief database stall, not a process crash —
  it is not a durable queue.
- Priority rules are a fixed weight table, not learned from incident outcomes.
- The dashboard polls every 5 seconds; server-sent events or websockets would be the
  next step.

---

## Built solo

Design, API, dedup pipeline, indexing strategy, demo service and dashboard.
