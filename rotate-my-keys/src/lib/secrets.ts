// Spots things that look like real credentials, so the page can tell people
// to go rotate them for real and keep them out of screenshots.
//
// Everything here runs locally on the text in the box. Every pattern is
// bounded or linear, so a hostile paste can't make them backtrack for long.

export interface SecretKind {
  id: string
  label: string
  /** How to say it mid-sentence, if not the same as the label. */
  noun?: string
  /** Global regex. With `group`, it also needs the `d` flag. */
  regex: RegExp
  /** Only this capture group is the secret (e.g. the password in a URL). */
  group?: number
  /** Extra check a match has to pass to count. */
  accept?: (match: RegExpMatchArray) => boolean
  /** Non-secret prefix kept visible when redacting, e.g. "ghp_". */
  prefix?: RegExp
  /** Where to revoke it and make a new one. */
  rotateUrl?: string
  rotateHint: string
}

// Ordered from most to least specific: earlier kinds win overlaps.
export const SECRET_KINDS: SecretKind[] = [
  {
    id: "private-key",
    label: "Private key",
    noun: "private key",
    regex:
      /-----BEGIN[A-Z0-9 ]{0,40}PRIVATE KEY(?: BLOCK)?-----[\s\S]*?(?:-----END[A-Z0-9 ]{0,40}PRIVATE KEY(?: BLOCK)?-----|$)/g,
    prefix: /^-----BEGIN[A-Z0-9 ]{0,40}PRIVATE KEY(?: BLOCK)?-----/,
    rotateHint:
      "Generate a new key pair and remove the old public key everywhere it is trusted.",
  },
  {
    id: "anthropic",
    label: "Anthropic API key",
    regex: /\bsk-ant-[a-z]{2,8}\d{0,3}-[A-Za-z0-9_-]{32,256}/g,
    prefix: /^sk-ant-/,
    rotateUrl: "https://console.anthropic.com/settings/keys",
    rotateHint: "Delete it in the Anthropic Console and create a new one.",
  },
  {
    id: "openai",
    label: "OpenAI API key",
    regex: /\bsk-(?:proj|svcacct|admin)-[A-Za-z0-9_-]{32,256}|\bsk-[A-Za-z0-9]{40,64}\b/g,
    prefix: /^sk-(?:proj-|svcacct-|admin-)?/,
    rotateUrl: "https://platform.openai.com/api-keys",
    rotateHint: "Revoke it on the OpenAI API keys page and create a new one.",
  },
  {
    id: "github",
    label: "GitHub token",
    regex: /\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{40,255})/g,
    prefix: /^(?:gh[pousr]_|github_pat_)/,
    rotateUrl: "https://github.com/settings/tokens",
    rotateHint: "Delete it under Settings → Developer settings → Tokens.",
  },
  {
    id: "gitlab",
    label: "GitLab token",
    regex: /\bglpat-[A-Za-z0-9_-]{20,255}/g,
    prefix: /^glpat-/,
    rotateUrl: "https://gitlab.com/-/user_settings/personal_access_tokens",
    rotateHint: "Revoke it under Access tokens.",
  },
  {
    id: "aws",
    label: "AWS access key",
    regex: /\b(?:AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}\b/g,
    prefix: /^(?:AKIA|ASIA|ABIA|ACCA)/,
    rotateUrl: "https://console.aws.amazon.com/iam/home#/security_credentials",
    rotateHint: "Deactivate and delete it in IAM, then check CloudTrail for surprises.",
  },
  {
    id: "google",
    label: "Google API key",
    regex: /\bAIza[0-9A-Za-z_-]{35}/g,
    prefix: /^AIza/,
    rotateUrl: "https://console.cloud.google.com/apis/credentials",
    rotateHint: "Regenerate or delete it under APIs & Services → Credentials.",
  },
  {
    id: "google-oauth",
    label: "Google OAuth client secret",
    regex: /\bGOCSPX-[A-Za-z0-9_-]{28}/g,
    prefix: /^GOCSPX-/,
    rotateUrl: "https://console.cloud.google.com/apis/credentials",
    rotateHint: "Reset the client secret under APIs & Services → Credentials.",
  },
  {
    id: "slack",
    label: "Slack token",
    regex: /\b(?:xox[abposr]|xapp)-\d{1,20}-[A-Za-z0-9-]{10,255}/g,
    prefix: /^(?:xox[abposr]|xapp)-/,
    rotateUrl: "https://api.slack.com/apps",
    rotateHint: "Regenerate it in your Slack app's settings.",
  },
  {
    id: "slack-webhook",
    label: "Slack webhook URL",
    regex: /https:\/\/hooks\.slack\.com\/(?:services|triggers|workflows)\/[A-Za-z0-9_/-]{20,200}/g,
    prefix: /^https:\/\/hooks\.slack\.com\/[a-z]+\//,
    rotateUrl: "https://api.slack.com/apps",
    rotateHint: "Remove the webhook in your Slack app and create a new one.",
  },
  {
    id: "stripe",
    label: "Stripe secret key",
    regex: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,255}/g,
    prefix: /^(?:sk|rk)_(?:live|test)_/,
    rotateUrl: "https://dashboard.stripe.com/apikeys",
    rotateHint: "Roll the key on the Stripe API keys page.",
  },
  {
    id: "huggingface",
    label: "Hugging Face token",
    regex: /\bhf_[A-Za-z0-9]{30,64}/g,
    prefix: /^hf_/,
    rotateUrl: "https://huggingface.co/settings/tokens",
    rotateHint: "Invalidate it under Settings → Access Tokens.",
  },
  {
    id: "npm",
    label: "npm token",
    regex: /\bnpm_[A-Za-z0-9]{36}\b/g,
    prefix: /^npm_/,
    rotateUrl: "https://docs.npmjs.com/revoking-access-tokens",
    rotateHint: "Revoke it with `npm token revoke` or on npmjs.com.",
  },
  {
    id: "pypi",
    label: "PyPI token",
    regex: /\bpypi-AgEIcHlwaS5vcmc[A-Za-z0-9_-]{50,1000}/g,
    prefix: /^pypi-/,
    rotateUrl: "https://pypi.org/manage/account/",
    rotateHint: "Remove it under Account settings → API tokens.",
  },
  {
    id: "sendgrid",
    label: "SendGrid API key",
    regex: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])/g,
    prefix: /^SG\./,
    rotateUrl: "https://app.sendgrid.com/settings/api_keys",
    rotateHint: "Delete it under Settings → API Keys.",
  },
  {
    id: "twilio",
    label: "Twilio API key",
    regex: /\bSK[0-9a-fA-F]{32}\b/g,
    prefix: /^SK/,
    rotateUrl: "https://console.twilio.com/",
    rotateHint: "Delete it under Account → API keys & tokens.",
  },
  {
    id: "discord",
    label: "Discord bot token",
    regex: /\b[MNO][A-Za-z0-9_-]{23,27}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,40}(?![A-Za-z0-9_-])/g,
    rotateUrl: "https://discord.com/developers/applications",
    rotateHint: "Reset the token on your application's Bot page.",
  },
  {
    id: "telegram",
    label: "Telegram bot token",
    // No \b: in bot URLs the token comes right after "bot".
    regex: /(?<!\d)\d{8,10}:AA[A-Za-z0-9_-]{33}(?![A-Za-z0-9_-])/g,
    rotateUrl: "https://t.me/BotFather",
    rotateHint: "Send /revoke to @BotFather.",
  },
  {
    id: "groq",
    label: "Groq API key",
    regex: /\bgsk_[A-Za-z0-9]{48,64}\b/g,
    prefix: /^gsk_/,
    rotateUrl: "https://console.groq.com/keys",
    rotateHint: "Delete it on the Groq Console keys page.",
  },
  {
    id: "xai",
    label: "xAI API key",
    regex: /\bxai-[A-Za-z0-9]{60,100}\b/g,
    prefix: /^xai-/,
    rotateUrl: "https://console.x.ai/",
    rotateHint: "Delete it in the xAI Console.",
  },
  {
    id: "digitalocean",
    label: "DigitalOcean token",
    regex: /\bdo[opr]_v1_[a-f0-9]{64}\b/g,
    prefix: /^do[opr]_v1_/,
    rotateUrl: "https://cloud.digitalocean.com/account/api/tokens",
    rotateHint: "Delete it under API → Tokens.",
  },
  {
    id: "shopify",
    label: "Shopify access token",
    regex: /\bshp(?:at|ca|pa|ss)_[a-fA-F0-9]{32}\b/g,
    prefix: /^shp(?:at|ca|pa|ss)_/,
    rotateHint: "Rotate it from your Shopify app's API credentials.",
  },
  {
    id: "supabase",
    label: "Supabase key",
    regex: /\b(?:sbp_[a-f0-9]{40}|sb_secret_[A-Za-z0-9_-]{20,64})\b/g,
    prefix: /^(?:sbp_|sb_secret_)/,
    rotateUrl: "https://supabase.com/dashboard/account/tokens",
    rotateHint: "Revoke it in the Supabase dashboard.",
  },
  {
    id: "mailgun",
    label: "Mailgun API key",
    regex: /\bkey-[0-9a-f]{32}\b/g,
    prefix: /^key-/,
    rotateUrl: "https://app.mailgun.com/",
    rotateHint: "Rotate it under API security.",
  },
  {
    id: "jwt",
    label: "JWT",
    regex: /\beyJ[A-Za-z0-9_-]{10,2000}\.eyJ[A-Za-z0-9_-]{10,4000}\.[A-Za-z0-9_-]{10,2000}/g,
    prefix: /^eyJ/,
    rotateHint: "If it is long-lived, revoke the session or rotate the signing secret.",
  },
  {
    id: "azure",
    label: "Azure client secret",
    regex: /(?<![A-Za-z0-9_~.-])[A-Za-z0-9_~.]{3}\dQ~[A-Za-z0-9_~.-]{31,34}(?![A-Za-z0-9_~.-])/g,
    rotateUrl: "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
    rotateHint: "Delete it under App registrations → Certificates & secrets.",
  },
  {
    id: "url-password",
    label: "Password in a URL",
    noun: "password in a URL",
    // Greedy up to the last "@", since passwords sometimes contain one.
    regex: /\b[a-z][a-z0-9+.-]{1,20}:\/\/[^\s:@/]{0,64}:([^\s/]{1,128})@/dgi,
    group: 1,
    rotateHint: "Change that password (and maybe keep it out of URLs).",
  },
  {
    id: "assignment",
    label: "Password or token",
    noun: "password or token",
    // NAME=value, NAME: value, "name": "value", --name=value. The value runs
    // to the end of the line, because passwords can contain #, quotes and
    // spaces. It sits in a lookahead so the next name on the line still matches.
    regex: /(?<![\w.])["']?([A-Za-z_][\w.-]{0,80})["']?\s{0,4}[=:]\s{0,4}(?=(\S[^\r\n]{0,4095}))/dg,
    group: 2,
    accept: (match) => isSecretName(match[1]),
    rotateHint: "If that value is real, change it wherever it is used.",
  },
]

