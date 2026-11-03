import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore } from "../store";
import { C, hexToRgb } from "../theme";
import { HUB_RADIUS, LAKE_RADIUS, SAMPLES, type Layout } from "./layout";
import {
  detailGenFragment,
  genVertex,
  lakeFieldFragment,
  lakeFieldVertex,
  poolFieldFragment,
  poolFieldVertex,
  riverFieldFragment,
  riverFieldVertex,
  rippleGenFragment,
  surfaceFragment,
  surfaceVertex,
} from "./liquid/shaders";
import { PATCH_WAVES, RIPPLE_WAVES, waveTable } from "./liquid/textures";

/**
 * The juice: every river, spring pool and the lake around your site, rendered
 * as one liquid surface (see liquid/shaders.ts). Each stream is as wide as its
 * share of your juice and flows as fast as it is strong.
 */

const v3 = (hex: string) => new THREE.Vector3(...hexToRgb(hex));
const WATER_Y = 0.016;
const TEX = 256;

export const riverSpeed = (strength: number) => 0.45 + 2.7 * strength;
/** Height of the liquid (world units): a thin film for a spring, a deep river for the top source. */
export const liquidHeight = (width: number) => 0.02 + 0.13 * width;

// Light comes from the top-left of the screen, as for the key-caps' shadows.
const SHADOW_DIR = new THREE.Vector2(0.1, 0.13).normalize();
const SUN = new THREE.Vector3(-SHADOW_DIR.x * 0.5, 0.866, -SHADOW_DIR.y * 0.5).normalize();
const BOX = new THREE.Vector3(-SHADOW_DIR.x * 0.47, 0.88, -SHADOW_DIR.y * 0.47).normalize();

