/**
 * Protects the DataForSEO balance: a global daily spend cap plus a per-IP
 * daily cap on *fresh* analyses. Cached analyses are always free.
 * KV is eventually consistent, so these caps are approximate (and may
 * overshoot by a request or two). That's fine for this purpose.
 */

export interface BudgetEnv {
  CACHE: KVNamespace;
  DAILY_BUDGET_USD?: string;
  PER_IP_DAILY?: string;
}

const day = () => new Date().toISOString().slice(0, 10);

export interface BudgetCheck {
  ok: boolean;
  reason?: "budget_exhausted" | "rate_limited";
  spent: number;
  limit: number;
  ipCount: number;
  ipLimit: number;
}

export async function checkBudget(env: BudgetEnv, ip: string): Promise<BudgetCheck> {
  const limit = Number(env.DAILY_BUDGET_USD ?? "3") || 3;
  const ipLimit = Number(env.PER_IP_DAILY ?? "10") || 10;
  const d = day();
  const [spentRaw, ipRaw] = await Promise.all([env.CACHE.get(`spend:${d}`), env.CACHE.get(`ip:${d}:${ip}`)]);
  const spent = Number(spentRaw ?? 0) || 0;
  const ipCount = Number(ipRaw ?? 0) || 0;
  if (spent >= limit) return { ok: false, reason: "budget_exhausted", spent, limit, ipCount, ipLimit };
  if (ipCount >= ipLimit) return { ok: false, reason: "rate_limited", spent, limit, ipCount, ipLimit };
  return { ok: true, spent, limit, ipCount, ipLimit };
}

export async function recordSpend(env: BudgetEnv, ip: string, cost: number, prev: BudgetCheck): Promise<void> {
  const d = day();
  await Promise.all([
    env.CACHE.put(`spend:${d}`, String(prev.spent + cost), { expirationTtl: 60 * 60 * 24 * 3 }),
    env.CACHE.put(`ip:${d}:${ip}`, String(prev.ipCount + 1), { expirationTtl: 60 * 60 * 24 * 2 }),
  ]);
}

export function secondsUntilTomorrow(): number {
  const now = new Date();
  const t = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(60, Math.round((t - now.getTime()) / 1000));
}
