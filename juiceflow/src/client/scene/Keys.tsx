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

function keyColor(kind: string, health: string, fade: number): THREE.Color {
  const c = new THREE.Color(health === "toxic" ? C.keyToxic : kind === "lost" ? C.keyLost : C.keyTop);
  return c.lerp(bg, fade * 0.9);
}

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
  const shadowMat = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: shadowVertex, fragmentShader: shadowFragment, transparent: true, depthWrite: false }),
    [],
  );

  // Per-key animation state: vertical offset, velocity, appearance time.
  const anim = useRef({ y: new Float32Array(0), v: new Float32Array(0), start: -1 });

  const attrs = useMemo(() => {
    const atlas = getAtlas();
    const rect = new Float32Array(n * 4);
    const iconAlpha = new Float32Array(n);
    const shadowAlpha = new Float32Array(n);
    layout.keys.forEach((k, i) => {
      const r = atlas.rect(k.source.link.domain);
      rect.set([r.u, r.v, r.du, r.dv], i * 4);
      iconAlpha[i] = (1 - k.fade) * (k.kind === "lost" ? 0.45 : k.source.health === "toxic" ? 0.7 : 1);
      shadowAlpha[i] = (1 - k.fade) * 0.5;
    });
    return { rect, iconAlpha, shadowAlpha };
  }, [layout, n]);

  useEffect(() => {
    const b = body.current, ic = icons.current, sh = shadows.current;
    if (!b || !ic || !sh) return;
    layout.keys.forEach((k, i) => b.setColorAt(i, keyColor(k.kind, k.source.health, k.fade)));
    if (b.instanceColor) b.instanceColor.needsUpdate = true;
    ic.geometry.setAttribute("aRect", new THREE.InstancedBufferAttribute(attrs.rect, 4));
    ic.geometry.setAttribute("aAlpha", new THREE.InstancedBufferAttribute(attrs.iconAlpha, 1));
    sh.geometry.setAttribute("aAlpha", new THREE.InstancedBufferAttribute(new Float32Array(n), 1));
    anim.current = { y: new Float32Array(n).fill(9), v: new Float32Array(n), start: -1 };
  }, [layout, attrs, n]);

  useFrame(({ clock }, dt) => {
    const b = body.current, ic = icons.current, sh = shadows.current;
    if (!b || !ic || !sh) return;
    const a = anim.current;
    if (a.y.length !== n) return;
    const t = clock.elapsedTime;
    if (a.start < 0) a.start = t;
    const { hovered, selected } = useStore.getState();
    const step = Math.min(dt, 1 / 30);
    const shadowAttr = sh.geometry.getAttribute("aAlpha") as THREE.InstancedBufferAttribute | undefined;
    layout.keys.forEach((k, i) => {
      const p = layout.paths[k.path];
      const appear = a.start + (p ? p.delay * 0.55 : 0) + (k.kind === "tail" ? 0.3 : 0);
      const visible = t >= appear;
      let target = 0;
      if (k.id === selected) target = -0.17;
      else if (k.id === hovered) target = -0.11;
      if (visible) {
        // critically-damped-ish spring with a little bounce
        const acc = (target - a.y[i]!) * 210 - a.v[i]! * 17;
        a.v[i]! += acc * step;
        a.y[i]! += a.v[i]! * step;
      }
      const s = visible ? 1 : 0.0001;
      const y = visible ? a.y[i]! : 9;
      const size = k.size;
      tmpQ.setFromAxisAngle(up, k.rot);
      tmpP.set(k.x, KEY_H / 2 + y, k.z);
      tmpS.set(size * s, s, size * s);
      tmpM.compose(tmpP, tmpQ, tmpS);
      b.setMatrixAt(i, tmpM);

      tmpP.set(k.x, KEY_H + y + 0.003, k.z);
      const iconQ = tmpQ.clone().multiply(flat);
      const isz = size * 0.58 * s;
      tmpS.set(isz, isz, isz);
      tmpM.compose(tmpP, iconQ, tmpS);
      ic.setMatrixAt(i, tmpM);

      const lift = Math.max(0, y);
      // A falling key casts a fainter, slightly larger shadow that sharpens as it lands.
      if (shadowAttr) shadowAttr.setX(i, visible ? attrs.shadowAlpha[i]! * Math.max(0, 1 - lift / 3.5) : 0);
      const ss = size * (1.75 + Math.min(lift, 3.5) * 0.12) * s;
      tmpP.set(k.x + 0.12, 0.03, k.z + 0.16);
      tmpS.set(ss, ss, ss);
      tmpM.compose(tmpP, tmpQ.clone().multiply(flat), tmpS);
      sh.setMatrixAt(i, tmpM);
    });
    b.instanceMatrix.needsUpdate = true;
    ic.instanceMatrix.needsUpdate = true;
    sh.instanceMatrix.needsUpdate = true;
    if (shadowAttr) shadowAttr.needsUpdate = true;
  });

  const idAt = (e: ThreeEvent<PointerEvent | MouseEvent>) => (e.instanceId != null ? layout.keys[e.instanceId]?.id ?? null : null);

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
