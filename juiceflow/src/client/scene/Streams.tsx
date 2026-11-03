import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore } from "../store";
import { C, hexToRgb } from "../theme";
import { HUB_RADIUS, LAKE_RADIUS, SAMPLES, type Layout } from "./layout";
import { lakeFragment, lakeVertex, poolFragment, poolVertex, waterFragment, waterVertex } from "./shaders";

const v3 = (hex: string) => new THREE.Vector3(...hexToRgb(hex));
const WATER_Y = 0.016;

/**
 * Every stream uses the same juice-orange water; only the width (the site's
 * share of your juice) and the flow speed differ. Spam, nofollow and broken
 * targets are explained in the hover card and the side panel instead.
 */
const DEEP = C.juice;
const SHALLOW = "#ffa063";

interface Pool {
  x: number;
  z: number;
  r: number;
  idx: number;
  fade: number;
  delay: number;
  speed: number;
}

interface Built {
  water: THREE.BufferGeometry;
  pools: Pool[];
}

export const riverSpeed = (strength: number) => 0.45 + 2.7 * strength;

export function buildStreams(layout: Layout): Built {
  // Water ribbons, narrow first so the big rivers sit on top where they converge.
  const order = layout.paths.map((_, i) => i).filter((i) => layout.paths[i]!.kind !== "lost");
  order.sort((a, b) => layout.paths[a]!.width - layout.paths[b]!.width);
  const pos: number[] = [], idx: number[] = [];
  const A: Record<string, number[]> = { aS: [], aV: [], aLen: [], aW: [], aSpeed: [], aHealth: [], aIdx: [], aFade: [], aDelay: [], aBankV: [] };
  let vbase = 0;
  for (const pi of order) {
    const p = layout.paths[pi]!;
    const half = p.width / 2;
    const bankV = (0.09 + 0.07 * p.width) / half;
    const vmax = 1 + bankV;
    const speed = p.kind === "tail" ? 0.5 : riverSpeed(p.strength);
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
        A.aHealth!.push(0);
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

  // A spring pool under each key (and at the head of the long-tail creek).
  const pools: Pool[] = [];
  layout.keys.forEach((k) => {
    if (k.path < 0 || k.kind === "lost") return;
    const p = layout.paths[k.path]!;
    pools.push({ x: k.x, z: k.z, r: k.size * 0.62 + p.width * 0.42, idx: k.path, fade: p.fade, delay: p.delay, speed: riverSpeed(p.strength) });
  });
  const tailPath = layout.paths.findIndex((p) => p.kind === "tail");
  if (tailPath >= 0) {
    const p = layout.paths[tailPath]!;
    pools.push({ x: p.points[0]!, z: p.points[1]!, r: 0.55, idx: tailPath, fade: 0, delay: p.delay, speed: 0.5 });
  }
  return { water, pools };
}

export function Streams({ layout }: { layout: Layout }) {
  const built = useMemo(() => buildStreams(layout), [layout]);
  const needsStart = useRef(true);
  const poolMesh = useRef<THREE.InstancedMesh>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uStart: { value: 0 },
      uFocus: { value: -1 },
      uDeep: { value: new Array(6).fill(0).map(() => v3(DEEP)) },
      uShallow: { value: new Array(6).fill(0).map(() => v3(SHALLOW)) },
      uFoam: { value: v3("#fff1e6") },
      uFoamMurky: { value: v3("#fff1e6") },
      uBank: { value: v3("#e6dccd") },
      uBg: { value: v3(C.bg) },
      uLeak: { value: v3(DEEP) },
      uInner: { value: HUB_RADIUS - 0.12 },
      uOuter: { value: LAKE_RADIUS },
      uFill: { value: 0 },
    }),
    [],
  );

  useEffect(() => {
    needsStart.current = true;
    const mesh = poolMesh.current;
    if (mesh) {
      const m = new THREE.Matrix4();
      const n = built.pools.length;
      const H = new Float32Array(n), I = new Float32Array(n), F = new Float32Array(n), Dl = new Float32Array(n), Sp = new Float32Array(n);
      built.pools.forEach((p, i) => {
        m.makeRotationX(-Math.PI / 2).premultiply(new THREE.Matrix4().makeScale(p.r * 2, 1, p.r * 2)).premultiply(new THREE.Matrix4().makeTranslation(p.x, WATER_Y + 0.002, p.z));
        mesh.setMatrixAt(i, m);
        I[i] = p.idx;
        F[i] = p.fade;
        Dl[i] = p.delay;
        Sp[i] = p.speed;
      });
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.geometry.setAttribute("aHealth", new THREE.InstancedBufferAttribute(H, 1));
      mesh.geometry.setAttribute("aIdx", new THREE.InstancedBufferAttribute(I, 1));
      mesh.geometry.setAttribute("aFade", new THREE.InstancedBufferAttribute(F, 1));
      mesh.geometry.setAttribute("aDelay", new THREE.InstancedBufferAttribute(Dl, 1));
      mesh.geometry.setAttribute("aSpeed", new THREE.InstancedBufferAttribute(Sp, 1));
    }
    return () => built.water.dispose();
  }, [built]);

  const materials = useMemo(() => {
    const common = { uniforms, transparent: true, depthWrite: false, depthTest: true };
    return {
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
    </group>
  );
}
