/**
 * The Juiceflow link-equity model.
 *
 * It follows the same ideas behind Google's PageRank and Ahrefs' Domain Rating:
 *
 *  1. A link is worth more when the page/site it sits on has more authority.
 *     Authority scores (DR, page authority) are logarithmic: a few points at
 *     the top of the scale mean a lot more equity than at the bottom. We undo
 *     the log so authority becomes a linear "flow at the spring".
 *     DataForSEO's per-link rank sits ~100 points (0–1000 scale) below the page's rank for every 10×
 *     more links on that page. That matches PageRank splitting equity across links when
 *     100 points = 10× equity, so we use that conversion.
 *  2. A page splits its equity between all the links it contains, so the
 *     more outgoing links the linking page has, the thinner your share.
 *  3. Nofollow / UGC / sponsored links pass (almost) nothing.
 *  4. Links in the main content pass more than footer, nav or sidebar links
 *     (Google's "reasonable surfer" idea).
 *  5. Spammy sites are discounted: search engines mostly ignore their links.
 *  6. A link that points at a broken page leaks its equity; lost links pass
 *     nothing (but are worth reclaiming).
 *  7. Extra links from the same domain add only a little (diminishing returns).
 *
 *  juice = damping × 10^(A / decade) × 1/L × follow × placement × type × spam × status × multi
 *
 * The model is deliberately transparent: every factor is returned so the UI
 * can show the full "recipe" for each stream of juice.
 */
import { categorize, type Category, CATEGORY_ORDER } from "./categories";
import { rootDomain } from "./domain";
import type { AnalysisPayload, RawLink } from "./types";

export interface ModelParams {
  /** Weight of page authority vs. domain rating when blending them (log space). */
  pageWeight: number;
  /** Rank points (0–1000 scale) that correspond to 10× more equity. */
  decade: number;
  /** How much internal links on the linking page count toward dilution. */
  internalWeight: number;
  /** PageRank damping factor. */
  damping: number;
  /** Multiplier for nofollow / ugc / sponsored links. */
  nofollow: number;
  /** Multiplier by link placement on the page. */
  placement: Record<string, number>;
  /** Multiplier by link type. */
  itemType: Record<string, number>;
  /** Spam score at or below which there is no penalty. */
  spamSafe: number;
  /** Spam score at which a source counts as toxic. */
  spamToxic: number;
  /** Multiplier for the most toxic sources. */
  spamFloor: number;
  /** Multiplier when the target URL redirects. */
  redirect: number;
  /** Extra equity per 10× more links from the same domain. */
  multiLinkBonus: number;
  /** Max number of decades counted for the bonus. */
  multiLinkCap: number;
  /** When a page's own authority is unknown, estimate it as this fraction of its domain's rank (deep pages are weaker than the domain). */
  unknownPageFactor: number;
  /** Cap on the domain rating credited to user-content subdomains (e.g. someone.substack.com) when page authority is unknown. */
  platformSubdomainCap: number;
  /** Links assumed to share a page when the provider doesn't know the page's link counts. */
  unknownDilution: number;
  /** Scale that lines the 0–100 Juice Score up with a familiar domain-rating scale. */
  scoreScale: number;
}

export const DEFAULT_PARAMS: ModelParams = {
  pageWeight: 0.75,
  decade: 100,
  internalWeight: 0.5,
  damping: 0.85,
  nofollow: 0.1,
  placement: {
    article: 1,
    main: 1,
    section: 0.95,
    blockquote: 0.95,
    figure: 0.9,
    details: 0.85,
    table: 0.85,
    unknown: 0.8,
    form: 0.5,
    header: 0.6,
    nav: 0.5,
    aside: 0.5,
    footer: 0.35,
  },
  itemType: {
    anchor: 1,
    image: 0.85,
    redirect: 0.9,
    canonical: 0.8,
    other: 0.3,
  },
  spamSafe: 30,
  spamToxic: 60,
  spamFloor: 0.05,
  redirect: 0.9,
  multiLinkBonus: 0.1,
  multiLinkCap: 3,
  unknownPageFactor: 0.5,
  platformSubdomainCap: 450,
  unknownDilution: 30,
  scoreScale: 0.87,
};

