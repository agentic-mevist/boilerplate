// Obviously fake keys for people who (correctly) don't want to paste real
// ones. A test makes sure none of these trip the real-key detector.
export const FAKE_KEYS = [
  "sk-definitely-not-a-real-key",
  "ghp_NiceTryThisIsFake",
  "AKIA-I-PROMISE-THIS-IS-FAKE",
  "xoxb-not-a-real-slack-token",
  "sk_live_lol_no",
  "AIza-nope-nope-nope",
  "hf_ThisModelHasNoWeights",
  "npm_PleaseDoNotPublishThis",
  "glpat-legit-token",
  "sk-ant-trust-me-bro",
  "hunter2",
  "password123",
  "correct-horse-battery-staple",
  "admin:admin",
  "letmein",
]

/** Picks a few fake keys in random order. */
export function hallucinateKeys(count = 5): string {
  const pool = [...FAKE_KEYS]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count).join("\n")
}