export const GENERIC_KIND: SecretKind = {
  id: "random",
  label: "Suspiciously random string",
  regex: /[A-Za-z0-9+/_-]{20,}={0,2}/g,
  rotateHint: "If it is a real credential, revoke it and create a new one wherever it came from.",
}

const SECRET_WORDS = new Set([
  "password",
  "passwd",
  "pass",
  "passphrase",
  "pwd",
  "secret",
  "token",
  "key",
  "apikey",
  "privatekey",
  "accesskey",
  "secretkey",
  "credential",
  "creds",
  "authorization",
])

/** Whether a variable name is about a secret: DB_PASS, clientSecret, x-api-key
 *  yes; COMPASS, secretary, passport no. */
export function isSecretName(name: string): boolean {
  const words = name.replace(/([a-z\d])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z\d]+/)
  return words.some((word) => SECRET_WORDS.has(word) || SECRET_WORDS.has(word.replace(/s$/, "")))
}

export interface Detection {
  start: number
  end: number
  kind: SecretKind
}

/** Shannon entropy in bits per character. */
export function entropy(text: string): number {
  const counts = new Map<string, number>()
  for (const ch of text) counts.set(ch, (counts.get(ch) ?? 0) + 1)
  let bits = 0
  for (const n of counts.values()) {
    const p = n / text.length
    bits -= p * Math.log2(p)
  }
  return bits
}

