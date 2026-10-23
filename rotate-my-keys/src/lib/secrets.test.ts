import { describe, expect, it } from "vitest"

import { FAKE_KEYS, hallucinateKeys } from "@/lib/fake-keys"
import { countKeys, findSecrets, isSecretName, looksRandom, prepareKeys, summarize } from "@/lib/secrets"

// Fixtures are generated at runtime so this repo never contains anything
// shaped like a real credential (and secret scanners stay quiet).
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const random = rng(180)
const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
const pick = (chars: string, n: number) =>
  Array.from({ length: n }, () => chars[Math.floor(random() * chars.length)]).join("")
const alnum = (n: number) => pick(ALNUM, n)
const upperDigits = (n: number) => pick("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", n)
const hex = (n: number) => pick("0123456789abcdef", n)
const digits = (n: number) => pick("0123456789", n)
const urlsafe = (n: number) => pick(`${ALNUM}-_`, n)

const kindsIn = (text: string) => findSecrets(text).map((d) => d.kind.id)
const shown = (text: string) =>
  prepareKeys(text, { maxLength: 100_000 }).lines.map((line) => line.text).join("\n")

describe("findSecrets: known formats", () => {
  const BEGIN = "-----BEGIN"
  const cases: Array<[string, string]> = [
    ["private-key", `${BEGIN} RSA PRIVATE KEY-----\n${alnum(64)}\n${alnum(64)}\n-----END RSA PRIVATE KEY-----`],
    ["anthropic", `sk-ant-api03-${urlsafe(93)}AA`],
    ["openai", `sk-proj-${urlsafe(120)}`],
    ["openai", `sk-${alnum(48)}`],
    ["github", `ghp_${alnum(36)}`],
    ["github", `github_pat_${alnum(22)}_${alnum(59)}`],
    ["gitlab", `glpat-${urlsafe(20)}`],
    ["aws", `AKIA${upperDigits(16)}`],
    ["google", `AIza${urlsafe(35)}`],
    ["google-oauth", `GOCSPX-${urlsafe(28)}`],
    ["slack", `xoxb-${digits(12)}-${digits(13)}-${alnum(24)}`],
    ["slack-webhook", `https://hooks.slack.com/services/T${upperDigits(10)}/B${upperDigits(10)}/${alnum(24)}`],
    ["stripe", `sk_live_${alnum(24)}`],
    ["huggingface", `hf_${alnum(34)}`],
    ["npm", `npm_${alnum(36)}`],
    ["pypi", `pypi-AgEIcHlwaS5vcmc${urlsafe(70)}`],
    ["sendgrid", `SG.${urlsafe(22)}.${urlsafe(43)}`],
    ["twilio", `SK${hex(32)}`],
    ["discord", `M${alnum(25)}.${urlsafe(6)}.${urlsafe(38)}`],
    ["telegram", `${digits(10)}:AA${urlsafe(33)}`],
    ["groq", `gsk_${alnum(52)}`],
    ["xai", `xai-${alnum(80)}`],
    ["digitalocean", `dop_v1_${hex(64)}`],
    ["shopify", `shpat_${hex(32)}`],
    ["supabase", `sbp_${hex(40)}`],
    ["mailgun", `key-${hex(32)}`],
    ["jwt", `eyJ${urlsafe(30)}.eyJ${urlsafe(40)}.${urlsafe(43)}`],
  ]

  it.each(cases)("detects %s", (kind, secret) => {
    expect(kindsIn(`  ${secret}  `)).toEqual([kind])
    expect(kindsIn(`export SOMETHING="${secret}"`)[0]).toBe(kind)
  })

  it("only flags the password part of a URL", () => {
    const text = "postgres://admin:S3cr3t-pass@db.example.com:5432/app"
    const [d] = findSecrets(text)
    expect(d.kind.id).toBe("url-password")
    expect(text.slice(d.start, d.end)).toBe("S3cr3t-pass")
  })

  it("flags secret-looking assignments", () => {
    const text = "ADMIN_PASSWORD=Tr0ub4dor&3"
    const [d] = findSecrets(text)
    expect(d.kind.id).toBe("assignment")
    expect(text.slice(d.start, d.end)).toBe("Tr0ub4dor&3")
  })

  it("prefers the specific format over the generic ones", () => {
    expect(kindsIn(`GITHUB_TOKEN=ghp_${alnum(36)}`)).toEqual(["github"])
  })

  it("summarizes by kind", () => {
    const text = [`ghp_${alnum(36)}`, `ghp_${alnum(36)}`, `AKIA${upperDigits(16)}`].join("\n")
    expect(summarize(findSecrets(text)).map((s) => [s.kind.id, s.count])).toEqual([
      ["github", 2],
      ["aws", 1],
    ])
  })
})

