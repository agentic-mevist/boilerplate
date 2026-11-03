import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore } from "../store";
import { C, HEALTH_CODE, hexToRgb, OUTPUT_CODE } from "../theme";
import { SAMPLES, type Layout } from "./layout";
import { dashFragment, dashVertex, ribbonFragment, ribbonVertex, streakFragment, streakVertex } from "./shaders";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const v3 = (hex: string) => new THREE.Vector3(...hexToRgb(hex));

function quad(x0: number, x1: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, -0.5, 0, x1, -0.5, 0, x1, 0.5, 0, x0, 0.5, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}

interface Built {
  pathTex: THREE.DataTexture;
  infoTex: THREE.DataTexture;
  streaks: THREE.InstancedBufferGeometry;
  dashes: THREE.InstancedBufferGeometry;
  ribbon: THREE.BufferGeometry;
}

function instanced(base: THREE.BufferGeometry, attrs: Record<string, number[]>, count: number): THREE.InstancedBufferGeometry {
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  g.setAttribute("position", base.getAttribute("position"));
  for (const [k, v] of Object.entries(attrs)) g.setAttribute(k, new THREE.InstancedBufferAttribute(new Float32Array(v), 1));
  g.instanceCount = count;
  return g;
}

export function buildStreams(layout: Layout): Built {
  const outputRow = layout.outputLine ? layout.paths.length : -1;
  const rows = Math.max(1, layout.paths.length + (layout.outputLine ? 1 : 0));
  const pathData = new Float32Array(SAMPLES * rows * 4);
  const info = new Float32Array(2 * rows * 4);

  const writeRow = (r: number, pts: Float32Array, length: number, hw: number, delay: number, health: number, fade: number, strength: number) => {
    for (let i = 0; i < SAMPLES; i++) {
      pathData[(r * SAMPLES + i) * 4] = pts[i * 2]!;
      pathData[(r * SAMPLES + i) * 4 + 1] = pts[i * 2 + 1]!;
    }
    info.set([length, hw, delay, health], r * 8);
    info.set([fade, strength, 0, 0], r * 8 + 4);
  };

  layout.paths.forEach((p, r) => writeRow(r, p.points, p.length, p.halfWidth, p.delay, p.kind === "lost" ? HEALTH_CODE.lost : HEALTH_CODE[p.health], p.fade, p.strength));
  let outLen = 0;
  if (layout.outputLine) {
    const pts = layout.outputLine;
    for (let i = 1; i < SAMPLES; i++) outLen += Math.hypot(pts[i * 2]! - pts[(i - 1) * 2]!, pts[i * 2 + 1]! - pts[(i - 1) * 2 + 1]!);
    writeRow(outputRow, pts, outLen, 0.22, 2.4, OUTPUT_CODE, 0, 0.6);
  }

  const pathTex = new THREE.DataTexture(pathData, SAMPLES, rows, THREE.RGBAFormat, THREE.FloatType);
  pathTex.minFilter = pathTex.magFilter = THREE.NearestFilter;
  pathTex.needsUpdate = true;
  const infoTex = new THREE.DataTexture(info, 2, rows, THREE.RGBAFormat, THREE.FloatType);
  infoTex.minFilter = infoTex.magFilter = THREE.NearestFilter;
  infoTex.needsUpdate = true;

  // --- streaks (the Windy-style particles)
  const rng = mulberry32(1337);
  const S: Record<string, number[]> = { aPath: [], aPhase: [], aSpeed: [], aLane: [], aLen: [], aThick: [], aBright: [] };
  const pushStreak = (row: number, lane: number, speed: number, len: number, thick: number, bright: number) => {
    S.aPath!.push(row);
    S.aPhase!.push(rng());
    S.aLane!.push(lane);
    S.aSpeed!.push(speed);
    S.aLen!.push(len);
    S.aThick!.push(thick);
    S.aBright!.push(bright);
  };
  layout.paths.forEach((p, r) => {
    if (p.kind === "lost") return;
    const L = p.length;
    let n: number;
    if (p.health === "nofollow") n = L * 0.35;
    else if (p.kind === "tail") n = L * 0.7;
    else n = L * (1.6 + 2 * p.halfWidth * 17);
    if (p.health === "toxic") n *= 0.8;
    n = Math.round(Math.min(1100, Math.max(3, n)));
    for (let k = 0; k < n; k++) {
      const u = rng() * 2 - 1;
      const lane = Math.sign(u) * Math.pow(Math.abs(u), 0.85);
      const speed = (2.0 + 1.6 * p.strength) * (0.8 + 0.4 * rng()) * (1 - 0.25 * Math.abs(lane));
      const len = (0.6 + 1.25 * p.strength) * (0.7 + 0.6 * rng());
      const thick = 0.1 + 0.07 * p.strength;
      let bright = 0.72 + 0.28 * rng();
      if (p.health === "nofollow") bright *= 0.55;
      if (p.kind === "tail") bright *= 0.75;
      pushStreak(r, lane, speed, len, thick, bright);
    }
  });
  if (outputRow >= 0) {
    const n = Math.round(outLen * 9);
    for (let k = 0; k < n; k++) {
      const u = rng() * 2 - 1;
      pushStreak(outputRow, u, (2.6 + 0.8 * rng()) * (1 - 0.2 * Math.abs(u)), 0.5 + 0.5 * rng(), 0.08, 0.4 + 0.5 * rng());
    }
  }
  const streaks = instanced(quad(0, 1), S, S.aPath!.length);

  // --- dashes (Chartbrew-style dotted guide line under every stream)
  const D: Record<string, number[]> = { aPath: [], aPhase: [], aSpeed: [], aLen: [], aThick: [] };
  const pushDashes = (row: number, L: number, gap: number, thick: number) => {
    const n = Math.max(2, Math.floor(L / gap));
    for (let i = 0; i < n; i++) {
      D.aPath!.push(row);
      D.aPhase!.push(i / n);
      D.aSpeed!.push(0.45);
      D.aLen!.push(0.16);
      D.aThick!.push(thick);
    }
  };
  layout.paths.forEach((p, r) => pushDashes(r, p.length, p.kind === "tail" ? 0.5 : 0.42, p.kind === "tail" ? 0.07 : 0.09));
  if (outputRow >= 0) pushDashes(outputRow, outLen, 0.44, 0.09);
  const dashes = instanced(quad(0, 1), D, D.aPath!.length);

  // --- ribbons (a soft river bed under the particles)
  const ribbon = new THREE.BufferGeometry();
  const aPath: number[] = [], aS: number[] = [], aV: number[] = [], pos: number[] = [], idx: number[] = [];
  let base = 0;
  layout.paths.forEach((p, r) => {
    if (p.kind !== "main" || p.health === "nofollow") return;
    for (let i = 0; i < SAMPLES; i++) {
      const s = i / (SAMPLES - 1);
      for (const v of [-1, 1]) {
        aPath.push(r);
        aS.push(s);
        aV.push(v);
        pos.push(0, 0, 0);
      }
      if (i < SAMPLES - 1) {
        const a = base + i * 2;
        idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
      }
    }
    base += SAMPLES * 2;
  });
  ribbon.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  ribbon.setAttribute("aPath", new THREE.Float32BufferAttribute(aPath, 1));
  ribbon.setAttribute("aS", new THREE.Float32BufferAttribute(aS, 1));
  ribbon.setAttribute("aV", new THREE.Float32BufferAttribute(aV, 1));
  ribbon.setIndex(idx);

  return { pathTex, infoTex, streaks, dashes, ribbon };
}

