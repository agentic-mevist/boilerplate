import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { pct } from "../format";
import { useStore } from "../store";
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
  const top = layout.keys.filter((k) => k.kind === "main").slice(0, TOP_N);
  const focus = layout.keys.filter((k) => (k.id === hovered || k.id === selected) && !top.includes(k));
  return [...focus, ...top];
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
      const r = 2.9 * zoom;
      placed.push({ x: sx - r, y: sy - r * 0.62, w: r * 2, h: r * 1.24 });
    }
    const obstacles = placed.length;
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
      const options = [
        { x: sx - w / 2, y: sy + off },
        { x: sx - w / 2, y: sy - off - h },
        { x: sx + off * 1.25, y: sy - h / 2 },
        { x: sx - off * 1.25 - w, y: sy - h / 2 },
        { x: sx - w / 2, y: sy + off * 2.1 },
        { x: sx - w / 2, y: sy - off * 2.1 - h },
      ];
      let spot = null as null | { x: number; y: number };
      let best = { o: options[0]!, area: Infinity };
      const rank = layout.keys.indexOf(k);
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
      if (!spot && (focus || (rank >= 0 && rank < 3))) spot = best.o;
      if (!spot) {
        el.style.opacity = "0";
        continue;
      }
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
  return (
    <div className="labels" aria-hidden>
      {list.map((k) => (
        <div
          key={k.id}
          ref={(el) => {
            if (el) shared.els.set(k.id, el);
            else shared.els.delete(k.id);
          }}
          className={`key-label ${k.id === hovered || k.id === selected ? "is-focus" : ""}`}
          style={{ opacity: 0 }}
        >
          <span className="key-label__name">{k.source.root}</span>
          {k.kind !== "lost" && <span className="key-label__share">{pct(k.source.share)}</span>}
        </div>
      ))}
    </div>
  );
}