describe("looksRandom", () => {
  it("catches random mixed-case tokens", () => {
    const tokens = Array.from({ length: 300 }, (_, i) => alnum(24 + (i % 25)))
    const caught = tokens.filter(looksRandom).length
    expect(caught / tokens.length).toBeGreaterThan(0.95)
  })

  it("catches long hex and UUIDs", () => {
    for (let i = 0; i < 100; i++) expect(looksRandom(hex(40))).toBe(true)
    expect(looksRandom(`${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`)).toBe(true)
  })

  it("catches random lowercase base36", () => {
    const tokens = Array.from({ length: 200 }, () => pick("abcdefghijklmnopqrstuvwxyz0123456789", 40))
    expect(tokens.filter(looksRandom).length / tokens.length).toBeGreaterThan(0.9)
  })

  it.each([
    "ThisIsAFakeTokenObviously2024",
    "NotARealKeyJustAVibe",
    "TheQuickBrownFox2025JumpedOverTheLazyDog",
    "SuperSecretPasswordForMyServer9",
    "correct-horse-battery-staple",
    "sk-fake-1234-definitely-not-real",
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "12345678901234567890123456789012",
    "https://github.com/settings/tokens",
  ])("leaves %s alone", (token) => {
    expect(looksRandom(token)).toBe(false)
  })
})

describe("fake keys", () => {
  it("never look real", () => {
    expect(findSecrets(FAKE_KEYS.join("\n"))).toEqual([])
    for (const key of FAKE_KEYS) expect(findSecrets(key)).toEqual([])
  })

  it("hallucinates distinct keys", () => {
    const keys = hallucinateKeys(5).split("\n")
    expect(keys).toHaveLength(5)
    expect(new Set(keys).size).toBe(5)
  })
})

describe("prepareKeys", () => {
  it("masks real-looking secrets but keeps their harmless prefix", () => {
    const { lines, detections } = prepareKeys(`hunter2\nghp_${alnum(36)}\n\n  sk-not-real  `)
    expect(detections).toHaveLength(1)
    expect(lines).toEqual([
      { text: "hunter2", redacted: false },
      { text: "ghp_••••••••••••", redacted: true },
      { text: "sk-not-real", redacted: false },
    ])
  })

  it("collapses a private key into one masked line", () => {
    const pem = `-----BEGIN PRIVATE KEY-----\n${alnum(64)}\n${alnum(64)}\n-----END PRIVATE KEY-----`
    const { lines } = prepareKeys(`before\n${pem}\nafter`)
    expect(lines.map((l) => l.text)).toEqual(["before", "-----BEGIN PRIVATE KEY-----••••••••••••", "after"])
    expect(lines[1].redacted).toBe(true)
  })

  it("caps how much it renders", () => {
    const text = Array.from({ length: 60 }, (_, i) => `key-number-${i}`).join("\n")
    const { lines, hidden } = prepareKeys(text, { maxLines: 50 })
    expect(lines).toHaveLength(50)
    expect(hidden).toBe(10)
    const long = prepareKeys("x".repeat(500), { maxLength: 200 }).lines[0].text
    expect(long).toHaveLength(200)
    expect(long.endsWith("…")).toBe(true)
  })

  it("counts non-empty lines", () => {
    expect(countKeys("a\n\n  \nb\nc")).toBe(3)
    expect(countKeys("")).toBe(0)
  })
})

