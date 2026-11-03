import { normalizeDomain } from "../shared/domain";
import type { AnalyzeResponse, ApiError } from "../shared/types";

/** Pre-computed analyses shipped with the app, so the demo costs nothing. */
export const DEMOS = ["figma.com", "plausible.io", "thulite.io", "gethyas.com", "irishroots.ie"];

export class AnalyzeError extends Error {
  constructor(
    message: string,
    public code: ApiError["code"],
  ) {
    super(message);
  }
}

export async function analyze(input: string, signal?: AbortSignal): Promise<AnalyzeResponse> {
  const domain = normalizeDomain(input);
  if (!domain) throw new AnalyzeError("That doesn't look like a website. Try something like example.com", "invalid_domain");
  if (DEMOS.includes(domain)) {
    const res = await fetch(`/demo/${domain}.json`, { signal });
    if (res.ok) return { ...((await res.json()) as AnalyzeResponse), cached: true, demo: true };
  }
  const res = await fetch(`/api/analyze?domain=${encodeURIComponent(domain)}`, { signal });
  const body = (await res.json().catch(() => null)) as (AnalyzeResponse & ApiError) | null;
  if (!res.ok || !body || "error" in body) {
    throw new AnalyzeError(body?.error ?? `Something went wrong (${res.status}).`, body?.code ?? "internal");
  }
  return body;
}

export const faviconUrl = (domain: string) => `/api/favicon?domain=${encodeURIComponent(domain)}`;
