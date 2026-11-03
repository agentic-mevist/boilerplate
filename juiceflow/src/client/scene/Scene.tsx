import { MapControls, PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useStore } from "../store";
import { Ground } from "./Ground";
import { Hub } from "./Hub";
import { LabelProjector } from "./KeyLabels";
import { KEY_H, Keys } from "./Keys";
import { computeLayout, type Layout } from "./layout";
import { Liquid } from "./Liquid";
import { OutputCards } from "./OutputCards";

/** A fixed top-down "flat lay" view, tilted ~10° so key-caps show a hint of thickness. You pan and zoom like a whiteboard; nothing rotates. */
const ELEVATION = 80 * (Math.PI / 180);
const CAM_DIST = 120;
const BASE_POS = new THREE.Vector3(0, Math.sin(ELEVATION) * CAM_DIST, Math.cos(ELEVATION) * CAM_DIST);
const RIGHT = new THREE.Vector3(1, 0, 0);
const UP = new THREE.Vector3().subVectors(new THREE.Vector3(), BASE_POS).normalize().cross(RIGHT).negate();

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

type Controls = { target: THREE.Vector3; update: () => void; minZoom: number; maxZoom: number };

/** Frames the layout, runs zoom/fit/focus commands from the HUD, and reports the zoom level. */
function CameraRig({ layout, rotation, insets }: { layout: Layout | null; rotation: number; insets: Insets }) {
  const { camera, size, controls } = useThree();
  const goal = useRef<{ zoom: number; target: THREE.Vector3; t0: number } | null>(null);
  const fitZoom = useRef(1);
  const first = useRef(true);
  const insetsRef = useRef(insets);
  insetsRef.current = insets;
  const view = useStore((s) => s.view);

  const computeFit = () => {
    const ins = insetsRef.current;
    const b = layout?.bounds ?? { minX: -8, maxX: 8, minZ: -6, maxZ: 6 };
    const rot = new THREE.Matrix4().makeRotationY(rotation);
    const probe = (camera as THREE.OrthographicCamera).clone();
    probe.position.copy(BASE_POS);
    probe.zoom = 1;
    probe.lookAt(0, 0, 0);
    probe.updateProjectionMatrix();
    probe.updateMatrixWorld();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const x of [b.minX, b.maxX])
      for (const z of [b.minZ, b.maxZ])
        for (const y of [0, 1]) {
          const v = new THREE.Vector3(x, y, z).applyMatrix4(rot).project(probe);
          const px = (v.x * size.width) / 2, py = (v.y * size.height) / 2;
          minX = Math.min(minX, px); maxX = Math.max(maxX, px);
          minY = Math.min(minY, py); maxY = Math.max(maxY, py);
        }
    const availW = Math.max(200, size.width - ins.left - ins.right);
    const availH = Math.max(200, size.height - ins.top - ins.bottom);
    const zoom = Math.min(availW / (maxX - minX), availH / (maxY - minY));
    const cx = ((minX + maxX) / 2) * zoom, cy = ((minY + maxY) / 2) * zoom;
    const ax = (ins.left - ins.right) / 2, ay = (ins.bottom - ins.top) / 2;
    const target = RIGHT.clone().multiplyScalar((cx - ax) / zoom).add(UP.clone().multiplyScalar((cy - ay) / zoom));
    fitZoom.current = zoom;
    const ctl = controls as unknown as Controls | null;
    if (ctl) {
      ctl.minZoom = zoom * 0.25;
      ctl.maxZoom = zoom * 12;
    }
    return { zoom, target, t0: performance.now() };
  };

  // The moment you touch the board (drag, wheel, pinch), any automatic camera move stops,
  // so it never fights your own zooming or panning.
  useEffect(() => {
    const ctl = controls as unknown as THREE.EventDispatcher<{ start: object }> | null;
    if (!ctl) return;
    const cancel = () => (goal.current = null);
    ctl.addEventListener("start", cancel);
    return () => ctl.removeEventListener("start", cancel);
  }, [controls]);

  // Re-frame when the data, layout or window changes (opening the side panel doesn't move the board).
  useEffect(() => {
    goal.current = computeFit();
    if (first.current) {
      (camera as THREE.OrthographicCamera).zoom = goal.current.zoom * 0.9;
      camera.updateProjectionMatrix();
      first.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, rotation, size.width, size.height, insets.top, insets.left, insets.bottom, controls]);

  // Commands from the zoom buttons, the keyboard and the source list.
  useEffect(() => {
    if (view.n === 0) return;
    const cam = camera as THREE.OrthographicCamera;
    const ctl = controls as unknown as Controls | null;
    const target = ctl?.target.clone() ?? new THREE.Vector3();
    if (view.kind === "fit") goal.current = computeFit();
    else if (view.kind === "zoom") {
      const from = goal.current?.zoom ?? cam.zoom;
      const z = THREE.MathUtils.clamp(from * (view.factor ?? 1), ctl?.minZoom ?? 0.01, ctl?.maxZoom ?? 1e4);
      goal.current = { zoom: z, target: goal.current?.target ?? target, t0: performance.now() };
    } else if (view.kind === "focus" && view.id && layout) {
      const k = layout.keys.find((key) => key.id === view.id);
      if (!k) return;
      const cos = Math.cos(rotation), sin = Math.sin(rotation);
      const world = new THREE.Vector3(k.x * cos + k.z * sin, KEY_H, -k.x * sin + k.z * cos);
      const v = world.clone().project(cam);
      const sx = (v.x * size.width) / 2, sy = (v.y * size.height) / 2;
      const ins = insetsRef.current;
      const ax = (ins.left - ins.right) / 2, ay = (ins.bottom - ins.top) / 2;
      const halfW = (size.width - ins.left - ins.right) / 2, halfH = (size.height - ins.top - ins.bottom) / 2;
      // Only pan when the key is near the edge of (or outside) the free area.
      if (Math.abs(sx - ax) < halfW * 0.7 && Math.abs(sy - ay) < halfH * 0.7) return;
      const shift = RIGHT.clone().multiplyScalar((sx - ax) / cam.zoom).add(UP.clone().multiplyScalar((sy - ay) / cam.zoom));
      goal.current = { zoom: cam.zoom, target: target.add(shift), t0: performance.now() };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.n]);

  useFrame((_, dt) => {
    const cam = camera as THREE.OrthographicCamera;
    useStore.getState().setZoomPct(Math.round((cam.zoom / fitZoom.current) * 100));
    const g = goal.current;
    if (!g) return;
    if (performance.now() - g.t0 > 1800) {
      goal.current = null; // never keep steering for long
      return;
    }
    const k = 1 - Math.exp(-dt * 7);
    const ctl = controls as unknown as Controls | null;
    const cur = ctl?.target ?? new THREE.Vector3();
    const dz = g.zoom - cam.zoom;
    const dTarget = g.target.clone().sub(cur);
    if (Math.abs(dz) < g.zoom * 1e-3 && dTarget.lengthSq() < 1e-6) {
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
  const revealKey = useStore((s) => s.revealKey);
  const domain = useStore((s) => s.payload?.target ?? s.domain);
  const select = useStore((s) => s.select);

  // Lost links live in the side panel; the board only shows juice that actually flows.
  const layout = useMemo(() => (result ? computeLayout(result, mode, false) : null), [result, mode]);
  // Remount the animated layers when a new analysis or layout arrives so the "pour" replays.
  const sceneKey = `${revealKey}:${mode}`;
  // No diagonal: the fan sits left of your site and the result cards line up to the right.
  const rotation = 0;
  const groundR = mode === "funnel" ? 30 : 26;
  // Sharpest on retina screens; steps down if a device can't keep the juice smooth.
  const [maxDpr, setMaxDpr] = useState(2);

  return (
    <Canvas
      orthographic
      dpr={[1, maxDpr]}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.NeutralToneMapping, powerPreference: "high-performance" }}
      camera={{ position: BASE_POS.toArray() as [number, number, number], zoom: 12, near: 1, far: 600 }}
      onPointerMissed={(e) => e.type === "click" && select(null)}
      style={{ position: "absolute", inset: 0 }}
    >
      <PerformanceMonitor flipflops={3} onDecline={() => setMaxDpr(1.25)} onIncline={() => setMaxDpr(2)} onFallback={() => setMaxDpr(1)} />
      <Lights />
      <MapControls makeDefault enableRotate={false} enableDamping dampingFactor={0.14} zoomToCursor screenSpacePanning zoomSpeed={1.1} />
      <CameraRig layout={layout} rotation={rotation} insets={insets} />
      <group rotation-y={rotation}>
        <Ground radius={groundR} />
        {layout && result && (
          <group key={sceneKey}>
            <Liquid layout={layout} fadeR={groundR} />
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
