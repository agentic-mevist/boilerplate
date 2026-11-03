import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { CATEGORY_META } from "../../shared/categories";
import type { JuiceResult } from "../../shared/model";
import { pct } from "../format";
import { juiceById, type Juice } from "../juices";
import { useStore } from "../store";
import { C } from "../theme";
import type { OutputSlot } from "./layout";

const W = 5.0, D = 3.6, T = 0.22;
const PX = 150; // canvas pixels per world unit

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, j: Juice) => void;

function header(ctx: CanvasRenderingContext2D, title: string, w: number, j: Juice) {
  ctx.fillStyle = C.inkSoft;
  ctx.font = "500 38px Geist, Inter, system-ui, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillText(title, 44, 78);
  ctx.fillStyle = j.main;
  ctx.beginPath();
  ctx.arc(w - 52, 66, 9, 0, Math.PI * 2);
  ctx.fill();
}

const drawScore = (r: JuiceResult): Draw => (ctx, w, h, j) => {
  header(ctx, "Juice score", w, j);
  ctx.fillStyle = C.ink;
  ctx.font = "600 190px Geist, Inter, system-ui, sans-serif";
  ctx.fillText(String(Math.round(r.score)), 40, 300);
  ctx.fillStyle = C.inkSoft;
  ctx.font = "500 34px Geist, Inter, system-ui, sans-serif";
  ctx.fillText("out of 100", 48, 364);
  // gauge
  const cx = w - 150, cy = 250, rad = 92;
  ctx.lineWidth = 22;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#f0ece6";
  ctx.beginPath();
  ctx.arc(cx, cy, rad, Math.PI * 0.75, Math.PI * 2.25);
  ctx.stroke();
  ctx.strokeStyle = j.main;
  ctx.beginPath();
  ctx.arc(cx, cy, rad, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * Math.min(1, r.score / 100));
  ctx.stroke();
  ctx.fillStyle = C.inkSoft;
  ctx.font = "500 30px Geist, Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${r.coverage.sampled} sites`, cx, cy + 12);
  ctx.textAlign = "left";
  void h;
};

const drawSources = (r: JuiceResult): Draw => (ctx, w, _h, j) => {
  header(ctx, "Where it flows from", w, j);
  const cats = r.byCategory.slice(0, 4);
  const max = Math.max(...cats.map((c) => c.share), 0.0001);
  cats.forEach((c, i) => {
    const y = 140 + i * 80;
    ctx.fillStyle = C.ink;
    ctx.font = "500 34px Geist, Inter, system-ui, sans-serif";
    ctx.fillText(CATEGORY_META[c.category].label, 44, y + 30);
    ctx.fillStyle = C.inkSoft;
    ctx.textAlign = "right";
    ctx.fillText(pct(c.share), w - 44, y + 30);
    ctx.textAlign = "left";
    ctx.fillStyle = "#f0ece6";
    rr(ctx, 44, y + 44, w - 88, 14, 7);
    ctx.fill();
    ctx.fillStyle = i === 0 ? j.main : j.line;
    rr(ctx, 44, y + 44, Math.max(14, (w - 88) * (c.share / max)), 14, 7);
    ctx.fill();
  });
};