// The 150 most frequent letter pairs in English. About 22% of random letter
// pairs land in this set; words glued together land here most of the time.
const COMMON_BIGRAMS = new Set(
  (
    "th he in er an re on at en nd ti es or te of ed is it al ar st to nt ng se ha as ou io le ve " +
    "co me de hi ri ro ic ne ea ra ce li ch ll be ma si om ur ca el ta la ns di fo ho pe ec pr no " +
    "ct us ac ot il tr ly nc et ut ss so rs un lo wa ge ie wh ee wi em ad ol rt po we na ul ni ts " +
    "mo ow pa im mi ai sh ir su id os iv ia am fi ci vi pl ig tu ev ld ry mp fe bl ab gh ty op wo " +
    "sa ay ex ke fr oo av ag if ap gr od bo sp rd do uc bu ei ov by rm ep tt oc fa ef cu rn sc gi"
  ).split(" "),
)

/**
 * Heuristic for random-looking tokens (keys with no recognizable prefix).
 * Made-up fake keys tend to be words glued together ("ThisIsFake2024"),
 * so a token counts as random when its letter pairs don't read like English.
 */
export function looksRandom(token: string): boolean {
  const alnum = token.replace(/=+$/, "").replace(/[^A-Za-z0-9]/g, "")
  if (alnum.length < 20) return false

  // Long hex: API keys, hashes, UUIDs.
  const hexLike = /^(?:[0-9a-f]+|[0-9A-F]+)$/.test(alnum) && /\d/.test(alnum) && /[a-f]/i.test(alnum)
  if (alnum.length >= 32 && hexLike) {
    return entropy(alnum) >= 3
  }
  // Prefixed hex ("sk-or-v1-…", "dapi…", "…-us21"): a–f pairs read as English too often.
  const hexRun = /[0-9a-f]{32,}|[0-9A-F]{32,}/.exec(alnum)?.[0]
  if (hexRun && /\d/.test(hexRun) && /[a-f]/i.test(hexRun) && entropy(hexRun) >= 3) return true

  const classes = [/[a-z]/, /[A-Z]/, /\d/].filter((re) => re.test(alnum)).length
  if (classes < 2 || (classes === 2 && alnum.length < 32) || entropy(alnum) < 3.5) return false

  const pairs: string[] = []
  for (const run of alnum.toLowerCase().match(/[a-z]{2,}/g) ?? []) {
    for (let i = 0; i < run.length - 1; i++) pairs.push(run.slice(i, i + 2))
  }
  // Mostly digits with the odd letter: words don't look like that either.
  if (pairs.length < 8) return true
  return pairs.filter((p) => COMMON_BIGRAMS.has(p)).length / pairs.length < 0.5
}

