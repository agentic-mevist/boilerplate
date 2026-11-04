import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { pct } from "../format";
import { useStore } from "../store";
import { Favicon } from "../ui/Favicon";
import { KEY_H } from "./Keys";
import type { KeyNode, Layout } from "./layout";

/**
 * Name tags for the strongest sources, drawn as DOM on top of the canvas and
 * placed in screen space each frame so they never pile on top of each other.
 */
interface Shared {
  layout: Layout | null;
  rotation: number;
  els: Map<string, HTMLDivElement>;
  readyAt: number;
}
const shared: Shared = { layout: null, rotation: 0, els: new Map(), readyAt: Infinity };

const TOP_N = 6;

function candidates(layout: Layout | null, hovered: string | null, selected: string | null): KeyNode[] {
  if (!layout) return [];
  // While a source is in focus, only its own tag shows.
  const focusId = hovered ?? selected;
  if (focusId) return layout.keys.filter((k) => k.id === focusId);
  return layout.keys
    .filter((k) => k.kind === "main")
    .sort((a, b) => a.source.rank - b.source.rank)
    .slice(0, TOP_N);
}

/** Lives inside the Canvas: projects key positions and lays labels out. */
export function LabelProjector({ layout, rotation, revealKey }: { layout: Layout; rotation: number; revealKey: number }) {
  const { camera, size } = useThree();
  const v = useRef(new THREE.Vector3());
  useEffect(() => {
    shared.layout = layout;
    shared.rotation = rotation;
    shared.readyAt = performance.now() + 2000;
    return () => {
      if (shared.layout === layout) shared.layout = null;
    };
  }, [layout, rotation, revealKey]);

  useFrame(() => {
    const { hovered, selected } = useStore.getState();
    const list = candidates(layout, hovered, selected);
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const cos = Math.cos(rotation), sin = Math.sin(rotation);
    const ready = performance.now() > shared.readyAt;
    const zoom = (camera as THREE.OrthographicCamera).zoom || 1;
    // Keys (and the hub) are obstacles: labels look for free space instead of covering them.
    for (const k of layout.keys) {
      if (k.kind === "tail" && k.fade > 0.5) continue;
      v.current.set(k.x * cos + k.z * sin, KEY_H * 0.5, -k.x * sin + k.z * cos).project(camera);
      const sx = ((v.current.x + 1) / 2) * size.width, sy = ((1 - v.current.y) / 2) * size.height;
      const half = k.size * zoom * 0.62;
      placed.push({ x: sx - half, y: sy - half * 0.75, w: half * 2, h: half * 1.5 });
    }
    {
      v.current.set(0, 0.6, 0).project(camera);
      const sx = ((v.current.x + 1) / 2) * size.width, sy = ((1 - v.current.y) / 2) * size.height;
      const r = 3.9 * zoom;
      placed.push({ x: sx - r, y: sy - r * 0.7, w: r * 2, h: r * 1.4 });
    }
    // Rivers are obstacles too, so tags never sit on top of the juice.
    for (const p of layout.paths) {
      if (p.kind === "lost") continue;
      for (let i = 4; i < 60; i += 5) {
        const px = p.points[i * 2]!, pz = p.points[i * 2 + 1]!;
        v.current.set(px * cos + pz * sin, 0, -px * sin + pz * cos).project(camera);
        const sx = ((v.current.x + 1) / 2) * size.width, sy = ((1 - v.current.y) / 2) * size.height;
        const half = Math.max(3, p.width * zoom * 0.55);
        placed.push({ x: sx - half, y: sy - half, w: half * 2, h: half * 2 });
      }
    }
    const obstacles = placed.length;
    if (import.meta.env.DEV) {
      // Test hook: screen positions of the strongest keys.
      (window as unknown as { __keys?: unknown }).__keys = layout.keys.map((k) => {
        v.current.set(k.x * cos + k.z * sin, KEY_H, -k.x * sin + k.z * cos).project(camera);
        return { id: k.id, x: ((v.current.x + 1) / 2) * size.width, y: ((1 - v.current.y) / 2) * size.height };
      });
    }
    const tailEl = shared.els.get("__tail");
    if (tailEl && layout.tail) {
      const tl = layout.tail;
      v.current.set(tl.x * cos + tl.z * sin, 0.3, -tl.x * sin + tl.z * cos).project(camera);
      const sx = ((v.current.x + 1) / 2) * size.width, sy = ((1 - v.current.y) / 2) * size.height;
      const w = tailEl.offsetWidth || 120, h = tailEl.offsetHeight || 22;
      const focusAny = hovered ?? selected;
      tailEl.style.opacity = ready && !focusAny ? "1" : "0";
      const tx = Math.min(Math.max(sx - w / 2, 8), size.width - w - 8);
      tailEl.style.transform = `translate(${Math.round(tx)}px, ${Math.round(sy + 0.9 * zoom)}px)`;
      placed.push({ x: sx - w / 2 - 3, y: sy + 0.9 * zoom - 3, w: w + 6, h: h + 6 });
    }
    for (const k of list) {
      const el = shared.els.get(k.id);
      if (!el) continue;
      const focus = k.id === hovered || k.id === selected;
      if (!ready && !focus) {
        el.style.opacity = "0";
        continue;
      }
      v.current.set(k.x * cos + k.z * sin, KEY_H, -k.x * sin + k.z * cos).project(camera);
      const sx = ((v.current.x + 1) / 2) * size.width;
      const sy = ((1 - v.current.y) / 2) * size.height;
      const w = el.offsetWidth || 90, h = el.offsetHeight || 22;
      const off = k.size * zoom * 0.55 + 6;
      // Rivers run from each key toward the hub, so the free side is the one facing away from it.
      v.current.set(0, 0, 0).project(camera);
      const hx = ((v.current.x + 1) / 2) * size.width, hy = ((1 - v.current.y) / 2) * size.height;
      let dx = sx - hx, dy = sy - hy;
      const dl = Math.hypot(dx, dy) || 1;
      dx /= dl;
      dy /= dl;
      const reach = off + 4;
      const outward = { x: sx + dx * (reach + w / 2) - w / 2, y: sy + dy * (reach + h / 2) - h / 2 };
      const outwardFar = { x: sx + dx * (reach * 1.9 + w / 2) - w / 2, y: sy + dy * (reach * 1.9 + h / 2) - h / 2 };
      const below = [
        outward,
        outwardFar,
        { x: sx - w / 2, y: sy - off - h },
        { x: sx - w / 2, y: sy + off },
        { x: sx + off * 1.25, y: sy - h / 2 },
        { x: sx - off * 1.25 - w, y: sy - h / 2 },
      ];
      // A focused key's card floats right above its icon.
      const options = focus ? [{ x: sx - w / 2, y: sy - off - h - 4 }, ...below] : below;
      let spot = null as null | { x: number; y: number };
      let best = { o: options[0]!, area: Infinity };
      const rank = k.kind === "main" ? k.source.rank : -1;
      for (const o of options) {
        const r = { x: o.x - 3, y: o.y - 3, w: w + 6, h: h + 6 };
        let area = 0;
        placed.forEach((p, i) => {
          const own = i < obstacles && Math.abs(p.x + p.w / 2 - sx) < 1 && Math.abs(p.y + p.h / 2 - sy) < 30;
          if (own) return;
          const ox = Math.min(r.x + r.w, p.x + p.w) - Math.max(r.x, p.x);
          const oy = Math.min(r.y + r.h, p.y + p.h) - Math.max(r.y, p.y);
          if (ox > 0 && oy > 0) area += ox * oy * (i < obstacles ? 1 : 4);
        });
        if (area === 0) {
          spot = o;
          break;
        }
        if (area < best.area) best = { o, area };
      }
      // The strongest few always get a tag, in their least-crowded spot.
      if (focus) spot = options[0]!;
      else if (!spot && rank >= 0 && rank < 3) spot = best.o;
      if (!spot) {
        el.style.opacity = "0";
        continue;
      }
      // Keep every tag fully on screen.
      spot = { x: Math.min(Math.max(spot.x, 8), size.width - w - 8), y: Math.min(Math.max(spot.y, 8), size.height - h - 8) };
      placed.push({ x: spot.x - 3, y: spot.y - 3, w: w + 6, h: h + 6 });
      el.style.opacity = "1";
      el.style.transform = `translate(${Math.round(spot.x)}px, ${Math.round(spot.y)}px)`;
    }
  });
  return null;
}

