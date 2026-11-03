import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore } from "../store";
import { C, HEALTH_CODE, hexToRgb, OUTPUT_CODE } from "../theme";
import { HUB_RADIUS, LAKE_RADIUS, SAMPLES, type Layout } from "./layout";
import { dashFragment, dashVertex, lakeFragment, lakeVertex, poolFragment, poolVertex, waterFragment, waterVertex } from "./shaders";

const v3 = (hex: string) => new THREE.Vector3(...hexToRgb(hex));
const WATER_Y = 0.016;

/** Water palette per health code: 0 clean, 1 suspicious, 2 toxic, 3 nofollow, 4 leak, 5 lost. */
const DEEP = [C.juice, "#e9923a", "#8a7dab", "#b7b0a6", C.juice, "#c9b9a8"];
const SHALLOW = ["#ffa063", "#f6c07e", "#b9b0cf", "#d6d1c9", "#ffa063", "#e3d8cb"];

function quad(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([0, -0.5, 0, 1, -0.5, 0, 1, 0.5, 0, 0, 0.5, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}

interface Built {
  pathTex: THREE.DataTexture;
  infoTex: THREE.DataTexture;
  dashes: THREE.InstancedBufferGeometry;
  water: THREE.BufferGeometry;
  pools: { x: number; z: number; r: number; health: number; idx: number; fade: number; delay: number; speed: number }[];
}

export const riverSpeed = (strength: number) => 0.45 + 2.7 * strength;

export function buildStreams(layout: Layout): Built {
  // ---- path textures (used by the dotted guide lines)
  const outputRow = layout.outputLine ? layout.paths.length : -1;
  const rows = Math.max(1, layout.paths.length + (layout.outputLine ? 1 : 0));
  const pathData = new Float32Array(SAMPLES * rows * 4);
  const info = new Float32Array(2 * rows * 4);
  const writeRow = (r: number, pts: Float32Array, length: number, delay: number, health: number, fade: number) => {
    for (let i = 0; i < SAMPLES; i++) {
      pathData[(r * SAMPLES + i) * 4] = pts[i * 2]!;
      pathData[(r * SAMPLES + i) * 4 + 1] = pts[i * 2 + 1]!;
    }
    info.set([length, 0, delay, health], r * 8);
    info.set([fade, 0, 0, 0], r * 8 + 4);
  };
  layout.paths.forEach((p, r) => writeRow(r, p.points, p.length, p.delay, p.kind === "lost" ? HEALTH_CODE.lost : HEALTH_CODE[p.health], p.fade));
  let outLen = 0;
  if (layout.outputLine) {
    const pts = layout.outputLine;
    for (let i = 1; i < SAMPLES; i++) outLen += Math.hypot(pts[i * 2]! - pts[(i - 1) * 2]!, pts[i * 2 + 1]! - pts[(i - 1) * 2 + 1]!);
    writeRow(outputRow, pts, outLen, 2.2, OUTPUT_CODE, 0);
  }
  const pathTex = new THREE.DataTexture(pathData, SAMPLES, rows, THREE.RGBAFormat, THREE.FloatType);
  pathTex.minFilter = pathTex.magFilter = THREE.NearestFilter;
  pathTex.needsUpdate = true;
  const infoTex = new THREE.DataTexture(info, 2, rows, THREE.RGBAFormat, THREE.FloatType);
  infoTex.minFilter = infoTex.magFilter = THREE.NearestFilter;
  infoTex.needsUpdate = true;

  // ---- dotted lines: nofollow trickles, dry beds of lost links, and the output line
  const D: Record<string, number[]> = { aPath: [], aPhase: [], aSpeed: [], aLen: [], aThick: [] };
  const pushDashes = (row: number, L: number, gap: number, thick: number, len: number, speed: number) => {
    const n = Math.max(2, Math.floor(L / gap));
    for (let i = 0; i < n; i++) {
      D.aPath!.push(row);
      D.aPhase!.push(i / n);
      D.aSpeed!.push(speed);
      D.aLen!.push(len);
      D.aThick!.push(thick);
    }
  };
  layout.paths.forEach((p, r) => {
    if (p.health === "nofollow" && p.kind !== "lost") pushDashes(r, p.length, 0.3, 0.1, 0.1, 0.35);
    if (p.kind === "lost") pushDashes(r, p.length, 0.42, 0.11, 0.2, 0.0);
  });
  if (outputRow >= 0) pushDashes(outputRow, outLen, 0.44, 0.1, 0.17, 0.5);
  const base = quad();
  const dashes = new THREE.InstancedBufferGeometry();
  dashes.index = base.index;
  dashes.setAttribute("position", base.getAttribute("position"));
  for (const [k, v] of Object.entries(D)) dashes.setAttribute(k, new THREE.InstancedBufferAttribute(new Float32Array(v), 1));
  dashes.instanceCount = D.aPath!.length;

  // ---- water ribbons (narrow first, so the big rivers sit on top where they converge)
  const order = layout.paths.map((p, i) => i).filter((i) => {
    const p = layout.paths[i]!;
    return p.kind !== "lost" && p.health !== "nofollow";
  });
  order.sort((a, b) => layout.paths[a]!.width - layout.paths[b]!.width);
  const pos: number[] = [], idx: number[] = [];
  const A: Record<string, number[]> = { aS: [], aV: [], aLen: [], aW: [], aSpeed: [], aHealth: [], aIdx: [], aFade: [], aDelay: [], aBankV: [] };
  let vbase = 0;
  for (const pi of order) {
    const p = layout.paths[pi]!;
    const half = p.width / 2;
    const bankW = 0.09 + 0.07 * p.width;
    const bankV = bankW / half;
    const vmax = 1 + bankV;
    const speed = p.kind === "tail" ? 0.5 : riverSpeed(p.strength);
    const health = HEALTH_CODE[p.health];
    for (let i = 0; i < SAMPLES; i++) {
      const s = i / (SAMPLES - 1);
      const x = p.points[i * 2]!, z = p.points[i * 2 + 1]!;
      const ia = Math.max(0, i - 1), ib = Math.min(SAMPLES - 1, i + 1);
      let tx = p.points[ib * 2]! - p.points[ia * 2]!, tz = p.points[ib * 2 + 1]! - p.points[ia * 2 + 1]!;
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl;
      tz /= tl;
      const nx = -tz, nz = tx;
      for (const v of [-vmax, vmax]) {
        pos.push(x + nx * v * half, WATER_Y, z + nz * v * half);
        A.aS!.push(s);
        A.aV!.push(v);
        A.aLen!.push(p.length);
        A.aW!.push(p.width);
        A.aSpeed!.push(speed);
        A.aHealth!.push(health);
        A.aIdx!.push(pi);
        A.aFade!.push(p.fade);
        A.aDelay!.push(p.delay);
        A.aBankV!.push(bankV);
      }
      if (i < SAMPLES - 1) {
        const a = vbase + i * 2;
        idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
      }
    }
    vbase += SAMPLES * 2;
  }
  const water = new THREE.BufferGeometry();
  water.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  for (const [k, v] of Object.entries(A)) water.setAttribute(k, new THREE.Float32BufferAttribute(v, 1));
  water.setIndex(idx);

  // ---- spring pools under each key (and at the head of the long-tail creek)
  const pools: Built["pools"] = [];
  layout.keys.forEach((k) => {
    if (k.path < 0 || k.kind === "lost") return;
    const p = layout.paths[k.path]!;
    if (p.health === "nofollow") return;
    pools.push({ x: k.x, z: k.z, r: k.size * 0.62 + p.width * 0.42, health: HEALTH_CODE[p.health], idx: k.path, fade: p.fade, delay: p.delay, speed: riverSpeed(p.strength) });
  });
  const tailPath = layout.paths.findIndex((p) => p.kind === "tail");
  if (tailPath >= 0 && layout.tail) {
    const p = layout.paths[tailPath]!;
    pools.push({ x: p.points[0]!, z: p.points[1]!, r: 0.55, health: 0, idx: tailPath, fade: 0, delay: p.delay, speed: 0.5 });
  }

  return { pathTex, infoTex, dashes, water, pools };
}

export function Streams({ layout }: { layout: Layout }) {
  const built = useMemo(() => buildStreams(layout), [layout]);
  const needsStart = useRef(true);
  const poolMesh = useRef<THREE.InstancedMesh>(null);

  const uniforms = useMemo(
    () => ({
      uPaths: { value: built.pathTex },
      uInfo: { value: built.infoTex },
      uSamples: { value: SAMPLES },
      uTime: { value: 0 },
      uStart: { value: 0 },
      uFocus: { value: -1 },
      uDash: { value: v3("#b8b0a4") },
      uLost: { value: v3("#cdb7a6") },
      uOutput: { value: v3(C.output) },
      uDeep: { value: DEEP.map(v3) },
      uShallow: { value: SHALLOW.map(v3) },
      uFoam: { value: v3("#fff1e6") },
      uFoamMurky: { value: v3("#ddd7e8") },
      uBank: { value: v3("#e6dccd") },
      uBg: { value: v3(C.bg) },
      uLeak: { value: v3(C.leak) },
      uInner: { value: HUB_RADIUS - 0.12 },
      uOuter: { value: LAKE_RADIUS },
      uFill: { value: 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    uniforms.uPaths.value = built.pathTex;
    uniforms.uInfo.value = built.infoTex;
    needsStart.current = true;
    const m = new THREE.Matrix4();
    const mesh = poolMesh.current;
    if (mesh) {
      const H = new Float32Array(built.pools.length), I = new Float32Array(built.pools.length), F = new Float32Array(built.pools.length);
      const Dl = new Float32Array(built.pools.length), Sp = new Float32Array(built.pools.length);
      built.pools.forEach((p, i) => {
        m.makeRotationX(-Math.PI / 2).premultiply(new THREE.Matrix4().makeScale(p.r * 2, 1, p.r * 2)).premultiply(new THREE.Matrix4().makeTranslation(p.x, WATER_Y + 0.002, p.z));
        mesh.setMatrixAt(i, m);
        H[i] = p.health;
        I[i] = p.idx;
        F[i] = p.fade;
        Dl[i] = p.delay;
        Sp[i] = p.speed;
      });
      mesh.count = built.pools.length;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.geometry.setAttribute("aHealth", new THREE.InstancedBufferAttribute(H, 1));
      mesh.geometry.setAttribute("aIdx", new THREE.InstancedBufferAttribute(I, 1));
      mesh.geometry.setAttribute("aFade", new THREE.InstancedBufferAttribute(F, 1));
      mesh.geometry.setAttribute("aDelay", new THREE.InstancedBufferAttribute(Dl, 1));
      mesh.geometry.setAttribute("aSpeed", new THREE.InstancedBufferAttribute(Sp, 1));
    }
    return () => {
      built.pathTex.dispose();
      built.infoTex.dispose();
      built.dashes.dispose();
      built.water.dispose();
    };
  }, [built, uniforms]);

  const materials = useMemo(() => {
    const common = { uniforms, transparent: true, depthWrite: false, depthTest: true };
    return {
      // Instanced quads are built in the ground plane; draw both faces so winding never hides them.
      dash: new THREE.ShaderMaterial({ ...common, side: THREE.DoubleSide, vertexShader: dashVertex, fragmentShader: dashFragment }),
      water: new THREE.ShaderMaterial({ ...common, vertexShader: waterVertex, fragmentShader: waterFragment }),
      pool: new THREE.ShaderMaterial({ ...common, vertexShader: poolVertex, fragmentShader: poolFragment }),
      lake: new THREE.ShaderMaterial({ ...common, vertexShader: lakeVertex, fragmentShader: lakeFragment }),
    };
  }, [uniforms]);

  const poolGeo = useMemo(() => new THREE.CircleGeometry(0.5, 48), []);
  const lakeGeo = useMemo(() => new THREE.RingGeometry(HUB_RADIUS - 0.12, LAKE_RADIUS + 0.4, 160, 1), []);
  const pathIndex = useMemo(() => new Map(layout.paths.map((p, i) => [p.id, i])), [layout]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    uniforms.uTime.value = t;
    if (needsStart.current) {
      uniforms.uStart.value = t;
      needsStart.current = false;
    }
    const since = t - uniforms.uStart.value;
    uniforms.uFill.value = since < 0.4 ? 0 : Math.min(1, 1 - Math.exp(-(since - 0.4) * 3.2));
    const { hovered, selected } = useStore.getState();
    const focus = hovered ?? selected;
    uniforms.uFocus.value = focus != null ? (pathIndex.get(focus) ?? -1) : -1;
  });

  return (
    <group>
      <mesh geometry={lakeGeo} material={materials.lake} rotation-x={-Math.PI / 2} position={[0, WATER_Y - 0.002, 0]} renderOrder={1} />
      <mesh geometry={built.water} material={materials.water} frustumCulled={false} renderOrder={2} />
      <instancedMesh ref={poolMesh} args={[poolGeo, materials.pool, Math.max(1, built.pools.length)]} frustumCulled={false} renderOrder={2} />
      <mesh geometry={built.dashes} material={materials.dash} frustumCulled={false} renderOrder={3} />
    </group>
  );
}
