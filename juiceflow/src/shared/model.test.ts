import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { normalizeDomain, rootDomain } from "./domain";
import { categorize } from "./categories";
import { computeFactors, DEFAULT_PARAMS, healthOf, isMirror, isPlatformSubdomain, juiceOf, runModel, scoreOf, spamMultiplier } from "./model";
import type { AnalysisPayload, RawLink } from "./types";

const link = (over: Partial<RawLink> = {}): RawLink => ({
  domain: "example.org",
  url: "https://example.org/post",
  title: "A post",
  urlTo: "https://target.com/",
  anchor: "target",
  context: null,
  domainRank: 500,
  pageRank: 500,
  linkRank: 400,
  extLinks: 10,
  intLinks: 20,
  dofollow: true,
  attributes: [],
  itemType: "anchor",
  placement: "article",
  spamLink: 0,
  spamDomain: 0,
  statusTo: 200,
  isBroken: false,
  isLost: false,
  isNew: false,
  firstSeen: null,
  lastSeen: null,
  groupCount: 1,
  platform: [],
  country: null,
  tld: "org",
  language: "en",
  ...over,
});

const juice = (l: RawLink) => juiceOf(computeFactors(l));

describe("normalizeDomain", () => {
  test.each([
    ["https://www.Example.com/blog?x=1", "example.com"],
    ["example.com", "example.com"],
    ["http://blog.example.co.uk:8080/", "blog.example.co.uk"],
    ["  WWW.figma.com  ", "figma.com"],
    ["user@site.io/path", "site.io"],
    ["bücher.de", "xn--bcher-kva.de"],
  ])("%s -> %s", (input, out) => expect(normalizeDomain(input)).toBe(out));

  test.each(["", "localhost", "not a domain", "http://", "1.2.3.4", "-bad.com", "exa_mple.com"])("rejects %s", (input) => {
    expect(normalizeDomain(input)).toBeNull();
  });

  test("rootDomain groups subdomains", () => {
    expect(rootDomain("docs.github.com")).toBe("github.com");
    expect(rootDomain("www.bbc.co.uk")).toBe("bbc.co.uk");
    expect(rootDomain("plausible.io")).toBe("plausible.io");
  });
});

describe("factors", () => {
  test("more authority means more juice, steeply (100 rank points = 10x)", () => {
    const lo = juice(link({ pageRank: 400, domainRank: 400 }));
    const hi = juice(link({ pageRank: 500, domainRank: 500 }));
    expect(hi / lo).toBeCloseTo(10, 5);
  });

  test("outgoing links dilute your share", () => {
    expect(juice(link({ extLinks: 100 }))).toBeLessThan(juice(link({ extLinks: 5 })));
    const f = computeFactors(link({ extLinks: 10, intLinks: 20 }));
    expect(f.dilution).toBe(10 + 0.5 * 20);
    expect(f.share).toBeCloseTo(1 / 20);
  });

  test("nofollow passes only a trickle", () => {
    const ratio = juice(link({ dofollow: false })) / juice(link());
    expect(ratio).toBeCloseTo(DEFAULT_PARAMS.nofollow);
    expect(healthOf(link({ attributes: ["sponsored"] }))).toBe("nofollow");
  });

  test("footer links pass less than in-content links", () => {
    expect(juice(link({ placement: "footer" }))).toBeLessThan(juice(link({ placement: "article" })));
  });

  test("spam multiplier is monotonic and bounded", () => {
    let prev = 2;
    for (let s = 0; s <= 100; s += 5) {
      const m = spamMultiplier(s);
      expect(m).toBeLessThanOrEqual(prev);
      expect(m).toBeGreaterThanOrEqual(DEFAULT_PARAMS.spamFloor);
      expect(m).toBeLessThanOrEqual(1);
      prev = m;
    }
    expect(spamMultiplier(10)).toBe(1);
    expect(healthOf(link({ spamDomain: 75 }))).toBe("toxic");
  });

  test("broken targets leak: no juice delivered, but potential is kept", () => {
    const l = link({ statusTo: 404 });
    const f = computeFactors(l);
    expect(juiceOf(f)).toBe(0);
    expect(juiceOf(computeFactors(l, DEFAULT_PARAMS, true))).toBeGreaterThan(0);
    expect(healthOf(l)).toBe("leak");
  });

  test("unknown page authority is estimated conservatively from the domain", () => {
    const f = computeFactors(link({ pageRank: 0, domainRank: 600 }));
    expect(f.authorityEstimated).toBe(true);
    expect(f.pageAuthority).toBeCloseTo(30);
    expect(juice(link({ pageRank: 0, domainRank: 600 }))).toBeLessThan(juice(link({ pageRank: 600, domainRank: 600 })));
  });

  test("user-content subdomains don't inherit the whole platform's authority", () => {
    expect(isPlatformSubdomain("someone.substack.com")).toBe(true);
    expect(isPlatformSubdomain("substack.com")).toBe(false);
    const a = juice(link({ domain: "someone.beehiiv.com", pageRank: 0, domainRank: 700 }));
    const b = juice(link({ domain: "news.example.com", pageRank: 0, domainRank: 700 }));
    expect(a).toBeLessThan(b);
  });

  test("unknown link counts fall back to a typical page", () => {
    const f = computeFactors(link({ extLinks: 0, intLinks: 0 }));
    expect(f.dilutionEstimated).toBe(true);
    expect(f.dilution).toBe(DEFAULT_PARAMS.unknownDilution);
  });

  test("extra links from the same domain add a little, capped", () => {
    const one = computeFactors(link({ groupCount: 1 })).multi;
    const many = computeFactors(link({ groupCount: 1e9 })).multi;
    expect(one).toBe(1);
    expect(many).toBeCloseTo(1 + DEFAULT_PARAMS.multiLinkBonus * DEFAULT_PARAMS.multiLinkCap);
  });

  test("score is monotonic", () => {
    expect(scoreOf(0)).toBe(0);
    expect(scoreOf(1e6)).toBeGreaterThan(scoreOf(1e3));
    expect(scoreOf(1e30)).toBe(100);
  });
});

