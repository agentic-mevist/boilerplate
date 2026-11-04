/**
 * Favicons for the board. The key-caps get theirs from Google's favicon service at the size asked
 * for. Your own site (the hub, which you can zoom right into) gets the sharpest icon we can find:
 * its SVG icon if it has one, else its largest PNG (icon links, apple-touch-icon, web manifest),
 * else Google's 256px one.
 */

import { normalizeDomain } from "../shared/domain";

const UA = "Mozilla/5.0 (compatible; SEOJuice/1.0; +https://seojuice.xyz)";
const WEEK = 60 * 60 * 24 * 7;
const SIZES = [32, 64, 128, 256];
const MAX_ICON_BYTES = 600_000;

export interface IconCandidate {
  url: string;
  svg: boolean;
  /** Pixel size the page declares (SVGs count as the biggest). */
  size: number;
}

/** The biggest square size in a `sizes` attribute ("16x16 32x32" → 32), or 0. */
export function parseSizes(sizes: string | null | undefined): number {
  let best = 0;
  for (const s of (sizes ?? "").toLowerCase().split(/\s+/)) {
    const m = /^(\d+)x(\d+)$/.exec(s);
    if (m) best = Math.max(best, Math.min(Number(m[1]), Number(m[2])));
  }
  return best;
}

