import type { RawLink } from "./types";

export type Category =
  | "institutions"
  | "news"
  | "communities"
  | "blogs"
  | "shops"
  | "organizations"
  | "tech"
  | "international"
  | "web";

export const CATEGORY_META: Record<Category, { label: string; blurb: string }> = {
  institutions: { label: "Institutions", blurb: ".edu / .gov and other official sites" },
  news: { label: "News & media", blurb: "publishers and magazines" },
  communities: { label: "Communities", blurb: "forums, wikis and Q&A" },
  blogs: { label: "Blogs", blurb: "personal and company blogs" },
  shops: { label: "Shops", blurb: "e-commerce sites" },
  organizations: { label: "Organizations", blurb: ".org sites, projects and non-profits" },
  tech: { label: "Tech & tools", blurb: ".io / .dev / .ai / .app and friends" },
  international: { label: "International", blurb: "country-code domains" },
  web: { label: "Websites", blurb: ".com / .net and the rest of the web" },
};

export const CATEGORY_ORDER: Category[] = [
  "tech",
  "organizations",
  "institutions",
  "news",
  "communities",
  "blogs",
  "shops",
  "international",
  "web",
];

const TECH_TLDS = new Set([
  "io", "dev", "ai", "app", "tech", "sh", "so", "gg", "tools", "cloud", "software", "codes", "build",
  "run", "js", "page", "engineering", "systems", "network", "digital", "computer", "technology", "ml", "rs",
]);
const GENERIC_CCTLDS = new Set([
  // ccTLDs that are mostly used as generic or "hack" domains
  "io", "ai", "co", "me", "tv", "gg", "so", "sh", "ly", "fm", "am", "to", "cc", "ws", "la", "nu", "tk", "ml", "rs", "vc", "im",
]);
const INSTITUTION_RE = /(^|\.)(edu|gov|mil|int|ac|gob|gouv|govt|go|school|sch|k12)(\.[a-z]{2})?$/;

export function categorize(link: Pick<RawLink, "domain" | "platform">): Category {
  const host = link.domain.toLowerCase();
  const tld = host.split(".").pop() ?? "";
  const platform = new Set((link.platform ?? []).map((p) => p.toLowerCase()));

  if (INSTITUTION_RE.test(host)) return "institutions";
  if (platform.has("message-boards") || platform.has("wikis") || platform.has("forums") || /(^|\.)(forum|community|discuss|wiki)\./.test(host)) {
    return "communities";
  }
  if (platform.has("news") || platform.has("newspapers")) return "news";
  if (platform.has("blogs") || /(^|\.)blog\./.test(host) || host.includes("blogspot.") || host.endsWith("medium.com") || host.endsWith("substack.com")) {
    return "blogs";
  }
  if (platform.has("ecommerce")) return "shops";
  if (platform.has("organization") || tld === "org" || tld === "ngo" || tld === "foundation") return "organizations";
  if (TECH_TLDS.has(tld) || host.endsWith("github.io") || host.endsWith("pages.dev") || host.endsWith("vercel.app")) return "tech";
  if (tld.length === 2 && !GENERIC_CCTLDS.has(tld)) return "international";
  return "web";
}