export type Health = "clean" | "suspicious" | "toxic" | "nofollow" | "leak" | "lost";

export interface JuiceFactors {
  /** Domain rating of the linking site, 0–100. */
  dr: number;
  /** Authority of the linking page, 0–100. */
  pageAuthority: number;
  /** Blended authority used by the model, 0–100. */
  authority: number;
  /** Linear equity at the spring: 10^(A/decade). */
  springFlow: number;
  /** True when the page's own authority was unknown and estimated from its domain. */
  authorityEstimated: boolean;
  /** Links to other sites on the linking page. */
  outgoing: number;
  /** True when the provider didn't know the page's link counts. */
  dilutionEstimated: boolean;
  /** Effective number of links sharing the page's equity. */
  dilution: number;
  /** Your share of the page's equity (1 / dilution). */
  share: number;
  follow: number;
  placement: number;
  placementLabel: string;
  type: number;
  /** Spam score used, 0–100. */
  spamScore: number;
  spam: number;
  status: number;
  multi: number;
  /** Product of all quality multipliers. */
  quality: number;
}

export interface JuiceSource {
  id: string;
  link: RawLink;
  root: string;
  category: Category;
  health: Health;
  factors: JuiceFactors;
  /** Juice actually delivered. */
  juice: number;
  /** Juice this link would deliver if it were live and pointed at a working page. */
  potential: number;
  /** Fraction of the total delivered juice, 0–1. */
  share: number;
  /** 0-based position when sorted by juice (lost links are ranked separately). */
  rank: number;
  notes: string[];
}

export interface Insight {
  id: string;
  tone: "good" | "info" | "warn" | "bad";
  title: string;
  body: string;
  metric?: string;
  sourceIds?: string[];
}

export interface CategoryTotal {
  category: Category;
  juice: number;
  share: number;
  count: number;
}

export interface JuiceResult {
  target: string;
  sources: JuiceSource[];
  lost: JuiceSource[];
  total: number;
  /** Extra juice available from fixing leaks and reclaiming lost links. */
  reclaimable: number;
  score: number;
  scoreIfFixed: number;
  byCategory: CategoryTotal[];
  byHealth: Record<Health, { count: number; juice: number; potential: number }>;
  insights: Insight[];
  coverage: { sampled: number; total: number };
  /** Links ignored because they come from search caches, translators or archives. */
  ignored: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function spamMultiplier(score: number, p: ModelParams = DEFAULT_PARAMS): number {
  if (score <= p.spamSafe) return 1;
  if (score <= p.spamToxic) return 1 - 0.5 * ((score - p.spamSafe) / Math.max(1, p.spamToxic - p.spamSafe));
  const toxicEnd = Math.min(100, p.spamToxic + 20);
  if (score <= toxicEnd) {
    const t = (score - p.spamToxic) / Math.max(1, toxicEnd - p.spamToxic);
    return Math.max(p.spamFloor, 0.5 + (p.spamFloor - 0.5) * t);
  }
  return p.spamFloor;
}

const PLACEMENT_LABEL: Record<string, string> = {
  article: "in the article",
  main: "in the main content",
  section: "in a content section",
  blockquote: "in a quote",
  figure: "in a figure",
  details: "in an expandable section",
  table: "in a table",
  form: "in a form",
  unknown: "placement unknown",
  header: "in the header",
  nav: "in the navigation",
  aside: "in a sidebar",
  footer: "in the footer",
};

/** Is this link nofollow-ish (nofollow, ugc, sponsored)? */
export function isNofollow(link: RawLink): boolean {
  if (!link.dofollow) return true;
  const attrs = link.attributes.map((a) => a.toLowerCase());
  return attrs.includes("nofollow") || attrs.includes("ugc") || attrs.includes("sponsored");
}

export function isLeak(link: RawLink): boolean {
  return link.isBroken || (link.statusTo != null && link.statusTo >= 400);
}

export function spamScoreOf(link: RawLink): number {
  return Math.max(link.spamDomain ?? 0, link.spamLink ?? 0);
}

/** Compute every factor for one link. `forceLive` evaluates lost/broken links as if they worked. */
const PLATFORM_SUFFIXES = [
  "substack.com", "beehiiv.com", "medium.com", "blogspot.com", "wordpress.com", "tumblr.com", "github.io", "gitlab.io",
  "pages.dev", "vercel.app", "netlify.app", "web.app", "firebaseapp.com", "herokuapp.com", "wixsite.com", "weebly.com",
  "squarespace.com", "notion.site", "carrd.co", "ghost.io", "hashnode.dev", "webflow.io", "framer.website", "framer.ai",
  "livejournal.com", "typepad.com", "over-blog.com", "jimdofree.com", "jimdosite.com", "mystrikingly.com", "glitch.me",
  "replit.app", "bubbleapps.io", "softr.app", "super.site", "mailchimpsites.com", "start.page", "linktr.ee",
];

/** someone.substack.com, me.github.io, ... (the platform's own www/root is not included). */
export function isPlatformSubdomain(host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, "");
  return PLATFORM_SUFFIXES.some((suf) => h.endsWith("." + suf));
}

