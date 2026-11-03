export const pct = (x: number, digits?: number) => {
  const v = x * 100;
  if (digits != null) return `${v.toFixed(digits)}%`;
  if (v === 0) return "0%";
  if (v >= 99.5 && v < 100) return `${v.toFixed(1)}%`;
  if (v >= 10) return `${Math.round(v)}%`;
  if (v >= 1) return `${v.toFixed(1)}%`;
  if (v >= 0.01) return `${v.toFixed(2)}%`;
  return "<0.01%";
};

export const compact = (n: number) => {
  if (!Number.isFinite(n)) return "–";
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(a >= 1e10 ? 0 : 1)}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(a >= 1e4 ? 0 : 1)}k`;
  return `${Math.round(n)}`;
};

export const int = (n: number) => Math.round(n).toLocaleString("en-US");

export const mult = (m: number) => (m >= 0.995 && m <= 1.005 ? "×1" : `×${m >= 1 ? m.toFixed(2) : m.toFixed(2)}`);

export function timeAgo(iso: string | null): string {
  if (!iso) return "unknown";
  const t = new Date(iso.replace(" +00:00", "Z").replace(" ", "T")).getTime();
  if (!Number.isFinite(t)) return "unknown";
  const days = Math.max(0, (Date.now() - t) / 864e5);
  if (days < 1) return "today";
  if (days < 30) return `${Math.round(days)} days ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  const y = days / 365;
  return `${y < 2 ? y.toFixed(1) : Math.round(y)} years ago`;
}
