import { rootDomain } from "../shared/domain";
import type { AnalysisPayload, RawLink, TargetSummary } from "../shared/types";
import { dfsPost, ProviderError, type DfsEnv } from "./dataforseo";

export const PAYLOAD_VERSION = 1;
const LIVE_LIMIT = 200;
const LOST_LIMIT = 40;

const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const str = (v: unknown) => (typeof v === "string" && v.length ? v : null);

function trimContext(pre: unknown, anchor: unknown, post: unknown): string | null {
  const a = (str(pre) ?? "").slice(-90);
  const b = str(anchor) ?? "";
  const c = (str(post) ?? "").slice(0, 90);
  const s = `${a} ${b} ${c}`.replace(/\s+/g, " ").trim();
  return s.length ? s : null;
}

export function normalizeLink(it: any): RawLink {
  return {
    domain: String(it.domain_from ?? "").toLowerCase(),
    url: String(it.url_from ?? ""),
    title: str(it.page_from_title)?.slice(0, 160) ?? null,
    urlTo: String(it.url_to ?? ""),
    anchor: str(it.anchor)?.slice(0, 120) ?? (str(it.alt)?.slice(0, 120) ?? null),
    context: trimContext(it.text_pre, it.anchor, it.text_post),
    domainRank: num(it.domain_from_rank),
    pageRank: num(it.page_from_rank),
    linkRank: num(it.rank),
    extLinks: num(it.page_from_external_links, 1),
    intLinks: num(it.page_from_internal_links),
    dofollow: Boolean(it.dofollow),
    attributes: Array.isArray(it.attributes) ? it.attributes.map(String) : [],
    itemType: String(it.item_type ?? "anchor"),
    placement: str(it.semantic_location),
    spamLink: typeof it.backlink_spam_score === "number" ? it.backlink_spam_score : null,
    spamDomain: null,
    statusTo: typeof it.url_to_status_code === "number" ? it.url_to_status_code : null,
    isBroken: Boolean(it.is_broken),
    isLost: Boolean(it.is_lost),
    isNew: Boolean(it.is_new),
    firstSeen: str(it.first_seen),
    lastSeen: str(it.last_seen),
    groupCount: Math.max(1, num(it.group_count, 1)),
    platform: Array.isArray(it.domain_from_platform_type) ? it.domain_from_platform_type.map(String) : [],
    country: str(it.domain_from_country),
    tld: str(it.tld_from),
    language: str(it.page_from_language),
  };
}

function normalizeSummary(target: string, r: any): TargetSummary | null {
  if (!r) return null;
  return {
    target,
    rank: num(r.rank),
    backlinks: num(r.backlinks),
    referringDomains: num(r.referring_domains),
    referringDomainsNofollow: num(r.referring_domains_nofollow),
    referringMainDomains: num(r.referring_main_domains),
    brokenBacklinks: num(r.broken_backlinks),
    brokenPages: num(r.broken_pages),
    crawledPages: num(r.crawled_pages),
    externalLinks: num(r.external_links_count),
    spamScore: typeof r.info?.target_spam_score === "number" ? r.info.target_spam_score : typeof r.backlinks_spam_score === "number" ? r.backlinks_spam_score : null,
    firstSeen: str(r.first_seen),
    platform: str(r.info?.platform_type),
    country: str(r.info?.country),
  };
}

/**
 * Fetch everything needed for one target. Cost is roughly
 * 4 requests × $0.024 + ~$0.000036 per returned row ≈ $0.11.
 */
export async function fetchAnalysis(env: DfsEnv, target: string): Promise<AnalysisPayload> {
  const common = { target, include_subdomains: true, exclude_internal_backlinks: true };
  const [summaryT, liveT, lostT] = await Promise.all([
    dfsPost(env, "backlinks/summary/live", { target, include_subdomains: true, internal_list_limit: 1, backlinks_status_type: "live" }),
    dfsPost(env, "backlinks/backlinks/live", { ...common, mode: "one_per_domain", limit: LIVE_LIMIT, order_by: ["rank,desc"], backlinks_status_type: "live" }),
    dfsPost(env, "backlinks/backlinks/live", { ...common, mode: "one_per_domain", limit: LOST_LIMIT, order_by: ["rank,desc"], backlinks_status_type: "lost" }),
  ]);
  let cost = summaryT.cost + liveT.cost + lostT.cost;

  if (summaryT.statusCode === 40501 || liveT.statusCode === 40501) {
    throw new ProviderError(`DataForSEO rejected the target: ${summaryT.statusMessage}`, 400, 40501);
  }

  const links = ((liveT.result as any)?.items ?? []).map(normalizeLink).filter((l: RawLink) => l.domain);
  const liveRoots = new Set(links.map((l: RawLink) => rootDomain(l.domain)));
  const lost = ((lostT.result as any)?.items ?? [])
    .map(normalizeLink)
    .filter((l: RawLink) => l.domain && !liveRoots.has(rootDomain(l.domain)));

  const hosts = [...new Set([...links, ...lost].map((l: RawLink) => l.domain))].slice(0, 1000);
  if (hosts.length) {
    try {
      const spamT = await dfsPost<any>(env, "backlinks/bulk_spam_score/live", { targets: hosts });
      cost += spamT.cost;
      const map = new Map<string, number>();
      for (const it of spamT.result?.items ?? []) {
        if (typeof it?.spam_score === "number") map.set(String(it.target).toLowerCase(), it.spam_score);
      }
      for (const l of [...links, ...lost] as RawLink[]) l.spamDomain = map.get(l.domain) ?? null;
    } catch (e) {
      // Spam scores are an enhancement; fall back to per-link spam scores.
      console.warn("bulk_spam_score failed", e);
    }
  }

  return {
    version: PAYLOAD_VERSION,
    target,
    fetchedAt: new Date().toISOString(),
    cost: Math.round(cost * 1e6) / 1e6,
    summary: normalizeSummary(target, summaryT.result),
    links,
    lost,
    totalLiveDomains: num((liveT.result as any)?.total_count, links.length),
    totalLostDomains: num((lostT.result as any)?.total_count, lost.length),
  };
}
