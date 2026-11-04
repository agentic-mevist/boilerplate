import { describe, expect, test } from "vitest";
import { decodeSvgDataUrl, isSvgUrl, lightOnly, parseSizes, pngSize, rankIcons, type IconCandidate } from "./favicon";

describe("favicon helpers", () => {
  test("reads the biggest square size from a sizes attribute", () => {
    expect(parseSizes("16x16 32x32")).toBe(32);
    expect(parseSizes("180x180")).toBe(180);
    expect(parseSizes("192x96")).toBe(96);
    expect(parseSizes("any")).toBe(0);
    expect(parseSizes(null)).toBe(0);
  });

  test("spots SVG icons by URL", () => {
    expect(isSvgUrl("https://a.com/favicon.svg")).toBe(true);
    expect(isSvgUrl("https://a.com/icon.svg?v=2")).toBe(true);
    expect(isSvgUrl("data:image/svg+xml,%3Csvg%3E")).toBe(true);
    expect(isSvgUrl("https://a.com/favicon.ico")).toBe(false);
    expect(isSvgUrl("https://a.com/svg/icon.png")).toBe(false);
  });

  test("tries SVGs first, then big rasters (biggest first), never small ones", () => {
    const c = (url: string, svg: boolean, size: number): IconCandidate => ({ url, svg, size });
    const ranked = rankIcons([
      c("/favicon.ico", false, 0),
      c("/apple.png", false, 180),
      c("/icon-512.png", false, 512),
      c("/icon.svg", true, 4096),
      c("/icon-32.png", false, 32),
      c("/apple.png", false, 180),
    ]);
    expect(ranked.map((r) => r.url)).toEqual(["/icon.svg", "/icon-512.png", "/apple.png"]);
  });

  test("reads PNG dimensions from the header", () => {
    const b = new Uint8Array(24);
    b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    new DataView(b.buffer).setUint32(16, 180);
    new DataView(b.buffer).setUint32(20, 180);
    expect(pngSize(b.buffer)).toEqual({ w: 180, h: 180 });
    expect(pngSize(new Uint8Array([1, 2, 3]).buffer)).toBeNull();
  });

  test("decodes SVG data URLs", () => {
    expect(decodeSvgDataUrl("data:image/svg+xml,%3Csvg%20viewBox='0 0 1 1'%3E%3C/svg%3E")).toBe("<svg viewBox='0 0 1 1'></svg>");
    expect(decodeSvgDataUrl(`data:image/svg+xml;base64,${btoa("<svg></svg>")}`)).toBe("<svg></svg>");
    expect(decodeSvgDataUrl("data:image/png;base64,AAAA")).toBeNull();
  });

  test("keeps SVG icons in their light-mode look", () => {
    const svg = "<svg><style>path{fill:#000}@media (prefers-color-scheme: dark){path{fill:#fff}}@media(prefers-color-scheme:light){circle{fill:red}}</style></svg>";
    const out = lightOnly(svg);
    expect(out).not.toContain("prefers-color-scheme");
    expect(out).toContain("@media (max-width: 0px){path{fill:#fff}}");
    expect(out).toContain("@media(min-width: 0px){circle{fill:red}}");
  });
});
