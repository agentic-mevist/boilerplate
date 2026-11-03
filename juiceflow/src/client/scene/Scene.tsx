import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore } from "../store";
import { Ground } from "./Ground";
import { Hub } from "./Hub";
import { LabelProjector } from "./KeyLabels";
import { Keys } from "./Keys";
import { computeLayout, type Layout } from "./layout";
import { OutputCards } from "./OutputCards";
import { Streams } from "./Streams";

const ELEVATION = 34 * (Math.PI / 180);
const CAM_DIST = 120;
const BASE_POS = new THREE.Vector3(0, Math.sin(ELEVATION) * CAM_DIST, Math.cos(ELEVATION) * CAM_DIST);

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Frames the layout inside the part of the screen the HUD leaves free, and eases there. */
function CameraRig({ layout, rotation, insets }: { layout: Layout | null; rotation: number; insets: Insets }) {
  const { camera, size, controls } = useThree();
  const goal = useRef<{ zoom: number; target: THREE.Vector3 } | null>(null);
  const settled = useRef(false);

  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    const b = layout?.bounds ?? { minX: -8, maxX: 8, minZ: -6, maxZ: 6 };
    const rot = new THREE.Matrix4().makeRotationY(rotation);
    const pts: THREE.Vector3[] = [];
    for (const x of [b.minX, b.maxX]) for (const z of [b.minZ, b.maxZ]) for (const y of [0, 1]) pts.push(new THREE.Vector3(x, y, z).applyMatrix4(rot));
    // Measure at zoom 1 from the base pose.
    const probe = cam.clone();
    probe.position.copy(BASE_POS);
    probe.zoom = 1;
    probe.lookAt(0, 0, 0);
    probe.updateProjectionMatrix();
    probe.updateMatrixWorld();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
      const v = p.clone().project(probe);
      const x = (v.x * size.width) / 2, y = (v.y * size.height) / 2;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    const availW = Math.max(200, size.width - insets.left - insets.right);
    const availH = Math.max(200, size.height - insets.top - insets.bottom);
    const zoom = Math.min(availW / (maxX - minX), availH / (maxY - minY));
    const cx = ((minX + maxX) / 2) * zoom, cy = ((minY + maxY) / 2) * zoom;
    const ax = (insets.left - insets.right) / 2, ay = (insets.bottom - insets.top) / 2;
    const right = new THREE.Vector3(1, 0, 0);
    const up = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), BASE_POS).normalize().cross(right).negate();
    const target = right.multiplyScalar((cx - ax) / zoom).add(up.multiplyScalar((cy - ay) / zoom));
    goal.current = { zoom, target };
    if (!settled.current) {
      cam.zoom = zoom * 0.92;
      settled.current = true;
    }
  }, [layout, rotation, size.width, size.height, insets.top, insets.right, insets.bottom, insets.left, camera]);

  useFrame((_, dt) => {
    const g = goal.current;
    if (!g) return;
    const cam = camera as THREE.OrthographicCamera;
    const k = 1 - Math.exp(-dt * 3.2);
    const ctl = controls as unknown as { target: THREE.Vector3; update: () => void } | null;
    const cur = ctl?.target ?? new THREE.Vector3();
    const dz = g.zoom - cam.zoom;
    const dTarget = g.target.clone().sub(cur);
    if (Math.abs(dz) < 1e-3 && dTarget.lengthSq() < 1e-6) {
      goal.current = null;
      return;
    }
    cam.zoom += dz * k;
    cam.updateProjectionMatrix();
    const move = dTarget.multiplyScalar(k);
    cam.position.add(move);
    if (ctl) {
      ctl.target.add(move);
      ctl.update();
    }
  });
  return null;
}

function Lights() {
  return (
    <>
      <hemisphereLight args={["#ffffff", "#e6dfd3", 1.55]} />
      <directionalLight position={[-14, 22, 12]} intensity={1.7} />
      <directionalLight position={[16, 10, -8]} intensity={0.35} />
    </>
  );
}

export function Scene({ insets }: { insets: Insets }) {
  const result = useStore((s) => s.result);
  const mode = useStore((s) => s.mode);
  const showLost = useStore((s) => s.showLost);
  const revealKey = useStore((s) => s.revealKey);
  const domain = useStore((s) => s.payload?.target ?? s.domain);
  const select = useStore((s) => s.select);

  const layout = useMemo(() => (result ? computeLayout(result, mode, showLost) : null), [result, mode, showLost]);
  // Remount the animated layers when a new analysis or layout arrives so the "pour" replays.
  const sceneKey = `${revealKey}:${mode}:${showLost}`;
  const rotation = mode === "funnel" ? 26 * (Math.PI / 180) : 0;

  return (
    <Canvas
      orthographic
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.NeutralToneMapping, powerPreference: "high-performance" }}
      camera={{ position: BASE_POS.toArray() as [number, number, number], zoom: 12, near: 1, far: 600 }}
      onPointerMissed={() => select(null)}
      style={{ position: "absolute", inset: 0 }}
    >
      <Lights />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minPolarAngle={0.32}
        maxPolarAngle={1.18}
        minAzimuthAngle={-0.7}
        maxAzimuthAngle={0.7}
        minZoom={4}
        maxZoom={120}
        zoomSpeed={0.8}
        screenSpacePanning
      />
      <CameraRig layout={layout} rotation={rotation} insets={insets} />
      <group rotation-y={rotation}>
        <Ground radius={mode === "funnel" ? 30 : 26} />
        {layout && result && (
          <group key={sceneKey}>
            <Streams layout={layout} />
            <Keys layout={layout} />
            <LabelProjector layout={layout} rotation={rotation} revealKey={revealKey} />
            {layout.mode === "funnel" && <OutputCards result={result} slots={layout.outputs} revealKey={revealKey} />}
          </group>
        )}
        <Hub domain={domain} score={result?.score ?? 0} revealKey={revealKey} />
      </group>
    </Canvas>
  );
}
