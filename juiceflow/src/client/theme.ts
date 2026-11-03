import type { Health } from "../shared/model";

/** Palette (sRGB hex). Shaders take these as raw sRGB, matching the CSS exactly. */
export const C = {
  bg: "#f4f2ee",
  ink: "#1d1c1a",
  inkSoft: "#6f6a62",
  grid: "#d9d4cb",
  dash: "#c2b9ab",
  juice: "#ff6a2b",
  juiceHot: "#ff8f45",
  suspicious: "#f0a04b",
  toxic: "#8a7db0",
  nofollow: "#a8a197",
  leak: "#e5484d",
  lost: "#c4a19c",
  output: "#3b7bf6",
  keyTop: "#ffffff",
  keyToxic: "#ece7f6",
  keyLost: "#ebe7e1",
};

export const HEALTH_CODE: Record<Health, number> = { clean: 0, suspicious: 1, toxic: 2, nofollow: 3, leak: 4, lost: 5 };
export const OUTPUT_CODE = 6;

export const HEALTH_COLOR: Record<Health, string> = {
  clean: C.juice,
  suspicious: C.suspicious,
  toxic: C.toxic,
  nofollow: C.nofollow,
  leak: C.leak,
  lost: C.lost,
};

export const HEALTH_LABEL: Record<Health, string> = {
  clean: "Clean juice",
  suspicious: "Slightly spammy",
  toxic: "Murky (spam)",
  nofollow: "Nofollow trickle",
  leak: "Leaking (broken target)",
  lost: "Dried up (lost)",
};

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
