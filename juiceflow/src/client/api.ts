import { normalizeDomain } from "../shared/domain";
import type { AnalyzeResponse, ApiError, RawLink } from "../shared/types";

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

/** A site's favicon through our proxy, `size` pixels square (32, 64, 128 or 256; smaller icons stay small). */
export const faviconUrl = (domain: string, size = 64) => `/api/favicon?domain=${encodeURIComponent(domain)}&size=${size}`;
/** The sharpest icon a site has (its SVG one when there is one), for your own site in the middle. */
export const hdFaviconUrl = (domain: string) => `/api/favicon?domain=${encodeURIComponent(domain)}&hd=1`;

export interface LinksResponse {
  target: string;
  from: string;
  total: number;
  links: RawLink[];
  cached: boolean;
}

const linkCache = new Map<string, Promise<LinksResponse>>();

/** All links one site has to the target (strongest first). Cached per session. */
export function fetchLinks(target: string, from: string): Promise<LinksResponse> {
  const key = `${target}|${from}`;
  let p = linkCache.get(key);
  if (!p) {
    p = fetch(`/api/links?target=${encodeURIComponent(target)}&from=${encodeURIComponent(from)}`).then(async (res) => {
      const body = (await res.json().catch(() => null)) as (LinksResponse & ApiError) | null;
      if (!res.ok || !body || "error" in body) throw new AnalyzeError(body?.error ?? `Couldn't load links (${res.status}).`, body?.code ?? "internal");
      return body;
    });
    p.catch(() => linkCache.delete(key));
    linkCache.set(key, p);
  }
  return p;
}
