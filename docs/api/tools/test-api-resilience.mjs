import assert from "node:assert/strict";
import { EldoriaApiClient } from "../apiClient/index.js";

let retryCalls = 0;
const retryingApi = new EldoriaApiClient({
  baseUrl: "https://example.test/api",
  retryDelayMs: 0,
  fetch: async () => {
    retryCalls += 1;
    if (retryCalls === 1) {
      throw new TypeError("temporary network failure");
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  }
});

assert.deepEqual(await retryingApi.health(), { ok: true });
assert.equal(retryCalls, 2, "GET requests should retry one transient network failure");

const timingOutApi = new EldoriaApiClient({
  baseUrl: "https://example.test/api",
  getRetries: 0,
  requestTimeoutMs: 25,
  fetch: (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
  })
});

const startedAt = Date.now();
await assert.rejects(() => timingOutApi.health());
assert(Date.now() - startedAt < 500, "request timeout should abort promptly");

console.log("API resilience tests passed.");