export function findSecrets(text: string): Detection[] {
  const found: Detection[] = []
  const overlapping = (start: number, end: number) =>
    found.filter((d) => start < d.end && end > d.start)
  // A match that touches an earlier detection widens it instead of being
  // dropped, so a secret never ends up half-masked.
  const add = (start: number, end: number, kind: SecretKind) => {
    const hits = overlapping(start, end)
    for (const d of hits) {
      d.start = Math.min(d.start, start)
      d.end = Math.max(d.end, end)
    }
    if (!hits.length) found.push({ start, end, kind })
  }

  for (const kind of SECRET_KINDS) {
    for (const match of text.matchAll(kind.regex)) {
      if (kind.accept && !kind.accept(match)) continue
      let start = match.index
      let end = start + match[0].length
      if (kind.group !== undefined) {
        const span = match.indices?.[kind.group]
        if (!span) continue
        ;[start, end] = span
      }
      add(start, end, kind)
    }
  }

  for (const match of text.matchAll(GENERIC_KIND.regex)) {
    const run = match[0]
    const start = match.index
    const end = start + run.length
    if (overlapping(start, end).length || looksRandom(run)) {
      add(start, end, GENERIC_KIND)
      continue
    }
    // "/" glues URL path words onto tokens, so judge each path segment too.
    let offset = start
    for (const part of run.split("/")) {
      if (looksRandom(part)) add(offset, offset + part.length, GENERIC_KIND)
      offset += part.length + 1
    }
  }

  // Widening can make detections overlap. Merge them, keeping the first kind.
  const merged: Detection[] = []
  for (const d of found.sort((a, b) => a.start - b.start)) {
    const last = merged.at(-1)
    if (last && d.start < last.end) last.end = Math.max(last.end, d.end)
    else merged.push(d)
  }
  return merged
}