/** Search-engine caches, translators and archives: not real editorial links. */
const MIRROR_RE = /(^|\.)(bing\.com|bingj\.com|googleusercontent\.com|translate\.goog|webcache\.[a-z.]+|web\.archive\.org|archive\.(ph|is|today|li|vn|md)|cachedview\.[a-z]+)$/;
export function isMirror(host: string): boolean {
  return MIRROR_RE.test(host.toLowerCase());
}

/** Compute every factor for one link. `forceLive` evaluates lost/broken links as if they worked. */
export function computeFactors(link: RawLink, p: ModelParams = DEFAULT_PARAMS, forceLive = false): JuiceFactors {
  const D = clamp(link.domainRank || 0, 0, 1000);
  const authorityEstimated = !(link.pageRank > 0);
  let P: number;
  if (!authorityEstimated) {
    P = clamp(link.pageRank, 0, 1000);
  } else {
    const dEff = isPlatformSubdomain(link.domain) ? Math.min(D, p.platformSubdomainCap) : D;
    P = Math.max(0, dEff * p.unknownPageFactor);
  }
  const A = p.pageWeight * P + (1 - p.pageWeight) * D;
  const springFlow = Math.pow(10, A / p.decade);

  const dilutionEstimated = !(link.extLinks > 0) && !(link.intLinks > 0);
  const outgoing = Math.max(1, Math.round(link.extLinks || 0));
  const dilution = dilutionEstimated ? p.unknownDilution : Math.max(1, outgoing + p.internalWeight * Math.max(0, link.intLinks || 0));
  const share = 1 / dilution;

  const follow = isNofollow(link) ? p.nofollow : 1;
  const placementKey = link.placement && p.placement[link.placement] != null ? link.placement : "unknown";
  const placement = p.placement[placementKey] ?? 0.8;
  const typeKey = p.itemType[link.itemType] != null ? link.itemType : "other";
  const type = p.itemType[typeKey] ?? p.itemType.other ?? 0.3;

  const spamScore = spamScoreOf(link);
  const spam = spamMultiplier(spamScore, p);

  let status = 1;
  if (!forceLive) {
    if (link.isLost || isLeak(link)) status = 0;
    else if (link.statusTo != null && link.statusTo >= 300 && link.statusTo < 400) status = p.redirect;
  }

  const extra = Math.log10(Math.max(1, link.groupCount || 1));
  const multi = 1 + p.multiLinkBonus * Math.min(extra, p.multiLinkCap);

  const quality = follow * placement * type * spam * status * multi;
  return {
    dr: D / 10,
    pageAuthority: P / 10,
    authority: A / 10,
    springFlow,
    authorityEstimated,
    outgoing,
    dilutionEstimated,
    dilution,
    share,
    follow,
    placement,
    placementLabel: PLACEMENT_LABEL[placementKey] ?? placementKey,
    type,
    spamScore,
    spam,
    status,
    multi,
    quality,
  };
}

