import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore } from "../store";
import { hexToRgb } from "../theme";
import type { Layout } from "./layout";

const MAX = 40;

const vertex = /* glsl */ `
attribute vec2 aStart;
attribute vec2 aDir;
attribute float aLen;
attribute float aSeed;
uniform float uTime;
uniform float uGrow;
varying float vT;
varying float vSeed;
varying float vLen;
void main() {
  vT = position.x;
  vSeed = aSeed;
  vLen = aLen;
  float len = aLen * uGrow;
  vec2 n = vec2(-aDir.y, aDir.x);
  vec2 p = aStart + aDir * position.x * len + n * position.y * 0.05;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p.x, 0.5, p.y, 1.0);
}
`;

const fragment = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
varying float vT;
varying float vSeed;
varying float vLen;
void main() {
  // dashes marching away from the source page, toward the other sites it links to
  float d = fract(vT * vLen * 1.6 - uTime * 0.9 - vSeed);
  float dash = smoothstep(0.0, 0.06, d) * (1.0 - smoothstep(0.62, 0.68, d));
  float a = dash * (1.0 - 0.55 * smoothstep(0.3, 1.0, vT)) * smoothstep(0.0, 0.08, vT) * 0.8;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}
`;

/**
 * When a source is focused, its page's *other* outgoing links fan out as grey
 * dashed lines. Only the orange stream comes to you, which makes the
 * "1 / outgoing links" dilution visible.
 */
export function SplitFan({ layout }: { layout: Layout }) {
  const geo = useMemo(() => {
    const base = new THREE.BufferGeometry();
    base.setAttribute("position", new THREE.Float32BufferAttribute([0, -0.5, 0, 1, -0.5, 0, 1, 0.5, 0, 0, 0.5, 0], 3));
    base.setIndex([0, 1, 2, 0, 2, 3]);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute("position", base.getAttribute("position"));
    g.setAttribute("aStart", new THREE.InstancedBufferAttribute(new Float32Array(MAX * 2), 2));
    g.setAttribute("aDir", new THREE.InstancedBufferAttribute(new Float32Array(MAX * 2), 2));
    g.setAttribute("aLen", new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1));
    g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1));
    g.instanceCount = 0;
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        uniforms: { uTime: { value: 0 }, uGrow: { value: 0 }, uColor: { value: new THREE.Vector3(...hexToRgb("#a59d91")) } },
      }),
    [],
  );
  const dots = useRef<THREE.InstancedMesh>(null);
  const dotGeo = useMemo(() => new THREE.CircleGeometry(0.12, 20).rotateX(-Math.PI / 2), []);
  const dotMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#b7aea1", transparent: true, opacity: 0, depthWrite: false, depthTest: false }), []);
  const current = useRef<string | null>(null);
  const grow = useRef(0);
  const m = useMemo(() => new THREE.Matrix4(), []);

  useFrame(({ clock }, dt) => {
    const { hovered, selected } = useStore.getState();
    const focus = hovered ?? selected;
    const key = focus ? layout.keys.find((k) => k.id === focus) : undefined;
    const id = key && key.kind !== "lost" ? key.id : null;
    if (id !== current.current) {
      current.current = id;
      grow.current = 0;
      if (key && id) {
        const f = key.source.factors;
        const others = f.dilutionEstimated ? 0 : Math.max(0, Math.min(MAX, f.outgoing - 1));
        const start = geo.getAttribute("aStart") as THREE.InstancedBufferAttribute;
        const dir = geo.getAttribute("aDir") as THREE.InstancedBufferAttribute;
        const len = geo.getAttribute("aLen") as THREE.InstancedBufferAttribute;
        const seed = geo.getAttribute("aSeed") as THREE.InstancedBufferAttribute;
        const away = Math.atan2(key.z, key.x); // direction from the hub to the key
        const spread = Math.min(Math.PI * 0.95, 0.5 + others * 0.09);
        for (let i = 0; i < others; i++) {
          const t = others === 1 ? 0.5 : i / (others - 1);
          const a = away + (t - 0.5) * spread + Math.sin(i * 7.31) * 0.03;
          const l = 2.6 + 1.8 * Math.abs(Math.sin(i * 3.7 + 1.3));
          const dx = Math.cos(a), dz = Math.sin(a);
          start.setXY(i, key.x + dx * key.size * 0.55, key.z + dz * key.size * 0.55);
          dir.setXY(i, dx, dz);
          len.setX(i, l);
          seed.setX(i, (i * 0.618) % 1);
          if (dots.current) {
            m.makeTranslation(key.x + dx * (key.size * 0.55 + l), 0.5, key.z + dz * (key.size * 0.55 + l));
            dots.current.setMatrixAt(i, m);
          }
        }
        start.needsUpdate = dir.needsUpdate = len.needsUpdate = seed.needsUpdate = true;
        geo.instanceCount = others;
        if (dots.current) {
          dots.current.count = others;
          dots.current.instanceMatrix.needsUpdate = true;
        }
      } else {
        geo.instanceCount = 0;
        if (dots.current) dots.current.count = 0;
      }
    }
    grow.current = Math.min(1, grow.current + dt * 2.6);
    const e = 1 - Math.pow(1 - grow.current, 3);
    mat.uniforms.uTime!.value = clock.elapsedTime;
    mat.uniforms.uGrow!.value = e;
    dotMat.opacity = 0.9 * e;
  });

  return (
    <group>
      <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={9} />
      <instancedMesh ref={dots} args={[dotGeo, dotMat, MAX]} frustumCulled={false} renderOrder={9} />
    </group>
  );
}
