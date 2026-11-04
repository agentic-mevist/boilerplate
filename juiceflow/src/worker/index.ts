import { normalizeDomain } from "../shared/domain";
import type { AnalysisPayload, AnalyzeResponse, ApiError } from "../shared/types";
import { fetchAnalysis, fetchLinksFrom, PAYLOAD_VERSION } from "./analyze";
import { checkBudget, recordSpend, secondsUntilTomorrow } from "./budget";
import { ProviderError } from "./dataforseo";
import { handleFavicon } from "./favicon";

export interface Env {
  ASSETS: Fetcher;
  CACHE: KVNamespace;
  DATAFORSEO_LOGIN: string;
  DATAFORSEO_PASSWORD: string;
  DAILY_BUDGET_USD?: string;
  PER_IP_DAILY?: string;
  PER_IP_LINKS_DAILY?: string;
  CACHE_DAYS?: string;
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

const fail = (status: number, err: ApiError, headers: Record<string, string> = {}) => json(err, status, headers);

async function handleAnalyze(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(req.url);
  const domain = normalizeDomain(url.searchParams.get("domain") ?? "");
  if (!domain) return fail(400, { error: "That doesn't look like a website. Try something like example.com", code: "invalid_domain" });

  const key = `a:v${PAYLOAD_VERSION}:${domain}`;
  const cached = await env.CACHE.get(key, "text");
  if (cached) {
    const body = `{"cached":true,${cached.slice(1)}`;
    return new Response(body, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300" } });
  }

  const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
  const budget = await checkBudget(env, ip);
  if (!budget.ok) {
    const retryAfter = secondsUntilTomorrow();
    return fail(
      429,
      budget.reason === "budget_exhausted"
        ? { error: "Today's free analyses are used up. Cached sites still work. Try again tomorrow.", code: "budget_exhausted", retryAfter }
        : {
            error: `You've used today's ${budget.ipLimit} free lookups. Sites someone already looked up still load, and so do the demos. New lookups open again tomorrow.`,
            code: "rate_limited",
            retryAfter,
          },
      { "retry-after": String(retryAfter) },
    );
  }

  let payload: AnalysisPayload;
  try {
    payload = await fetchAnalysis(env, domain);
  } catch (e) {
    if (e instanceof ProviderError && e.status === 400) {
      return fail(400, { error: "The data provider couldn't analyze that domain.", code: "invalid_domain" });
    }
    console.error("analysis failed", e);
    return fail(502, { error: "The backlink data provider is having trouble right now. Please try again in a minute.", code: "provider_error" });
  }

  const days = Number(env.CACHE_DAYS ?? "7") || 7;
  const text = JSON.stringify(payload);
  ctx.waitUntil(Promise.all([env.CACHE.put(key, text, { expirationTtl: 60 * 60 * 24 * days }), recordSpend(env, ip, payload.cost, budget)]));
  const res: AnalyzeResponse = { ...payload, cached: false };
  return json(res);
}

async function handleLinks(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(req.url);
  const target = normalizeDomain(url.searchParams.get("target") ?? "");
  const from = (url.searchParams.get("from") ?? "").trim().toLowerCase();
  if (!target || !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(from) || from.length > 253) {
    return fail(400, { error: "Missing or invalid site.", code: "invalid_domain" });
  }
  const key = `l:v2:${target}:${from}`;
  const cached = await env.CACHE.get(key, "text");
  if (cached) {
    return new Response(`{"cached":true,${cached.slice(1)}`, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300" } });
  }
  const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
  const budget = await checkBudget(env, ip, "links");
  if (!budget.ok) {
    const retryAfter = secondsUntilTomorrow();
    return fail(429, { error: "Link lookups are paused for today. Try again tomorrow.", code: budget.reason ?? "rate_limited", retryAfter }, { "retry-after": String(retryAfter) });
  }
  try {
    const payload = await fetchLinksFrom(env, target, from);
    const days = Number(env.CACHE_DAYS ?? "7") || 7;
    const text = JSON.stringify(payload);
    ctx.waitUntil(Promise.all([env.CACHE.put(key, text, { expirationTtl: 60 * 60 * 24 * days }), recordSpend(env, ip, payload.cost, budget)]));
    return json({ ...payload, cached: false });
  } catch (e) {
    console.error("links failed", e);
    return fail(502, { error: "Couldn't load the links right now.", code: "provider_error" });
  }
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/api/analyze") return handleAnalyze(req, env, ctx);
    if (url.pathname === "/api/links") return handleLinks(req, env, ctx);
    if (url.pathname === "/api/favicon") return handleFavicon(req, ctx);
    if (url.pathname === "/api/health") return json({ ok: true, version: PAYLOAD_VERSION });
    if (url.pathname.startsWith("/api/")) return fail(404, { error: "Not found", code: "not_found" });
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;
