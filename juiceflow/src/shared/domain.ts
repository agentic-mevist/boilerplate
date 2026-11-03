/**
 * Turn whatever the user typed ("https://www.Example.com/blog?x=1") into the
 * host we analyze ("example.com"). Subdomains other than www are kept, so
 * "blog.example.com" analyzes just the blog.
 */
export function normalizeDomain(input: string): string | null {
  let s = (input || "").trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, ""); // scheme
  s = s.replace(/^[^@/]*@/, ""); // credentials
  s = s.split(/[/?#\s]/)[0] ?? "";
  s = s.replace(/:\d+$/, ""); // port
  s = s.replace(/\.$/, "");
  s = s.replace(/^www\d*\./, "");
  if (s.length < 3 || s.length > 253) return null;
  if (!/^[a-z0-9.-]+$/.test(s)) {
    // Allow IDNs typed in unicode by letting URL do punycode.
    try {
      s = new URL(`http://${s}`).hostname.replace(/^www\d*\./, "");
    } catch {
      return null;
    }
    if (!/^[a-z0-9.-]+$/.test(s)) return null;
  }
  const labels = s.split(".");
  if (labels.length < 2) return null;
  if (labels.some((l) => !l || l.length > 63 || l.startsWith("-") || l.endsWith("-"))) return null;
  const tld = labels[labels.length - 1]!;
  if (!/^(xn--[a-z0-9-]+|[a-z]{2,63})$/.test(tld)) return null;
  if (/^\d+$/.test(labels.join(""))) return null; // bare IPs are not supported
  return s;
}

const MULTI_PART_SUFFIXES = new Set([
  "co.uk", "org.uk", "ac.uk", "gov.uk", "me.uk", "ltd.uk", "plc.uk", "net.uk", "sch.uk",
  "com.au", "net.au", "org.au", "edu.au", "gov.au", "asn.au", "id.au",
  "co.nz", "org.nz", "govt.nz", "ac.nz", "net.nz",
  "co.jp", "ne.jp", "or.jp", "ac.jp", "go.jp",
  "com.br", "org.br", "gov.br", "edu.br", "net.br",
  "co.in", "org.in", "gov.in", "ac.in", "net.in", "edu.in",
  "co.za", "org.za", "gov.za", "ac.za",
  "com.cn", "org.cn", "gov.cn", "edu.cn", "net.cn",
  "com.mx", "org.mx", "gob.mx", "edu.mx",
  "com.tr", "org.tr", "gov.tr", "edu.tr",
  "co.kr", "or.kr", "go.kr", "ac.kr",
  "com.sg", "org.sg", "gov.sg", "edu.sg",
  "com.hk", "org.hk", "gov.hk", "edu.hk",
  "com.tw", "org.tw", "gov.tw", "edu.tw",
  "com.ar", "org.ar", "gob.ar", "edu.ar",
  "com.es", "org.es", "gob.es", "edu.es",
  "co.il", "org.il", "gov.il", "ac.il",
  "com.pl", "org.pl", "gov.pl", "edu.pl",
  "com.ua", "org.ua", "gov.ua", "edu.ua",
]);

/** "docs.github.com" -> "github.com", "www.bbc.co.uk" -> "bbc.co.uk". Good enough for grouping. */
export function rootDomain(host: string): string {
  const labels = host.toLowerCase().replace(/^www\d*\./, "").split(".");
  if (labels.length <= 2) return labels.join(".");
  const last2 = labels.slice(-2).join(".");
  if (MULTI_PART_SUFFIXES.has(last2)) return labels.slice(-3).join(".");
  return last2;
}

/** Display form: drop "www." but keep meaningful subdomains. */
export function displayHost(host: string): string {
  return host.toLowerCase().replace(/^www\d*\./, "");
}