const drawReclaim = (r: JuiceResult): Draw => (ctx, w, _h, j) => {
  header(ctx, "Juice you could reclaim", w, j);
  const gain = r.total > 0 ? r.reclaimable / r.total : 0;
  const leaks = r.byHealth.leak.count;
  const lost = r.lost.length;
  ctx.fillStyle = C.ink;
  ctx.font = "600 150px Geist, Inter, system-ui, sans-serif";
  const text = gain >= 0.0005 ? `+${pct(gain)}` : "0%";
  ctx.fillText(text, 40, 270);
  const tw = ctx.measureText(text).width;
  // up arrow
  ctx.strokeStyle = "#16a34a";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(70 + tw, 262);
  ctx.lineTo(70 + tw, 170);
  ctx.moveTo(40 + tw, 200);
  ctx.lineTo(70 + tw, 166);
  ctx.lineTo(100 + tw, 200);
  ctx.stroke();
  ctx.fillStyle = C.inkSoft;
  ctx.font = "500 32px Geist, Inter, system-ui, sans-serif";
  const parts = [];
  if (leaks) parts.push(`fix ${leaks} leak${leaks === 1 ? "" : "s"}`);
  if (lost) parts.push(`win back ${lost} lost link${lost === 1 ? "" : "s"}`);
  ctx.fillText(parts.length ? parts.join(" · ") : "no leaks or lost links found", 46, 350);
};

function useCardTexture(draw: Draw, juice: Juice) {
  const [tex] = useState(() => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(W * PX);
    canvas.height = Math.round(D * PX);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = 8;
    return t;
  });
  useEffect(() => {
    let alive = true;
    const paint = () => {
      if (!alive) return;
      const canvas = tex.image as HTMLCanvasElement;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      rr(ctx, 0, 0, canvas.width, canvas.height, 46);
      ctx.fill();
      draw(ctx, canvas.width, canvas.height, juice);
      tex.needsUpdate = true;
    };
    paint();
    document.fonts?.ready.then(paint);
    return () => {
      alive = false;
    };
  }, [draw, tex, juice]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/** A soft rounded-rectangle shadow (a hard-edged plane read as a gray box behind the cards). */
const shadowMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vec2 q = abs(vUv - 0.5) * 2.0;
      float d = length(max(q - 0.7, 0.0)) / 0.3;
      float a = 1.0 - smoothstep(0.0, 1.0, d);
      gl_FragColor = vec4(0.30, 0.26, 0.20, a * a * 0.12);
    }`,
});

function Card({ slot, draw, delay }: { slot: OutputSlot; draw: Draw; delay: number }) {
  const juice = juiceById(useStore((s) => s.juice));
  const tex = useCardTexture(draw, juice);
  const geo = useMemo(() => new RoundedBoxGeometry(W, T, D, 3, 0.18), []);
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.6 }), []);
  const topMat = useMemo(() => new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }), [tex]);
  const g = useRef<THREE.Group>(null);
  const t0 = useRef<number | null>(null);
  useFrame(({ clock }) => {
    if (t0.current == null) t0.current = clock.elapsedTime;
    const t = clock.elapsedTime - t0.current - delay;
    const k = t <= 0 ? 0 : 1 - Math.exp(-t * 5) * Math.cos(t * 7);
    if (g.current) {
      g.current.position.y = (1 - Math.min(1, k)) * 2.5;
      g.current.visible = t > 0;
    }
  });
  return (
    <group ref={g} position={[slot.x, 0, slot.z]}>
      <mesh rotation-x={-Math.PI / 2} position={[0.16, 0.004, 0.22]} renderOrder={0} material={shadowMat}>
        <planeGeometry args={[W * 1.22, D * 1.32]} />
      </mesh>
      <mesh geometry={geo} material={bodyMat} position={[0, T / 2, 0]} />
      <mesh rotation-x={-Math.PI / 2} position={[0, T + 0.002, 0]} material={topMat} renderOrder={6}>
        <planeGeometry args={[W, D]} />
      </mesh>
    </group>
  );
}

/** Chartbrew-style result cards on the output side of the hub. */
export function OutputCards({ result, slots, revealKey }: { result: JuiceResult; slots: OutputSlot[]; revealKey: number }) {
  const draws = useMemo(() => [drawScore(result), drawSources(result), drawReclaim(result)], [result]);
  return (
    <group key={revealKey}>
      {slots.slice(0, 3).map((s, i) => (
        <Card key={i} slot={s} draw={draws[i]!} delay={2.4 + i * 0.25} />
      ))}
    </group>
  );
}
