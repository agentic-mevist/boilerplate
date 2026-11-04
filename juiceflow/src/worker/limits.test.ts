import { describe, expect, test } from "vitest";
import { checkBudget } from "./budget";
import worker, { type Env } from "./index";

const day = () => new Date().toISOString().slice(0, 10);
const fakeKV = (data: Record<string, string>) =>
  ({
    get: async (k: string) => data[k] ?? null,
    put: async (k: string, v: string) => {
      data[k] = v;
    },
  }) as unknown as KVNamespace;
const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;

describe("lookup limits", () => {
  test("three fresh lookups per visitor per day", async () => {
    const data: Record<string, string> = {};
    const env = { CACHE: fakeKV(data), PER_IP_DAILY: "3" };
    for (const n of [0, 1, 2]) {
      data[`ip:${day()}:1.2.3.4`] = String(n);
      expect((await checkBudget(env, "1.2.3.4")).ok).toBe(true);
    }
    data[`ip:${day()}:1.2.3.4`] = "3";
    const b = await checkBudget(env, "1.2.3.4");
    expect(b.ok).toBe(false);
    expect(b.reason).toBe("rate_limited");
    // someone else still gets theirs
    expect((await checkBudget(env, "5.6.7.8")).ok).toBe(true);
  });

  test("a 4th fresh lookup is refused with a friendly message, before any data is bought", async () => {
    const env = { CACHE: fakeKV({ [`ip:${day()}:203.0.113.9`]: "3" }), PER_IP_DAILY: "3", DAILY_BUDGET_USD: "3" } as unknown as Env;
    const req = new Request("https://seojuice.xyz/api/analyze?domain=example.com", { headers: { "cf-connecting-ip": "203.0.113.9" } });
    const res = await worker.fetch!(req as Parameters<NonNullable<typeof worker.fetch>>[0], env, ctx);
    expect(res.status).toBe(429);
    const body = (await res.json()) as { code: string; error: string };
    expect(body.code).toBe("rate_limited");
    expect(body.error).toContain("3 free lookups");
  });
});
