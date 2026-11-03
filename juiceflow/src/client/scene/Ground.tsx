import { useMemo } from "react";
import * as THREE from "three";
import { C, hexToRgb } from "../theme";
import { gridFragment, gridVertex } from "./shaders";

/** A faint dot grid that fades out toward the edges, like a design canvas. */
export function Ground({ radius = 34 }: { radius?: number }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: gridVertex,
        fragmentShader: gridFragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uColor: { value: new THREE.Vector3(...hexToRgb(C.grid)) },
          uSpacing: { value: 1.2 },
          uRadius: { value: 0.05 },
          uFadeR: { value: radius },
        },
      }),
    [radius],
  );
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} renderOrder={-1} material={mat}>
      <planeGeometry args={[radius * 2.4, radius * 2.4]} />
    </mesh>
  );
}
