import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { useStore } from "../store";
import { C } from "../theme";
import { getAtlas } from "./atlas";
import type { Layout } from "./layout";
import { iconFragment, iconVertex, shadowFragment, shadowVertex } from "./shaders";

export const KEY_H = 0.46;

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpP = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
const bg = new THREE.Color(C.bg);

/**
 * Every linking site is a white key-cap with its favicon. Keys pop in with a
 * little spring, press down on hover, and are always clickable.
 */
export function Keys({ layout }: { layout: Layout }) {
  const n = layout.keys.length;
  const body = useRef<THREE.InstancedMesh>(null);
  const icons = useRef<THREE.InstancedMesh>(null);
  const shadows = useRef<THREE.InstancedMesh>(null);
  const hover = useStore((s) => s.hover);
  const select = useStore((s) => s.select);

  const geo = useMemo(() => new RoundedBoxGeometry(1, KEY_H, 1, 3, 0.15), []);
  const iconGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const shadowGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.62, metalness: 0 }), []);
  const iconMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: iconVertex,
        fragmentShader: iconFragment,
        uniforms: { uAtlas: { value: getAtlas().texture } },
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  const shadowMat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: shadowVertex, fragmentShader: shadowFragment, transparent: true, depthWrite: false }), []);

  // Per-key spring state: scale (pop-in) and press depth.
  const anim = useRef({ s: new Float32Array(0), sv: new Float32Array(0), p: new Float32Array(0), pv: new Float32Array(0), start: -1 });

  const attrs = useMemo(() => {
    const atlas = getAtlas();
    const rect = new Float32Array(n * 4);
    const iconAlpha = new Float32Array(n);
    const shadowAlpha = new Float32Array(n);
    layout.keys.forEach((k, i) => {
      const r = atlas.rect(k.source.link.domain);
      rect.set([r.u, r.v, r.du, r.dv], i * 4);
      iconAlpha[i] = 1 - k.fade;
      shadowAlpha[i] = (1 - k.fade) * 0.45;
    });
    return { rect, iconAlpha, shadowAlpha };
  }, [layout, n]);

  useEffect(() => {
    const b = body.current, ic = icons.current, sh = shadows.current;
    if (!b || !ic || !sh) return;
    layout.keys.forEach((k, i) => b.setColorAt(i, new THREE.Color(C.keyTop).lerp(bg, k.fade * 0.85)));
    if (b.instanceColor) b.instanceColor.needsUpdate = true;
    ic.geometry.setAttribute("aRect", new THREE.InstancedBufferAttribute(attrs.rect, 4));
    ic.geometry.setAttribute("aAlpha", new THREE.InstancedBufferAttribute(attrs.iconAlpha, 1));
    sh.geometry.setAttribute("aAlpha", new THREE.InstancedBufferAttribute(attrs.shadowAlpha.slice(), 1));
    anim.current = { s: new Float32Array(n), sv: new Float32Array(n), p: new Float32Array(n), pv: new Float32Array(n), start: -1 };
  }, [layout, attrs, n]);

  useFrame(({ clock }, dt) => {
    const b = body.current, ic = icons.current, sh = shadows.current;
    if (!b || !ic || !sh) return;
    const a = anim.current;
    if (a.s.length !== n) return;
    const t = clock.elapsedTime;
    if (a.start < 0) a.start = t;
    const { hovered, selected } = useStore.getState();
    const step = Math.min(dt, 1 / 30);
    layout.keys.forEach((k, i) => {
      const p = layout.paths[k.path];
      const appear = a.start + (p ? p.delay * 0.55 : 0.9) + (k.kind === "tail" ? 0.25 : 0);
      const sTarget = t >= appear ? 1 : 0;
      // springs: pop in with a little overshoot, press down when hovered or selected
      a.sv[i]! += ((sTarget - a.s[i]!) * 260 - a.sv[i]! * 18) * step;
      a.s[i]! += a.sv[i]! * step;
      const pTarget = k.id === selected ? 1 : k.id === hovered ? 0.65 : 0;
      a.pv[i]! += ((pTarget - a.p[i]!) * 320 - a.pv[i]! * 26) * step;
      a.p[i]! += a.pv[i]! * step;

      const s = Math.max(0.0001, a.s[i]!) * (1 - 0.07 * a.p[i]!);
      const y = -0.14 * a.p[i]!;
      const size = k.size * s;
      tmpQ.setFromAxisAngle(up, k.rot);
      tmpP.set(k.x, (KEY_H / 2) * s + y, k.z);
      tmpS.set(size, Math.max(0.0001, s), size);
      tmpM.compose(tmpP, tmpQ, tmpS);
      b.setMatrixAt(i, tmpM);

      tmpP.set(k.x, KEY_H * s + y + 0.003, k.z);
      const isz = size * 0.58;
      tmpS.set(isz, isz, isz);
      tmpM.compose(tmpP, tmpQ.clone().multiply(flat), tmpS);
      ic.setMatrixAt(i, tmpM);

      const ss = size * (1.75 - 0.15 * a.p[i]!);
      tmpP.set(k.x + 0.1, 0.03, k.z + 0.13);
      tmpS.set(ss, ss, ss);
      tmpM.compose(tmpP, tmpQ.clone().multiply(flat), tmpS);
      sh.setMatrixAt(i, tmpM);
    });
    b.instanceMatrix.needsUpdate = true;
    ic.instanceMatrix.needsUpdate = true;
    sh.instanceMatrix.needsUpdate = true;
    // Three.js caches an instanced mesh's bounding sphere for raycasting; keys move, so refresh it
    // every frame. Otherwise clicks start missing keys after the camera pans or zooms.
    b.computeBoundingSphere();
  });

  const idAt = (e: ThreeEvent<PointerEvent | MouseEvent>) => (e.instanceId != null ? (layout.keys[e.instanceId]?.id ?? null) : null);

  return (
    <group>
      <instancedMesh ref={shadows} args={[shadowGeo, shadowMat, n]} renderOrder={4} frustumCulled={false} />
      <instancedMesh
        ref={body}
        args={[geo, bodyMat, n]}
        frustumCulled={false}
        onPointerMove={(e) => {
          e.stopPropagation();
          const id = idAt(e);
          hover(id);
          document.body.style.cursor = id ? "pointer" : "";
        }}
        onPointerOut={() => {
          hover(null);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          const id = idAt(e);
          if (id) select(useStore.getState().selected === id ? null : id);
        }}
      />
      <instancedMesh ref={icons} args={[iconGeo, iconMat, n]} renderOrder={5} frustumCulled={false} />
    </group>
  );
}
