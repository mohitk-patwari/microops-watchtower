// scripts/test-redis.js
import dotenv from "dotenv";
dotenv.config({path: ".env.local"});

import { Redis } from "@upstash/redis";

const r = new Redis({
    url:process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function test() {
    try {
        await r.set("microops_test_key", "hello",{ ex: 10});
        const v = await r.get("microops_test_key");
        console.log("redis ok, got:",v);
    } catch (err) {
        console.error("redis test failed:", err);
    }
}
test();