/** Lives outside the Canvas: renders the label elements. */
export function ScreenLabels() {
  const hovered = useStore((s) => s.hovered);
  const selected = useStore((s) => s.selected);
  const result = useStore((s) => s.result);
  const mode = useStore((s) => s.mode);
  const showLost = useStore((s) => s.showLost);
  const [, force] = useState(0);
  // Re-render when the scene publishes a new layout.
  useEffect(() => {
    const t = setTimeout(() => force((n) => n + 1), 50);
    return () => clearTimeout(t);
  }, [result, mode, showLost]);
  const list = candidates(shared.layout, hovered, selected);
  const tail = shared.layout?.tail;
  return (
    <div className="labels" aria-hidden>
      {tail && (
        <div
          ref={(el) => {
            if (el) shared.els.set("__tail", el);
            else shared.els.delete("__tail");
          }}
          className="key-label key-label--tail"
          style={{ opacity: 0 }}
        >
          <span className="key-label__name">+{tail.count.toLocaleString("en-US")} smaller sites</span>
          <span className="key-label__share">{pct(tail.share)}</span>
        </div>
      )}
      {list.map((k) => {
        const focus = k.id === hovered || k.id === selected;
        const f = k.source.factors;
        const ref = (el: HTMLDivElement | null) => {
          if (el) shared.els.set(k.id, el);
          else shared.els.delete(k.id);
        };
        if (!focus) {
          return (
            <div key={k.id} ref={ref} className="key-label" style={{ opacity: 0 }}>
              <span className="key-label__name">{k.source.root}</span>
              {k.kind !== "lost" && <span className="key-label__share">{pct(k.source.share)}</span>}
            </div>
          );
        }
        return (
          <div key={k.id} ref={ref} className={`key-card ${k.kind === "lost" ? "is-lost" : ""}`} style={{ opacity: 0 }}>
            <div className="key-card__top">
              <Favicon domain={k.source.link.domain} size={18} />
              <span className="key-card__name">{k.source.root}</span>
            </div>
            <div className="key-card__share">
              {k.kind === "lost" ? (
                <>
                  <b>Lost link</b> could add {pct(k.source.potential / Math.max(1e-9, useStore.getState().result?.total ?? 1))}
                </>
              ) : (
                <>
                  <b>{pct(k.source.share)}</b> of your juice
                </>
              )}
            </div>
            <div className="key-card__meta">
              {k.kind === "lost"
                ? `was DR ${Math.round(f.dr)}`
                : [
                    `DR ${Math.round(f.dr)}`,
                    f.follow < 1 ? "nofollow" : "dofollow",
                    f.spamScore >= 60 ? `spam ${Math.round(f.spamScore)} · mostly ignored` : f.spamScore > 30 ? `spam ${Math.round(f.spamScore)}` : null,
                    k.source.health === "leak" ? "points to a broken page" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </div>
            {!selected && <div className="key-card__hint">Click for details</div>}
          </div>
        );
      })}
    </div>
  );
}
