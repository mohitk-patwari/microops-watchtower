// demo-service/server.js
//
// A minimal, deliberately buggy "payments" microservice.
// The point: this is a REAL service reporting REAL errors it hits during
// normal operation — not a script faking payloads. This is how you'd
// actually wire an app up to an error-tracking backend (this is roughly
// what a Sentry/Rollbar SDK middleware does under the hood, just much
// simpler).
//
// Run: node demo-service/server.js
// Requires: npm install express  (inside demo-service/, or hoisted from root)

import express from "express";

const app = express();
app.use(express.json());

const WATCHTOWER_INGEST_URL =
  process.env.WATCHTOWER_INGEST_URL || "http://localhost:3000/api/ingest";
const SERVICE_NAME = "payments-service";

/** Reports an unhandled error to the watchtower ingest endpoint. Fire-and-forget. */
async function reportError(err, extra = {}) {
  try {
    await fetch(WATCHTOWER_INGEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service: SERVICE_NAME,
        message: err.message,
        stack: err.stack,
        errorType: err.name,
        ...extra,
      }),
    });
  } catch (reportErr) {
    // Don't let monitoring failures take down the service reporting them.
    console.error("Failed to report error to watchtower:", reportErr.message);
  }
}

// --- Realistic buggy routes ---
// Each simulates a class of bug you'd genuinely see in production, with
// enough randomness that the SAME bug fires many times with DIFFERENT
// specific data (different user ids, different line context) — this is
// exactly what the fingerprint normalization in the fixed ingest route
// needs to be tested against.

app.get("/pay/:userId", (req, res, next) => {
  try {
    const userId = req.params.userId;
    if (Math.random() < 0.3) {
      // Null-reference bug: card lookup occasionally returns undefined
      const card = undefined;
      void card.last4; // throws TypeError, different userId each time
    }
    res.json({ ok: true, userId, amount: Math.round(Math.random() * 500) });
  } catch (err) {
    next(err);
  }
});

app.get("/db/:orderId", (req, res, next) => {
  try {
    if (Math.random() < 0.25) {
      const e = new Error(
        `MongoServerError: WriteConflict on order ${req.params.orderId} at retry ${Date.now()}`
      );
      e.name = "MongoServerError";
      throw e;
    }
    res.json({ ok: true, orderId: req.params.orderId });
  } catch (err) {
    next(err);
  }
});

app.get("/auth/:token", (req, res, next) => {
  try {
    if (req.params.token !== "valid-token") {
      const e = new Error(`Unauthorized: invalid JWT signature for token ${req.params.token}`);
      e.name = "AuthError";
      throw e;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.get("/health", (req, res) => res.json({ ok: true }));

// Global error handler: every unhandled route error gets reported
// automatically. This is the piece that makes ingestion "genuine" —
// nobody is hand-crafting payloads, the service is reporting its own faults.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express detects error-handling middleware by its 4-arg signature, so _next must stay even though it's unused here
app.use((err, req, res, _next) => {
  reportError(err, { route: req.path });
  res.status(500).json({ ok: false, error: err.message });
});

const PORT = process.env.DEMO_PORT || 4000;
app.listen(PORT, () => {
  console.log(`Demo payments-service running on http://localhost:${PORT}`);
  console.log(`Reporting errors to ${WATCHTOWER_INGEST_URL}`);
});