export const isSvgUrl = (u: string) => /^data:image\/svg\+xml/i.test(u) || /\.svg(?:[?#]|$)/i.test(u);

/** The order to try icons in: SVGs first, then rasters of at least `min` pixels, biggest first. */
export function rankIcons(cands: IconCandidate[], min = 128): IconCandidate[] {
  const seen = new Set<string>();
  const uniq = cands.filter((c) => !seen.has(c.url) && seen.add(c.url));
  return [...uniq.filter((c) => c.svg), ...uniq.filter((c) => !c.svg && c.size >= min).sort((a, b) => b.size - a.size)];
}

/** Width and height from a PNG header, or null when it isn't a PNG. */
export function pngSize(buf: ArrayBuffer): { w: number; h: number } | null {
  const b = new Uint8Array(buf);
  if (b.length < 24 || b[0] !== 0x89 || b[1] !== 0x50 || b[2] !== 0x4e || b[3] !== 0x47) return null;
  const v = new DataView(buf);
  return { w: v.getUint32(16), h: v.getUint32(20) };
}

/** Decodes a `data:image/svg+xml` URL. */
export function decodeSvgDataUrl(u: string): string | null {
  const m = /^data:image\/svg\+xml(;[^,]*)?,(.*)$/is.exec(u);
  if (!m) return null;
  try {
    return /;base64/i.test(m[1] ?? "") ? atob(m[2]!) : decodeURIComponent(m[2]!);
  } catch {
    return null;
  }
}

const nearestSize = (n: number) => SIZES.reduce((best, s) => (Math.abs(s - n) < Math.abs(best - n) ? s : best), 64);

class StopParsing extends Error {}

/** Icons declared in the site's home page and its web manifest. */
async function discover(domain: string): Promise<IconCandidate[]> {
  const res = await fetch(`https://${domain}/`, {
    headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok || !/html/i.test(res.headers.get("content-type") ?? "")) {
    await res.body?.cancel();
    return [];
  }
  const base = res.url || `https://${domain}/`;
  const abs = (href: string) => {
    try {
      const u = new URL(href, base);
      return ["https:", "http:", "data:"].includes(u.protocol) ? u.toString() : null;
    } catch {
      return null;
    }
  };
  const found: IconCandidate[] = [];
  let manifest: string | null = null;
  const rewriter = new HTMLRewriter()
    .on("link[href]", {
      element(el) {
        const rel = (el.getAttribute("rel") ?? "").toLowerCase().split(/\s+/);
        const url = abs(el.getAttribute("href") ?? "");
        if (!url) return;
        if (rel.includes("manifest")) {
          manifest ??= url;
          return;
        }
        if (rel.includes("mask-icon")) return; // one-color pinned-tab icons
        const apple = rel.some((r) => r.startsWith("apple-touch-icon"));
        if (!apple && !rel.includes("icon")) return;
        const svg = (el.getAttribute("type") ?? "").toLowerCase().includes("svg") || isSvgUrl(url);
        found.push({ url, svg, size: svg ? 4096 : parseSizes(el.getAttribute("sizes")) || (apple ? 180 : 0) });
      },
    })
    // icons live in <head>: stop reading once the body starts
    .on("body", {
      element() {
        throw new StopParsing();
      },
    });
  try {
    await rewriter.transform(res).arrayBuffer();
  } catch {
    // stopped at <body>, or the page was cut off: keep what we found
  }
  if (manifest) found.push(...(await manifestIcons(manifest)));
  return found;
}

async function manifestIcons(url: string): Promise<IconCandidate[]> {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/manifest+json,application/json" }, signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const text = await res.text();
    if (text.length > 200_000) return [];
    const m = JSON.parse(text) as { icons?: { src?: string; sizes?: string; type?: string; purpose?: string }[] };
    const base = res.url || url;
    return (m.icons ?? []).flatMap((i) => {
      if (!i.src) return [];
      // maskable and monochrome icons are padded or one-color
      if (!(i.purpose ?? "any").toLowerCase().split(/\s+/).includes("any")) return [];
      let u: string;
      try {
        u = new URL(i.src, base).toString();
      } catch {
        return [];
      }
      const svg = (i.type ?? "").includes("svg") || isSvgUrl(u);
      return [{ url: u, svg, size: svg ? 4096 : parseSizes(i.sizes) }];
    });
  } catch {
    return [];
  }
}

/** Some SVG favicons turn light for dark browser tabs, which would vanish on the white hub:
 *  pin them to their light-mode look (dark rules never match, light rules always do). */
export function lightOnly(svg: string): string {
  return svg
    .replace(/\(\s*prefers-color-scheme\s*:\s*dark\s*\)/gi, "(max-width: 0px)")
    .replace(/\(\s*prefers-color-scheme\s*:\s*light\s*\)/gi, "(min-width: 0px)");
}

async function fetchIcon(c: IconCandidate): Promise<{ body: ArrayBuffer | string; type: string } | null> {
  if (c.url.startsWith("data:")) {
    const text = c.svg ? decodeSvgDataUrl(c.url) : null;
    return text && /<svg[\s>]/i.test(text) ? { body: lightOnly(text), type: "image/svg+xml" } : null;
  }
  const res = await fetch(c.url, {
    headers: { "user-agent": UA, accept: c.svg ? "image/svg+xml,image/*" : "image/*" },
    redirect: "follow",
    signal: AbortSignal.timeout(4000),
    cf: { cacheTtl: WEEK, cacheEverything: true },
  } as RequestInit);
  if (!res.ok) {
    await res.body?.cancel();
    return null;
  }
  const body = await res.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > MAX_ICON_BYTES) return null;
  const type = (res.headers.get("content-type") ?? "").toLowerCase().split(";")[0]!.trim();
  if (c.svg) {
    const text = new TextDecoder().decode(body);
    return /<svg[\s>]/i.test(text) ? { body: lightOnly(text), type: "image/svg+xml" } : null;
  }
  if (!type.startsWith("image/") || type.includes("svg")) return null;
  const dims = pngSize(body);
  if (dims && Math.min(dims.w, dims.h) < 96) return null; // declared big, actually small
  return { body, type };
}

const headers = (type: string, kind: string): HeadersInit => ({
  "content-type": type,
  "cache-control": `public, max-age=${WEEK}, immutable`,
  "access-control-allow-origin": "*",
  "access-control-expose-headers": "x-favicon-default, x-favicon-kind",
  "x-content-type-options": "nosniff",
  // third-party SVGs are only ever shown as images; opened directly, they can't run anything
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
  "x-favicon-kind": kind,
  "x-favicon-default": "0",
});

async function bestIcon(domain: string): Promise<Response | null> {
  for (const c of rankIcons(await discover(domain)).slice(0, 4)) {
    const icon = await fetchIcon(c).catch(() => null);
    if (icon) return new Response(icon.body, { headers: headers(icon.type, icon.type === "image/svg+xml" ? "svg" : "raster") });
  }
  return null;
}

async function googleIcon(domain: string, size: number): Promise<Response> {
  const upstream = await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`, {
    cf: { cacheTtl: WEEK, cacheEverything: true },
  } as RequestInit);
  const body = await upstream.arrayBuffer();
  const h = new Headers(headers(upstream.headers.get("content-type") ?? "image/png", "google"));
  // Google answers 404 (with a generic globe) when it has nothing for the site
  if (upstream.status === 404) h.set("x-favicon-default", "1");
  return new Response(body, { headers: h });
}

/** GET /api/favicon?domain=example.com[&size=32|64|128|256][&hd=1] */
export async function handleFavicon(req: Request, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(req.url);
  const domain = normalizeDomain(url.searchParams.get("domain") ?? "");
  if (!domain) return new Response("bad domain", { status: 400 });
  const hd = url.searchParams.get("hd") === "1";
  const size = hd ? 256 : nearestSize(Number(url.searchParams.get("size") ?? "64") || 64);
  const cache = caches.default;
  const cacheKey = new Request(`https://favicon.cache/v2/${hd ? "hd" : size}/${domain}`);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;
  let res: Response | null = null;
  try {
    if (hd) res = await bestIcon(domain).catch(() => null);
    res ??= await googleIcon(domain, size);
  } catch {
    return new Response("upstream error", { status: 502 });
  }
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