export function juiceOf(f: JuiceFactors, p: ModelParams = DEFAULT_PARAMS): number {
  return p.damping * f.springFlow * f.share * f.quality;
}

export function healthOf(link: RawLink, p: ModelParams = DEFAULT_PARAMS): Health {
  if (link.isLost) return "lost";
  if (isLeak(link)) return "leak";
  const s = spamScoreOf(link);
  if (s >= p.spamToxic) return "toxic";
  if (isNofollow(link)) return "nofollow";
  if (s > p.spamSafe) return "suspicious";
  return "clean";
}

/** Score on a 0–100 scale: the authority one perfect link (no other links on its page) would need to deliver this much juice. */
export function scoreOf(total: number, p: ModelParams = DEFAULT_PARAMS): number {
  if (!(total > 0)) return 0;
  return clamp((p.decade / 10) * Math.log10(1 + total / p.damping) * p.scoreScale, 0, 100);
}

function notesFor(src: JuiceSource, p: ModelParams): string[] {
  const n: string[] = [];
  const f = src.factors;
  const l = src.link;
  if (src.health === "leak") n.push(`Points to a broken page (${l.statusTo ?? "error"}). The juice spills before it reaches you.`);
  if (src.health === "lost") n.push("This link was removed. The stream has dried up.");
  if (f.follow < 1) n.push("Nofollow / UGC / sponsored: search engines pass only a trickle.");
  if (f.spamScore >= p.spamToxic) n.push(`Spam score ${Math.round(f.spamScore)}: likely ignored by search engines.`);
  else if (f.spamScore > p.spamSafe) n.push(`Spam score ${Math.round(f.spamScore)}: partially discounted.`);
  if (f.outgoing >= 100) n.push(`Its page links out to ${f.outgoing} sites, so your share is tiny.`);
  if (f.authorityEstimated) n.push("Page authority not measured yet; estimated from the domain.");
  if (f.dilutionEstimated) n.push(`Link count on the page unknown; assumed ${p.unknownDilution}.`);
  if (f.placement < 0.7) n.push(`Sits ${f.placementLabel}. In-content links pass more.`);
  if (l.statusTo != null && l.statusTo >= 300 && l.statusTo < 400) n.push(`Points to a redirect (${l.statusTo}); a little juice is lost on the hop.`);
  if (l.groupCount > 1) n.push(`${l.groupCount.toLocaleString("en-US")} links from this domain in total.`);
  return n;
}

const gainText = (gain: number, total: number) => (total > 0 && gain / total >= 0.0005 ? `+${pct(gain / total)}` : undefined);

const pct = (x: number) => {
  const v = x * 100;
  if (v >= 10) return `${Math.round(v)}%`;
  if (v >= 1) return `${v.toFixed(1)}%`;
  return `${v.toFixed(2)}%`;
};

