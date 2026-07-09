# Phase 1 dedup verification

Manual verification that normalized fingerprinting (`src/app/api/ingest/route.ts`)
actually collapses repeated occurrences of the same underlying bug into one
incident, instead of one incident per occurrence.

## Method

1. Ran `demo-service/server.js` (buggy routes) against the app's `/api/ingest`.
2. Drove traffic with `scripts/simulate-traffic.js` (randomized user/order ids
   and auth tokens across `/pay/:userId`, `/db/:orderId`, `/auth/:token`).
3. Exported the `events` and `incidents` collections via MongoDB Compass and
   compared counts.

## Result

- 50 raw events were recorded in the `events` collection.
- Those 50 events collapsed into exactly 3 incidents in the `incidents`
  collection — one per underlying bug, not one per occurrence. (3 incidents
  is consistent with the three demo-service bug routes, though this was not
  cross-checked route-by-route — it's an inference from the fingerprint/tag
  pattern, not a directly observed one-to-one mapping.)
- Each incident's `count` field matched the number of raw events sharing
  that incident's `fingerprint`.

This confirms the normalization in `normalizeText()` is doing its job: dynamic
data (user ids, order ids, token suffixes, timestamps) is being stripped from
the fingerprint signal before hashing, so occurrences of the same bug with
different dynamic data still hash to the same fingerprint.

## Caveat

This was a manual, one-time check (Compass export comparison), not an
automated test. Converting this into a repeatable check (e.g. an integration
test that seeds N synthetic occurrences of a fingerprint and asserts exactly
one incident with `count === N`) is Phase 5 (Tests & docs) work, not done here.