describe("categories & mirrors", () => {
  test("categorize", () => {
    expect(categorize({ domain: "cs.stanford.edu", platform: [] })).toBe("institutions");
    expect(categorize({ domain: "www.gov.uk", platform: [] })).toBe("institutions");
    expect(categorize({ domain: "erlef.org", platform: ["unknown"] })).toBe("organizations");
    expect(categorize({ domain: "thulite.io", platform: [] })).toBe("tech");
    expect(categorize({ domain: "fotbollsfeber.se", platform: [] })).toBe("international");
    expect(categorize({ domain: "example.com", platform: ["blogs"] })).toBe("blogs");
    expect(categorize({ domain: "example.com", platform: [] })).toBe("web");
  });
  test("search caches and archives are not real links", () => {
    expect(isMirror("4.bing.com")).toBe(true);
    expect(isMirror("web.archive.org")).toBe(true);
    expect(isMirror("bingo.com")).toBe(false);
  });
});

describe("runModel on real data", () => {
  // the demo sites, plus older snapshots kept as test fixtures
  const files = ["figma.com", "plausible.io", "handlepilot.com", "gcore.com"].map((d) => `public/demo/${d}.json`);
  files.push(...["thulite.io", "gethyas.com", "irishroots.ie"].map((d) => `fixtures/${d}.json`));
  for (const file of files) {
    test(file, () => {
      const payload = JSON.parse(readFileSync(file, "utf8")) as AnalysisPayload;
      const r = runModel(payload);
      expect(r.sources.length).toBeGreaterThan(0);
      const sum = r.sources.reduce((a, s) => a + s.share, 0);
      expect(sum).toBeCloseTo(1, 6);
      for (let i = 1; i < r.sources.length; i++) expect(r.sources[i - 1]!.juice).toBeGreaterThanOrEqual(r.sources[i]!.juice);
      expect(r.score).toBeGreaterThan(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.scoreIfFixed).toBeGreaterThanOrEqual(r.score);
      expect(r.sources.some((s) => isMirror(s.id))).toBe(false);
      expect(r.insights.length).toBeGreaterThan(1);
      // Calibration: the Juice Score should land within ~20 points of the provider's domain rating.
      if (payload.summary) expect(Math.abs(r.score - payload.summary.rank / 10)).toBeLessThan(20);
    });
  }

  test("a site with no links gets a dry insight", () => {
    const r = runModel({ version: 1, target: "new.site", fetchedAt: "", cost: 0, summary: null, links: [], lost: [], totalLiveDomains: 0, totalLostDomains: 0 });
    expect(r.score).toBe(0);
    expect(r.insights[0]!.id).toBe("dry");
  });
});
