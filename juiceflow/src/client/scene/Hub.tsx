import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { singleIcon } from "./atlas";
import { HUB_RADIUS } from "./layout";

const PUCK_H = 0.5;

/** A round puck with a softly rounded top edge. */
function puckGeometry(radius: number, height: number, bevel: number) {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, 0), new THREE.Vector2(radius, 0)];
  pts.push(new THREE.Vector2(radius, height - bevel));
  for (let i = 1; i <= 10; i++) {
    const a = (i / 10) * (Math.PI / 2);
    pts.push(new THREE.Vector2(radius - bevel + Math.cos(a) * bevel, height - bevel + Math.sin(a) * bevel));
  }
  pts.push(new THREE.Vector2(0, height));
  return new THREE.LatheGeometry(pts, 128);
}

/** Your site: a plain white circle with its favicon, sitting in the pool the streams pour into. */
export function Hub({ domain, revealKey }: { domain: string; revealKey: number }) {
  const geo = useMemo(() => puckGeometry(HUB_RADIUS, PUCK_H, 0.2), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.55, emissive: "#ffffff", emissiveIntensity: 0.12 }), []);
  const icon = useMemo(() => singleIcon(domain), [domain]);
  const iconMat = useMemo(() => new THREE.MeshBasicMaterial({ map: icon, transparent: true, toneMapped: false, depthWrite: false }), [icon]);
  useEffect(() => () => icon.dispose(), [icon]);
  useEffect(() => () => iconMat.dispose(), [iconMat]);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  // A small spring as it appears, then it sits still.
  const g = useRef<THREE.Group>(null);
  const t0 = useRef<number | null>(null);
  useEffect(() => {
    t0.current = null;
  }, [revealKey]);
  useFrame(({ clock }) => {
    if (t0.current == null) t0.current = clock.elapsedTime;
    const t = clock.elapsedTime - t0.current;
    const k = t >= 1.6 ? 1 : 1 - Math.exp(-t * 7) * Math.cos(t * 9);
    const s = 0.6 + 0.4 * k;
    g.current?.scale.set(s, 1, s);
  });

  return (
    <group ref={g}>
      <mesh geometry={geo} material={mat} />
      <mesh rotation-x={-Math.PI / 2} position={[0, PUCK_H + 0.004, 0]} renderOrder={7} material={iconMat}>
        <planeGeometry args={[HUB_RADIUS * 0.74, HUB_RADIUS * 0.74]} />
      </mesh>
    </group>
  );
}
