import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { C, hexToRgb } from "../theme";
import { singleIcon } from "./atlas";
import { HUB_RADIUS } from "./layout";
import { ringFragment, ringVertex } from "./shaders";

const PUCK_H = 0.62;

function puckGeometry(radius: number, height: number, bevel: number) {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0), new THREE.Vector2(radius - 0.06, 0), new THREE.Vector2(radius, 0.06)];
  pts.push(new THREE.Vector2(radius, height - bevel));
  for (let i = 1; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2);
    pts.push(new THREE.Vector2(radius - bevel + Math.cos(a) * bevel, height - bevel + Math.sin(a) * bevel));
  }
  pts.push(new THREE.Vector2(0, height));
  return new THREE.LatheGeometry(pts, 96);
}

/** Your site: a thick white puck with a score ring, like a dial that fills with juice. */
export function Hub({ domain, score, revealKey }: { domain: string | null; score: number; revealKey: number }) {
  const outer = useMemo(() => puckGeometry(HUB_RADIUS, PUCK_H, 0.22), []);
  const inner = useMemo(() => puckGeometry(HUB_RADIUS * 0.74, 0.07, 0.05), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.5 }), []);
  const ringMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ringVertex,
        fragmentShader: ringFragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uScore: { value: 0 },
          uColor: { value: new THREE.Vector3(...hexToRgb(C.juice)) },
          uTrack: { value: new THREE.Vector3(...hexToRgb(C.juice)) },
          uInner: { value: HUB_RADIUS * 0.8 },
          uOuter: { value: HUB_RADIUS * 0.86 },
        },
      }),
    [],
  );
  const ringGeo = useMemo(() => new THREE.RingGeometry(HUB_RADIUS * 0.78, HUB_RADIUS * 0.88, 128, 1), []);
  const icon = useMemo(() => (domain ? singleIcon(domain) : null), [domain]);
  const iconMat = useMemo(() => new THREE.MeshBasicMaterial({ map: icon, transparent: true, toneMapped: false }), [icon]);
  useEffect(() => () => icon?.dispose(), [icon]);

  const shown = useRef(0);
  const startedAt = useRef<number | null>(null);
  useEffect(() => {
    startedAt.current = null;
    shown.current = 0;
  }, [revealKey]);

  const pulse = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (startedAt.current == null) startedAt.current = t;
    const target = Math.max(0, Math.min(1, score / 100));
    const since = t - startedAt.current;
    // fill the ring after the first streams arrive
    const k = since < 1.2 ? 0 : 1 - Math.exp(-(since - 1.2) * 1.6);
    shown.current = target * k;
    ringMat.uniforms.uTime!.value = t;
    ringMat.uniforms.uScore!.value = shown.current;
    if (pulse.current) {
      const s = 1 + 0.008 * Math.sin(t * 2.2);
      pulse.current.scale.set(s, 1, s);
    }
  });

  return (
    <group>
      {/* soft shadow under the puck */}
      <mesh rotation-x={-Math.PI / 2} position={[0.25, 0.03, 0.35]} renderOrder={4}>
        <circleGeometry args={[HUB_RADIUS * 1.25, 64]} />
        <meshBasicMaterial color="#4a3f30" transparent opacity={0.09} depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0.12, 0.031, 0.18]} renderOrder={4}>
        <circleGeometry args={[HUB_RADIUS * 1.08, 64]} />
        <meshBasicMaterial color="#4a3f30" transparent opacity={0.08} depthWrite={false} />
      </mesh>
      <mesh ref={pulse} geometry={outer} material={mat} />
      <mesh geometry={inner} material={mat} position={[0, PUCK_H, 0]} />
      <mesh geometry={ringGeo} material={ringMat} rotation-x={-Math.PI / 2} position={[0, PUCK_H + 0.075, 0]} renderOrder={6} />
      {icon && (
        <mesh rotation-x={-Math.PI / 2} position={[0, PUCK_H + 0.08, 0]} renderOrder={7} material={iconMat}>
          <planeGeometry args={[HUB_RADIUS * 0.72, HUB_RADIUS * 0.72]} />
        </mesh>
      )}
    </group>
  );
}