export function Streams({ layout }: { layout: Layout }) {
  const built = useMemo(() => buildStreams(layout), [layout]);
  const needsStart = useRef(true);

  const uniforms = useMemo(
    () => ({
      uPaths: { value: built.pathTex },
      uInfo: { value: built.infoTex },
      uSamples: { value: SAMPLES },
      uTime: { value: 0 },
      uStart: { value: 0 },
      uFocus: { value: -1 },
      uColors: { value: [C.juice, C.suspicious, C.toxic, C.nofollow, C.juice, C.lost, C.output].map(v3) },
      uLeakColor: { value: v3(C.leak) },
      uDash: { value: v3(C.dash) },
      uLost: { value: v3(C.lost) },
      uOutput: { value: v3(C.output) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    uniforms.uPaths.value = built.pathTex;
    uniforms.uInfo.value = built.infoTex;
    needsStart.current = true;
    return () => {
      built.pathTex.dispose();
      built.infoTex.dispose();
      built.streaks.dispose();
      built.dashes.dispose();
      built.ribbon.dispose();
    };
  }, [built, uniforms]);

  const materials = useMemo(() => {
    const common = { uniforms, transparent: true, depthWrite: false, depthTest: true };
    return {
      streak: new THREE.ShaderMaterial({ ...common, vertexShader: streakVertex, fragmentShader: streakFragment }),
      dash: new THREE.ShaderMaterial({ ...common, vertexShader: dashVertex, fragmentShader: dashFragment }),
      ribbon: new THREE.ShaderMaterial({ ...common, vertexShader: ribbonVertex, fragmentShader: ribbonFragment }),
    };
  }, [uniforms]);

  const pathIndex = useMemo(() => new Map(layout.paths.map((p, i) => [p.id, i])), [layout]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    uniforms.uTime.value = t;
    if (needsStart.current) {
      uniforms.uStart.value = t;
      needsStart.current = false;
    }
    const { hovered, selected } = useStore.getState();
    const focus = hovered ?? selected;
    uniforms.uFocus.value = focus != null ? (pathIndex.get(focus) ?? -1) : -1;
  });

  return (
    <group>
      <mesh geometry={built.ribbon} material={materials.ribbon} frustumCulled={false} renderOrder={1} />
      <mesh geometry={built.dashes} material={materials.dash} frustumCulled={false} renderOrder={2} />
      <mesh geometry={built.streaks} material={materials.streak} frustumCulled={false} renderOrder={3} />
    </group>
  );
}