describe("never half-masks a secret", () => {
  it.each([
    ["a # early in the value", "DB_PASSWORD=P#ssw0rd!2024", "ssw0rd!2024"],
    ["a # mid-value", "DB_PASSWORD=hunter22#Summer2024", "Summer2024"],
    ["a quoted passphrase", 'PASSWORD="correct horse battery staple"', "horse battery"],
    ["a JSON key", '"password": "Summer2024!Company"', "Summer2024"],
    ["a quoted YAML key", "'db_password': Summer2024!Company", "Summer2024"],
    ["_PASS", "DB_PASS=Summer2024!Company", "Summer2024"],
    ["a passphrase", "GPG_PASSPHRASE=Summer2024!Company", "Summer2024"],
    ["camelCase", "clientSecret: Summer2024!Company", "Summer2024"],
    ["a CLI flag", "mysql --password=Summer2024!Company", "Summer2024"],
    ["a long name", "SPRING_DATASOURCE_HIKARI_PRIMARY_REPLICA_POOL_PASSWORD=Summer2024!Company", "Summer2024"],
    ["the second of two", "user=bob password=Summer2024!Company", "Summer2024"],
    ["an @ in a URL password", "postgres://admin:p@ssw0rd!2024@db.example.com:5432/app", "ssw0rd"],
    ["a URL with no username", "redis://:Summer2024!Company@cache.example.com:6379/0", "Summer2024"],
    ["an Authorization header", "Authorization: Bearer Summer2024!Company", "Summer2024"],
  ])("with %s", (_, text, secretPart) => {
    expect(shown(text)).not.toContain(secretPart)
  })

  it("masks all of a long session token", () => {
    const token = `IQoJb3JpZ2luX2Vj${pick(`${ALNUM}+/`, 700)}`
    const out = shown(`export AWS_SESSION_TOKEN="${token}"`)
    for (let i = 0; i + 12 <= token.length; i += 12) expect(out).not.toContain(token.slice(i, i + 12))
  })

  it("leaves no tail of a long blob", () => {
    const blob = pick(`${ALNUM}+/`, 1039)
    expect(shown(`CREDS_B64=${blob}`)).not.toContain(blob.slice(-15))
    expect(shown(blob)).not.toContain(blob.slice(-15))
  })

  it("widens a detection to the whole token around it", () => {
    expect(shown(`ghp_${alnum(36)}/extra-${alnum(20)}`)).toBe("ghp_••••••••••••")
  })

  it("doesn't reveal how long a secret was", () => {
    expect(shown("PASSWORD=abcd")).toBe(shown(`PASSWORD=${"abcdefgh".repeat(10)}`))
  })
})

describe("finds keys where they hide", () => {
  it("in URL paths as often as anywhere else", () => {
    const tokens = Array.from({ length: 300 }, () => alnum(32))
    const caught = tokens.filter((token) => !shown(`https://api.example.com/v1/projects/${token}/settings`).includes(token))
    expect(caught.length / tokens.length).toBeGreaterThan(0.95)
  })

  it("in Telegram bot URLs", () => {
    expect(kindsIn(`https://api.telegram.org/bot${digits(10)}:AA${urlsafe(33)}/sendMessage`)).toContain("telegram")
  })

  it.each([
    ["OpenRouter", () => `sk-or-v1-${hex(64)}`],
    ["Databricks", () => `dapi${hex(32)}`],
    ["Mailchimp", () => `${hex(32)}-us21`],
  ])("behind a prefix (%s style)", (_, make) => {
    for (let i = 0; i < 200; i++) expect(findSecrets(make()).length).toBeGreaterThan(0)
  })

  it("in Azure client secrets", () => {
    for (let i = 0; i < 200; i++) {
      const secret = `${pick(`${ALNUM}_~.`, 3)}${digits(1)}Q~${pick(`${ALNUM}_~.-`, 34)}`
      expect(kindsIn(secret)).toEqual(["azure"])
    }
  })

  it("in Slack workflow trigger URLs", () => {
    const url = `https://hooks.slack.com/triggers/T${upperDigits(10)}/${digits(13)}/${alnum(32)}`
    expect(kindsIn(url)).toEqual(["slack-webhook"])
  })
})

describe("doesn't cry wolf", () => {
  it.each([
    "COMPASS: north",
    "secretary: Jane",
    "passport: valid",
    "Reset your password at the usual page",
    "Note: this is fine",
    "time: 10:30",
    "https://example.com:8080/path",
  ])("on %s", (text) => {
    expect(findSecrets(text)).toEqual([])
  })

  it.each([
    ["DB_PASS", true],
    ["clientSecret", true],
    ["x-api-key", true],
    ["APIKEY", true],
    ["GITHUB_TOKENS", true],
    ["Authorization", true],
    ["COMPASS", false],
    ["secretary", false],
    ["passport", false],
    ["monkey", false],
    ["TOKENIZER", false],
  ])("knows whether %s names a secret (%s)", (name, expected) => {
    expect(isSecretName(name)).toBe(expected)
  })
})

describe("performance", () => {
  it.each([
    ["url-ish", `a://a:${"b".repeat(19_990)}`],
    ["assignment-ish", "PASSWORD=".repeat(2_200)],
    ["name-ish", "key: ".repeat(4_000)],
    ["dash-ish", "a-".repeat(10_000)],
    ["at-ish", `a://:${"@".repeat(19_990)}`],
    ["jwt-ish", `eyJ${"a".repeat(19_990)}`],
    ["pem-ish", `-----BEGIN PRIVATE KEY-----${"x".repeat(19_970)}`],
    ["random", alnum(20_000)],
    ["spaced", `${"ab ".repeat(6_600)}`],
  ])("handles a 20k-character %s paste quickly", (_, text) => {
    const started = performance.now()
    findSecrets(text)
    expect(performance.now() - started).toBeLessThan(250)
  })
})
