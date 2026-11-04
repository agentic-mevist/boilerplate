import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { runModel } from "../../shared/model";
import type { AnalysisPayload } from "../../shared/types";
import { DEMOS } from "../api";
import { computeLayout, LAKE_RADIUS, riverWidth, SAMPLES, W_MAX, W_MIN, type LayoutMode } from "./layout";

// the demo sites, plus older snapshots kept as test fixtures (small and mid-size sites)
const SITES = [...DEMOS.map((d) => `public/demo/${d}.json`), ...["thulite.io", "gethyas.com", "irishroots.ie"].map((d) => `fixtures/${d}.json`)];

describe("river widths", () => {
  test("monotonic, from a tiny spring to a wide river", () => {
    expect(riverWidth(0, 1)).toBe(W_MIN);
    expect(riverWidth(1, 1)).toBeCloseTo(W_MAX);
    expect(riverWidth(0.5, 1)).toBeGreaterThan(riverWidth(0.05, 1));
    expect(riverWidth(0.05, 1)).toBeGreaterThan(riverWidth(0.005, 1));
  });
});

for (const file of SITES) {
  const domain = file.split("/").pop()!.replace(/\.json$/, "");
  for (const mode of ["funnel", "vortex"] as LayoutMode[]) {
    describe(`${domain} / ${mode}`, () => {
      const payload = JSON.parse(readFileSync(file, "utf8")) as AnalysisPayload;
      const result = runModel(payload);
      const layout = computeLayout(result, mode, true);

      test("every river ends in the lake (lost links stop short)", () => {
        for (const p of layout.paths) {
          const x = p.points[(SAMPLES - 1) * 2]!, z = p.points[(SAMPLES - 1) * 2 + 1]!;
          const r = Math.hypot(x, z);
          if (p.kind === "lost") expect(r).toBeGreaterThan(LAKE_RADIUS + 2);
          else expect(r).toBeLessThan(LAKE_RADIUS);
        }
      });

      test("no river runs under another site's key", () => {
        const problems: string[] = [];
        layout.paths.forEach((p, pi) => {
          for (let i = 0; i < SAMPLES; i++) {
            const x = p.points[i * 2]!, z = p.points[i * 2 + 1]!;
            if (Math.hypot(x, z) < layout.packRadius + 0.2) continue; // convergence zone: rivers merge into the lake
            for (const k of layout.keys) {
              if (k.path === pi) continue;
              if (p.kind === "tail" && k.kind === "tail") continue;
              const reach = k.size / 2 + p.width / 2 - 0.05;
              if (Math.abs(x - k.x) < reach && Math.abs(z - k.z) < reach) {
                problems.push(`${p.id} under ${k.id}`);
                break;
              }
            }
          }
        });
        expect([...new Set(problems)]).toEqual([]);
      });

      test("keys don't overlap each other", () => {
        const ks = layout.keys;
        for (let i = 0; i < ks.length; i++)
          for (let j = i + 1; j < ks.length; j++) {
            const a = ks[i]!, b = ks[j]!;
            const reach = (a.size + b.size) / 2 - 0.02;
            expect(Math.abs(a.x - b.x) < reach && Math.abs(a.z - b.z) < reach, `${a.id} overlaps ${b.id}`).toBe(false);
          }
      });

      test("every main source has its own river, widest for the top source", () => {
        const main = layout.paths.filter((p) => p.kind === "main");
        expect(main.length).toBeGreaterThan(0);
        expect(Math.max(...main.map((p) => p.width))).toBeCloseTo(main.find((p) => p.id === result.sources[0]!.id)!.width);
      });
    });
  }
}
