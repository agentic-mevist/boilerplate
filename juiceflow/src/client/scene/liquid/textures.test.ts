import { describe, expect, it } from "vitest";
import { PATCH_WAVES, RIPPLE_WAVES, sampleField, waveTable } from "./textures";

describe("juice textures", () => {
  const t = waveTable();

  it("uses whole wave numbers, so the tiles repeat seamlessly", () => {
    expect(t.ripple.length).toBe(RIPPLE_WAVES * 4);
    expect(t.patch.length).toBe(PATCH_WAVES * 4);
    for (const arr of [t.ripple, t.patch])
      for (let i = 0; i < arr.length; i += 4) {
        expect(Number.isInteger(arr[i])).toBe(true);
        expect(Number.isInteger(arr[i + 1])).toBe(true);
      }
  });

  it("matches across the tile edges", () => {
    for (const v of [0.1, 0.37, 0.8]) {
      const a = sampleField(t.ripple, 0, v), b = sampleField(t.ripple, 1, v);
      expect(b.h).toBeCloseTo(a.h, 4);
      expect(b.gx).toBeCloseTo(a.gx, 2);
      const c = sampleField(t.ripple, v, 0), d = sampleField(t.ripple, v, 1);
      expect(d.h).toBeCloseTo(c.h, 4);
      expect(d.gy).toBeCloseTo(c.gy, 2);
    }
  });

  it("has usable normalization constants", () => {
    const s = t.stats;
    expect(s.gMax).toBeGreaterThan(0);
    expect(s.hMax).toBeGreaterThan(s.hMin);
    expect(s.depth).toBeGreaterThan(0);
    expect(s.cHi).toBeGreaterThan(s.cLo);
  });
});
