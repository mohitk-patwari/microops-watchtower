// Usage: node scripts/send_events.js 

const fetch = require("node-fetch"); // node 18+ has fetch built in; if not,install node-fetch
const url ="http://localhost:3000/api/ingest";

async function sendEvent(payload) {
    const res = await fetch(url, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(payload),
    });
    return res.json();
}

async function run(){
    const base = {
        service: "payments-sevice",
        message: "TypeError: Cannot read property 'foo' of undefined",
        stack: "TypeError: Cannot read property 'foo' of undefined\n  at processPayment (/src/pay.js:45:12)",
        errorType: "TypeError",
    };

    // send 100 events quickly
    const N = 100;
    const promises = [];
    for (let i = 0;i<N;i++){
        // optionally add a tiny jitter or same payload to simulate identical burst
        promises.push(sendEvent(base));
    }

    const results = await Promise.all(promises);
    console.log("Sent",N,"events.Sample responses:");
    console.log(results.slice(0,5));
}

run().catch(console.error);

