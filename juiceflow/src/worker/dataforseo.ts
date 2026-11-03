/** Minimal DataForSEO v3 client for the Backlinks API "live" endpoints. */

export interface DfsEnv {
  DATAFORSEO_LOGIN: string;
  DATAFORSEO_PASSWORD: string;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public status: number,
    public providerCode?: number,
  ) {
    super(message);
  }
}

export interface DfsTaskResult<T> {
  result: T | null;
  cost: number;
  statusCode: number;
  statusMessage: string;
}

const BASE = "https://api.dataforseo.com/v3/";

export async function dfsPost<T = any>(env: DfsEnv, path: string, task: Record<string, unknown>): Promise<DfsTaskResult<T>> {
  if (!env.DATAFORSEO_LOGIN || !env.DATAFORSEO_PASSWORD) {
    throw new ProviderError("DataForSEO credentials are not configured", 500);
  }
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${env.DATAFORSEO_LOGIN}:${env.DATAFORSEO_PASSWORD}`),
      "Content-Type": "application/json",
    },
    body: JSON.stringify([task]),
  });
  if (!res.ok) {
    throw new ProviderError(`DataForSEO HTTP ${res.status}`, res.status);
  }
  const json = (await res.json()) as any;
  if (json.status_code !== 20000) {
    throw new ProviderError(`DataForSEO: ${json.status_message}`, 502, json.status_code);
  }
  const t = json.tasks?.[0];
  if (!t) throw new ProviderError("DataForSEO: empty response", 502);
  const cost = Number(t.cost) || 0;
  if (t.status_code !== 20000) {
    // 40501 = invalid field (e.g. bad target), 40400-ish = nothing found.
    return { result: null, cost, statusCode: t.status_code, statusMessage: t.status_message };
  }
  return { result: (t.result?.[0] ?? null) as T | null, cost, statusCode: t.status_code, statusMessage: t.status_message };
}
