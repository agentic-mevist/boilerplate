import { useState } from "react";
import { rootDomain } from "../../shared/domain";
import { faviconUrl } from "../api";

const PALETTE = ["#ffd9c7", "#d9e8ff", "#dff3e4", "#f3e1fb", "#fff0bf", "#d7f2f3", "#fde0e7", "#e6e3ff"];
const INK = ["#c2410c", "#1d4ed8", "#15803d", "#7e22ce", "#a16207", "#0e7490", "#be185d", "#4338ca"];
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function Favicon({ domain, size = 20 }: { domain: string; size?: number }) {
  const key = rootDomain(domain);
  const [failed, setFailed] = useState(false);
  const h = hash(key) % PALETTE.length;
  if (failed) {
    return (
      <span className="favicon favicon--mono" style={{ width: size, height: size, background: PALETTE[h], color: INK[h], fontSize: size * 0.5 }}>
        {(key[0] ?? "?").toUpperCase()}
      </span>
    );
  }
  return <img className="favicon" src={faviconUrl(key)} width={size} height={size} alt="" loading="lazy" onError={() => setFailed(true)} />;
}
