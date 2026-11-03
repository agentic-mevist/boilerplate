/**
 * Data contract between the Worker (which talks to DataForSEO) and the client
 * (which runs the juice model and renders it). The Worker only *normalizes*
 * provider data; all scoring happens in `model.ts` so the algorithm can be
 * tweaked live in the browser without re-spending API credits.
 */

/** One backlink, normalized from DataForSEO `backlinks/backlinks` (one per referring domain). */
export interface RawLink {
  /** Referring (linking) host, e.g. "www.discourse.org". */
  domain: string;
  /** Page that holds the link. */
  url: string;
  title: string | null;
  /** Page on the target site the link points to. */
  urlTo: string;
  anchor: string | null;
  /** A little surrounding text, trimmed, for the detail card. */
  context: string | null;

  /** Domain rating of the linking site, 0–1000 (DataForSEO `domain_from_rank`). */
  domainRank: number;
  /** Authority of the linking page, 0–1000 (DataForSEO `page_from_rank`). */
  pageRank: number;
  /** DataForSEO's own per-link rank, 0–1000. Kept as a cross-check for the model. */
  linkRank: number;

  /** Outgoing links to other sites on the linking page. */
  extLinks: number;
  /** Internal links on the linking page. */
  intLinks: number;

  dofollow: boolean;
  /** Link rel attributes, e.g. ["nofollow", "ugc", "sponsored", "noopener"]. */
  attributes: string[];
  /** anchor | image | redirect | canonical | meta | link | alternate ... */
  itemType: string;
  /** Where on the page the link sits: article | main | section | header | nav | aside | footer | null. */
  placement: string | null;

  /** Spam score of the link itself, 0–100. */
  spamLink: number | null;
  /** Spam score of the whole linking domain, 0–100 (bulk lookup; null if unavailable). */
  spamDomain: number | null;

  /** HTTP status of the target URL as last crawled (200, 301, 404, ...). */
  statusTo: number | null;
  isBroken: boolean;
  isLost: boolean;
  isNew: boolean;
  firstSeen: string | null;
  lastSeen: string | null;
  /** How many backlinks the referring domain has to the target in total. */
  groupCount: number;

  platform: string[];
  country: string | null;
  tld: string | null;
  language: string | null;
}

/** Target-level numbers from DataForSEO `backlinks/summary`. */
export interface TargetSummary {
  target: string;
  /** Domain rating of the target, 0–1000. */
  rank: number;
  backlinks: number;
  referringDomains: number;
  referringDomainsNofollow: number;
  referringMainDomains: number;
  brokenBacklinks: number;
  brokenPages: number;
  crawledPages: number;
  /** Outgoing links from the target itself. */
  externalLinks: number;
  spamScore: number | null;
  firstSeen: string | null;
  platform: string | null;
  country: string | null;
}

export interface AnalysisPayload {
  version: number;
  target: string;
  fetchedAt: string;
  /** Provider cost of producing this payload, USD. 0 for cached copies is NOT implied: this is the original cost. */
  cost: number;
  summary: TargetSummary | null;
  /** Live backlinks, strongest link per referring domain. */
  links: RawLink[];
  /** Recently lost links, strongest per domain (domains that still link are removed). */
  lost: RawLink[];
  /** How many referring domains exist in total vs. how many we sampled. */
  totalLiveDomains: number;
  totalLostDomains: number;
}

export interface AnalyzeResponse extends AnalysisPayload {
  cached: boolean;
  demo?: boolean;
}

export interface ApiError {
  error: string;
  code: "invalid_domain" | "rate_limited" | "budget_exhausted" | "provider_error" | "not_found" | "internal";
  retryAfter?: number;
}