function buildInsights(r: Omit<JuiceResult, "insights">, p: ModelParams): Insight[] {
  const out: Insight[] = [];
  const s = r.sources;
  if (!s.length) {
    out.push({
      id: "dry",
      tone: "bad",
      title: "No juice is flowing yet",
      body: "We couldn't find live backlinks to this site. Every stream starts with one link: get listed by partners, suppliers or communities you're part of.",
    });
    return out;
  }

  const top = s[0]!;
  out.push({
    id: "strongest",
    tone: "good",
    title: `Strongest stream: ${top.root}`,
    body: `DR ${Math.round(top.factors.dr)}, ${top.factors.dilutionEstimated ? "an unknown number of" : top.factors.outgoing} outgoing link${top.factors.outgoing === 1 && !top.factors.dilutionEstimated ? "" : "s"} on the page${top.link.placement ? `, ${top.factors.placementLabel}` : ""}. It supplies ${pct(top.share)} of your juice.`,
    metric: pct(top.share),
    sourceIds: [top.id],
  });

  const top3 = s.slice(0, 3).reduce((a, x) => a + x.share, 0);
  if (s.length >= 4) {
    out.push({
      id: "concentration",
      tone: top.share > 0.5 ? "warn" : "info",
      title: top.share > 0.5 ? `One source supplies ${pct(top.share)} of your juice` : `Top 3 sources supply ${pct(top3)} of your juice`,
      body:
        top.share > 0.5
          ? "Your flow depends heavily on a single link. Losing it would drain most of your juice, so diversify."
          : "Link equity is naturally concentrated: a few strong links outweigh many weak ones.",
      metric: pct(top.share > 0.5 ? top.share : top3),
      sourceIds: s.slice(0, 3).map((x) => x.id),
    });
  }

  const leaks = s.filter((x) => x.health === "leak").sort((a, b) => b.potential - a.potential);
  if (leaks.length) {
    const gain = leaks.reduce((a, x) => a + x.potential, 0);
    out.push({
      id: "leaks",
      tone: "bad",
      title: `${leaks.length} leaking link${leaks.length === 1 ? "" : "s"}`,
      body: `${leaks.length === 1 ? "A link points" : "Links point"} to pages on your site that return errors. 301-redirect those URLs to live pages to plug the leak${gainText(gain, r.total) ? ` (${gainText(gain, r.total)} juice)` : ""}.`,
      metric: gainText(gain, r.total),
      sourceIds: leaks.slice(0, 8).map((x) => x.id),
    });
  }

  if (r.lost.length) {
    const best = r.lost.slice(0, 5);
    const gain = best.reduce((a, x) => a + x.potential, 0);
    out.push({
      id: "lost",
      tone: "warn",
      title: `${r.lost.length} lost link${r.lost.length === 1 ? "" : "s"}`,
      body: `Recently lost links include ${best
        .slice(0, 3)
        .map((x) => `${x.root} (DR ${Math.round(x.factors.dr)})`)
        .join(", ")}.${gainText(gain, r.total) ? ` Winning back the top 5 could add about ${gainText(gain, r.total)} juice.` : " Winning them back is often just a polite email."}`,
      metric: gainText(gain, r.total),
      sourceIds: best.map((x) => x.id),
    });
  }

  const toxic = s.filter((x) => x.health === "toxic");
  if (toxic.length) {
    out.push({
      id: "toxic",
      tone: "warn",
      title: `${toxic.length} spammy source${toxic.length === 1 ? "" : "s"}`,
      body: `These sites have a spam score of ${p.spamToxic}+. Search engines mostly ignore them, so they add almost nothing. You only need to disavow them if you bought them or they're part of a manipulative scheme.`,
      sourceIds: toxic.slice(0, 8).map((x) => x.id),
    });
  }

  const nofollow = s.filter((x) => x.health === "nofollow");
  if (nofollow.length) {
    out.push({
      id: "nofollow",
      tone: "info",
      title: `${pct(nofollow.length / s.length)} of sources are nofollow`,
      body: "Nofollow, UGC and sponsored links send visitors but pass only a trickle of juice, so their streams are thin.",
      sourceIds: nofollow.slice(0, 8).map((x) => x.id),
    });
  }

  const boiler = s.filter((x) => x.factors.placement < 0.7 && x.factors.follow === 1 && x.factors.status > 0);
  if (boiler.length >= 3) {
    out.push({
      id: "placement",
      tone: "info",
      title: `${boiler.length} links sit in footers, sidebars or menus`,
      body: "Sitewide and boilerplate links pass less than a link inside an article. Ask your best partners for an in-content mention.",
      sourceIds: boiler.slice(0, 8).map((x) => x.id),
    });
  }

  const diluted = s.filter((x) => x.factors.outgoing >= 100);
  if (diluted.length) {
    out.push({
      id: "dilution",
      tone: "info",
      title: `${diluted.length} source${diluted.length === 1 ? "" : "s"} split${diluted.length === 1 ? "s" : ""} juice 100+ ways`,
      body: "Those pages link out to 100 or more sites (directories, link lists), so each link gets a tiny share.",
      sourceIds: diluted.slice(0, 8).map((x) => x.id),
    });
  }

  if (r.coverage.total > r.coverage.sampled) {
    out.push({
      id: "coverage",
      tone: "info",
      title: `Showing your strongest ${r.coverage.sampled.toLocaleString("en-US")} of ${r.coverage.total.toLocaleString("en-US")} linking sites`,
      body: "Because equity is so concentrated, the long tail of weak links adds little to the total.",
    });
  }
  return out;
}