/** Replacement shown instead of a secret: its harmless prefix, then dots.
 *  Always 12 dots, so a screenshot doesn't give away how long it was. */
export function maskSecret(secret: string, kind: SecretKind): string {
  const prefix = kind.prefix?.exec(secret.replace(/^["'`]+/, ""))?.[0] ?? ""
  return `${prefix}${"•".repeat(12)}`
}

export interface PreparedLine {
  text: string
  redacted: boolean
}

export interface PreparedKeys {
  lines: PreparedLine[]
  /** Non-empty lines beyond the display limit. */
  hidden: number
  detections: Detection[]
}

/**
 * Turns the textarea contents into the lines that get rotated, with anything
 * that looks real masked out. Multi-line secrets (PEM keys) collapse into one
 * masked line.
 */
export function prepareKeys(
  text: string,
  { maxLines = 50, maxLength = 200 } = {},
): PreparedKeys {
  const detections = findSecrets(text)

  let out = ""
  const masked: Array<[number, number]> = []
  let cursor = 0
  for (const d of detections) {
    out += text.slice(cursor, d.start)
    const replacement = maskSecret(text.slice(d.start, d.end), d.kind)
    masked.push([out.length, out.length + replacement.length])
    out += replacement
    cursor = d.end
  }
  out += text.slice(cursor)

  const lines: PreparedLine[] = []
  let offset = 0
  for (const raw of out.split("\n")) {
    const start = offset
    const end = offset + raw.length
    offset = end + 1
    const line = raw.trim()
    if (!line) continue
    lines.push({
      text: line.length > maxLength ? `${line.slice(0, maxLength - 1)}…` : line,
      redacted: masked.some(([s, e]) => s < end && e > start),
    })
  }

  return {
    lines: lines.slice(0, maxLines),
    hidden: Math.max(0, lines.length - maxLines),
    detections,
  }
}

export function countKeys(text: string): number {
  let n = 0
  for (const line of text.split("\n")) if (line.trim()) n++
  return n
}

/** One entry per kind found, in the order they first appear. */
export function summarize(detections: Detection[]): Array<{ kind: SecretKind; count: number }> {
  const byKind = new Map<string, { kind: SecretKind; count: number }>()
  for (const d of detections) {
    const entry = byKind.get(d.kind.id)
    if (entry) entry.count++
    else byKind.set(d.kind.id, { kind: d.kind, count: 1 })
  }
  return [...byKind.values()]
}