function buildRivers(layout: Layout): THREE.BufferGeometry {
  // narrow first; order doesn't matter for the additive field, but keeps it stable
  const order = layout.paths.map((_, i) => i).filter((i) => layout.paths[i]!.kind !== "lost");
  const n = order.length * SAMPLES * 2;
  const f2 = (k: number) => new Float32Array(n * k);
  const a = { aC: f2(2), aN: f2(2), aT: f2(2), aSide: f2(1), aS: f2(1), aLen: f2(1), aHalf: f2(1), aH: f2(1), aSpeed: f2(1), aIdx: f2(1), aFade: f2(1), aDelay: f2(1), aFroth: f2(1) };
  const idx: number[] = [];
  let v = 0;
  for (const pi of order) {
    const p = layout.paths[pi]!;
    const speed = p.kind === "tail" ? 0.5 : riverSpeed(p.strength);
    const base = v;
    for (let i = 0; i < SAMPLES; i++) {
      const x = p.points[i * 2]!, z = p.points[i * 2 + 1]!;
      const ia = Math.max(0, i - 1), ib = Math.min(SAMPLES - 1, i + 1);
      let tx = p.points[ib * 2]! - p.points[ia * 2]!, tz = p.points[ib * 2 + 1]! - p.points[ia * 2 + 1]!;
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl;
      tz /= tl;
      for (const side of [-1, 1]) {
        a.aC.set([x, z], v * 2);
        a.aN.set([-tz, tx], v * 2);
        a.aT.set([tx, tz], v * 2);
        a.aSide[v] = side;
        a.aS[v] = i / (SAMPLES - 1);
        a.aLen[v] = p.length;
        a.aHalf[v] = p.width / 2;
        a.aH[v] = liquidHeight(p.width);
        a.aSpeed[v] = speed;
        a.aIdx[v] = pi;
        a.aFade[v] = p.fade;
        a.aDelay[v] = p.delay;
        a.aFroth[v] = 0.05 + 0.2 * p.strength;
        v++;
      }
      if (i < SAMPLES - 1) {
        const q = base + i * 2;
        idx.push(q, q + 1, q + 3, q, q + 3, q + 2);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  for (const [k, arr] of Object.entries(a)) g.setAttribute(k, new THREE.BufferAttribute(arr, arr.length / n));
  // the vertex shader places everything; position is only there to satisfy three.js
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setIndex(idx);
  return g;
}

function buildPools(layout: Layout): THREE.InstancedBufferGeometry {
  const pools: { x: number; z: number; r: number; h: number; idx: number; fade: number; delay: number; speed: number }[] = [];
  layout.keys.forEach((k) => {
    if (k.path < 0 || k.kind === "lost") return;
    const p = layout.paths[k.path]!;
    pools.push({ x: k.x, z: k.z, r: k.size * 0.5 + p.width * 0.3, h: Math.max(0.07, liquidHeight(p.width)), idx: k.path, fade: p.fade, delay: p.delay, speed: riverSpeed(p.strength) });
  });
  const tailPath = layout.paths.findIndex((p) => p.kind === "tail");
  if (tailPath >= 0) {
    const p = layout.paths[tailPath]!;
    pools.push({ x: p.points[0]!, z: p.points[1]!, r: 0.45, h: 0.07, idx: tailPath, fade: 0, delay: p.delay, speed: 0.5 });
  }
  const g = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(2, 2);
  g.index = quad.index;
  g.setAttribute("position", quad.getAttribute("position"));
  const inst = (k: number, fn: (p: (typeof pools)[number]) => number[]) => new THREE.InstancedBufferAttribute(new Float32Array(pools.flatMap(fn)), k);
  g.setAttribute("aCenter", inst(2, (p) => [p.x, p.z]));
  g.setAttribute("aR", inst(1, (p) => [p.r]));
  g.setAttribute("aH", inst(1, (p) => [p.h]));
  g.setAttribute("aIdx", inst(1, (p) => [p.idx]));
  g.setAttribute("aFade", inst(1, (p) => [p.fade]));
  g.setAttribute("aDelay", inst(1, (p) => [p.delay]));
  g.setAttribute("aSpeed", inst(1, (p) => [p.speed]));
  g.instanceCount = pools.length;
  return g;
}

// ---- procedural textures, rendered once per renderer on the GPU ----

interface LiquidTextures {
  ripple: THREE.Texture;
  detail: THREE.Texture;
}
const generated = new WeakMap<THREE.WebGLRenderer, LiquidTextures>();

function generateTextures(gl: THREE.WebGLRenderer): LiquidTextures {
  const hit = generated.get(gl);
  if (hit) return hit;
  const table = waveTable();
  const s = table.stats;
  const toVec4 = (arr: Float32Array) => Array.from({ length: arr.length / 4 }, (_, i) => new THREE.Vector4(arr[i * 4]!, arr[i * 4 + 1]!, arr[i * 4 + 2]!, arr[i * 4 + 3]!));
  const target = () =>
    new THREE.WebGLRenderTarget(TEX, TEX, {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: true,
      depthBuffer: false,
      anisotropy: 4,
    });
  const scene = new THREE.Scene();
  const cam = new THREE.Camera();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  scene.add(quad);
  const run = (mat: THREE.ShaderMaterial) => {
    const rt = target();
    quad.material = mat;
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(rt);
    gl.render(scene, cam);
    gl.setRenderTarget(prev);
    mat.dispose();
    return rt.texture;
  };
  const ripple = run(
    new THREE.ShaderMaterial({
      vertexShader: genVertex,
      fragmentShader: rippleGenFragment,
      defines: { RIPPLE_WAVES },
      uniforms: {
        uWaves: { value: toVec4(table.ripple) },
        uHMin: { value: s.hMin },
        uHMax: { value: s.hMax },
        uGMax: { value: s.gMax },
        uDepth: { value: s.depth },
        uCLo: { value: s.cLo },
        uCHi: { value: s.cHi },
        uTexel: { value: new THREE.Vector2(1 / TEX, 1 / TEX) },
      },
    }),
  );
  const detail = run(new THREE.ShaderMaterial({ vertexShader: genVertex, fragmentShader: detailGenFragment, defines: { PATCH_WAVES }, uniforms: { uPatch: { value: toVec4(table.patch) } } }));
  quad.geometry.dispose();
  const out = { ripple, detail };
  generated.set(gl, out);
  return out;
}

const additive = {
  transparent: true,
  side: THREE.DoubleSide, // the quads are mapped onto the ground in the shader; their winding faces away

  depthTest: false,
  depthWrite: false,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneFactor,
  glslVersion: THREE.GLSL3,
} as const;

const tmpSize = new THREE.Vector2();
const tmpDir = new THREE.Vector3();
const tmpColor = new THREE.Color();

/** Field-buffer resolution relative to the drawing buffer: about one texel per CSS pixel. */
const fieldScale = (dpr: number) => Math.min(1, Math.max(0.5, 1.25 / dpr));

export function Liquid({ layout, fadeR }: { layout: Layout; fadeR: number }) {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const needsStart = useRef(true);
  const textures = useMemo(() => generateTextures(gl), [gl]);

  const field = useMemo(() => {
    const floatOK = gl.extensions.has("EXT_color_buffer_float") || gl.extensions.has("EXT_color_buffer_half_float");
    return new THREE.WebGLRenderTarget(1, 1, {
      count: 2,
      type: floatOK ? THREE.HalfFloatType : THREE.UnsignedByteType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
      depthBuffer: false,
      stencilBuffer: false,
    });
  }, [gl]);
  useEffect(() => () => field.dispose(), [field]);
  useEffect(() => {
    const k = fieldScale(dpr);
    field.setSize(Math.max(1, Math.round(size.width * dpr * k)), Math.max(1, Math.round(size.height * dpr * k)));
  }, [field, size.width, size.height, dpr]);

  const shared = useMemo(
    () => ({
      uTime: { value: 0 },
      uStart: { value: 0 },
      uFocus: { value: -1 },
      uPx: { value: 0.05 },
      uShadowDir: { value: SHADOW_DIR.clone() },
      uShadowLen: { value: 0.9 },
    }),
    [],
  );
  const lakeU = useMemo(() => ({ uInner: { value: HUB_RADIUS - 0.12 }, uOuter: { value: LAKE_RADIUS }, uFill: { value: 0 } }), []);

  // The off-screen field scene: rivers, pools and the lake, all additive.
  const fieldScene = useMemo(() => {
    const scene = new THREE.Scene();
    const rivers = new THREE.Mesh(buildRivers(layout), new THREE.ShaderMaterial({ ...additive, uniforms: shared, vertexShader: riverFieldVertex, fragmentShader: riverFieldFragment }));
    const pools = new THREE.Mesh(buildPools(layout), new THREE.ShaderMaterial({ ...additive, uniforms: shared, vertexShader: poolFieldVertex, fragmentShader: poolFieldFragment }));
    const lake = new THREE.Mesh(
      new THREE.RingGeometry(HUB_RADIUS - 0.4, LAKE_RADIUS + 1.0, 160, 2),
      new THREE.ShaderMaterial({ ...additive, uniforms: { ...shared, ...lakeU }, vertexShader: lakeFieldVertex, fragmentShader: lakeFieldFragment }),
    );
    lake.rotation.x = -Math.PI / 2;
    for (const m of [lake, rivers, pools]) {
      m.frustumCulled = false;
      scene.add(m);
    }
    return scene;
  }, [layout, shared, lakeU]);
  useEffect(
    () => () =>
      fieldScene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          (m.material as THREE.Material).dispose();
        }
      }),
    [fieldScene],
  );

  const surface = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: surfaceVertex,
        fragmentShader: surfaceFragment,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        uniforms: {
          uFieldA: { value: field.textures[0] },
          uFieldB: { value: field.textures[1] },
          uRipple: { value: textures.ripple },
          uDetail: { value: textures.detail },
          uBuffer: { value: new THREE.Vector2(1, 1) },
          uTexel: { value: new THREE.Vector2(1, 1) },
          uWorldTexel: { value: new THREE.Vector2(0.05, 0.05) },
          uTime: shared.uTime,
          uSun: { value: SUN },
          uView: { value: new THREE.Vector3(0, 1, 0) },
          uBox: { value: BOX },
          uBg: { value: v3(C.bg) },
          uGrid: { value: v3(C.grid) },
          uSpacing: { value: 1.2 },
          uDotR: { value: 0.05 },
          uFadeR: { value: fadeR },
          uThin: { value: v3("#ffdcc4") },
          uShallow: { value: v3("#ff9a5c") },
          uDeep: { value: v3(C.juice) },
          uRim: { value: v3("#e8521c") },
          uFoam: { value: v3("#fff4ea") },
          uGlow: { value: v3("#ffb27a") },
          uShade: { value: v3("#e6c2a6") },
        },
      }),
    [field, textures, shared, fadeR],
  );
  useEffect(() => () => surface.dispose(), [surface]);

  const plane = useMemo(() => {
    const b = layout.bounds;
    const g = new THREE.PlaneGeometry(b.maxX - b.minX + 8, b.maxZ - b.minZ + 8);
    g.rotateX(-Math.PI / 2);
    g.translate((b.minX + b.maxX) / 2, WATER_Y, (b.minZ + b.maxZ) / 2);
    return g;
  }, [layout]);
  useEffect(() => () => plane.dispose(), [plane]);

  const pathIndex = useMemo(() => new Map(layout.paths.map((p, i) => [p.id, i])), [layout]);
  // DEV: lets the screenshot scripts step time frame by frame.
  const dev = import.meta.env.DEV ? (window as unknown as { __liquid?: { t: number; freeze?: number } }) : null;
  useEffect(() => {
    needsStart.current = true;
  }, [layout]);

  // Renders the field, then the whole scene (a positive priority takes over the render loop,
  // so this runs after the camera has moved for this frame).
  useFrame((state) => {
    let t = state.clock.elapsedTime;
    if (dev) {
      dev.__liquid ??= { t };
      if (typeof dev.__liquid.freeze === "number") t = dev.__liquid.freeze;
      dev.__liquid.t = t;
    }
    shared.uTime.value = t;
    if (needsStart.current) {
      shared.uStart.value = t;
      needsStart.current = false;
    }
    const since = t - shared.uStart.value;
    lakeU.uFill.value = since < 0.4 ? 0 : Math.min(1, 1 - Math.exp(-(since - 0.4) * 3.2));
    const { hovered, selected } = useStore.getState();
    const focus = hovered ?? selected;
    shared.uFocus.value = focus != null ? (pathIndex.get(focus) ?? -1) : -1;

    const cam = state.camera as THREE.OrthographicCamera;
    cam.getWorldDirection(tmpDir);
    const sinElev = Math.max(0.2, -tmpDir.y);
    const wx = (cam.right - cam.left) / cam.zoom / field.width;
    const wz = (cam.top - cam.bottom) / cam.zoom / field.height / sinElev;
    shared.uPx.value = wx;
    const u = surface.uniforms;
    u.uView!.value.copy(tmpDir).negate();
    u.uTexel!.value.set(1 / field.width, 1 / field.height);
    u.uWorldTexel!.value.set(wx, wz);
    state.gl.getDrawingBufferSize(tmpSize);
    u.uBuffer!.value.copy(tmpSize);

    const r = state.gl;
    const prevTarget = r.getRenderTarget();
    r.getClearColor(tmpColor);
    const prevAlpha = r.getClearAlpha();
    r.setRenderTarget(field);
    r.setClearColor(0x000000, 0);
    r.clear(true, false, false);
    r.render(fieldScene, cam);
    r.setRenderTarget(prevTarget);
    r.setClearColor(tmpColor, prevAlpha);
    r.render(state.scene, cam);
  }, 1);

  return <mesh geometry={plane} material={surface} renderOrder={1} frustumCulled={false} />;
}