export function runModel(payload: AnalysisPayload, p: ModelParams = DEFAULT_PARAMS): JuiceResult {
  const make = (link: RawLink): JuiceSource => {
    const factors = computeFactors(link, p);
    const juice = juiceOf(factors, p);
    const potential = factors.status === 0 ? juiceOf(computeFactors(link, p, true), p) : juice;
    return {
      id: link.domain,
      link,
      root: rootDomain(link.domain),
      category: categorize(link),
      health: healthOf(link, p),
      factors,
      juice,
      potential,
      share: 0,
      rank: 0,
      notes: [],
    };
  };

  const real = payload.links.filter((l) => !isMirror(l.domain));
  const ignored = payload.links.length - real.length;
  const sources = real.map(make).sort((a, b) => b.juice - a.juice || b.potential - a.potential);
  const total = sources.reduce((a, x) => a + x.juice, 0);
  sources.forEach((s, i) => {
    s.share = total > 0 ? s.juice / total : 0;
    s.rank = i;
  });

  const lost = payload.lost
    .filter((l) => !isMirror(l.domain))
    .map((l) => make({ ...l, isLost: true }))
    .sort((a, b) => b.potential - a.potential);
  lost.forEach((s, i) => (s.rank = i));

  const leakGain = sources.filter((x) => x.health === "leak").reduce((a, x) => a + x.potential, 0);
  const lostGain = lost.slice(0, 5).reduce((a, x) => a + x.potential, 0);
  const reclaimable = leakGain + lostGain;

  const byCategoryMap = new Map<Category, CategoryTotal>();
  for (const c of CATEGORY_ORDER) byCategoryMap.set(c, { category: c, juice: 0, share: 0, count: 0 });
  for (const s of sources) {
    const t = byCategoryMap.get(s.category)!;
    t.juice += s.juice;
    t.count += 1;
  }
  const byCategory = [...byCategoryMap.values()]
    .filter((c) => c.count > 0)
    .map((c) => ({ ...c, share: total > 0 ? c.juice / total : 0 }))
    .sort((a, b) => b.juice - a.juice);

  const byHealth = {
    clean: { count: 0, juice: 0, potential: 0 },
    suspicious: { count: 0, juice: 0, potential: 0 },
    toxic: { count: 0, juice: 0, potential: 0 },
    nofollow: { count: 0, juice: 0, potential: 0 },
    leak: { count: 0, juice: 0, potential: 0 },
    lost: { count: 0, juice: 0, potential: 0 },
  } satisfies JuiceResult["byHealth"];
  for (const s of [...sources, ...lost]) {
    const h = byHealth[s.health];
    h.count += 1;
    h.juice += s.juice;
    h.potential += s.potential;
  }

  const base: Omit<JuiceResult, "insights"> = {
    target: payload.target,
    sources,
    lost,
    total,
    reclaimable,
    score: scoreOf(total, p),
    scoreIfFixed: scoreOf(total + reclaimable, p),
    byCategory,
    byHealth,
    coverage: { sampled: real.length, total: Math.max(payload.totalLiveDomains - ignored, real.length) },
    ignored,
  };
  for (const s of [...sources, ...lost]) s.notes = notesFor(s, p);
  return { ...base, insights: buildInsights(base, p) };
}
