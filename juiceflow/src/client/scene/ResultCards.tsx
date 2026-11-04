import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useId, useState } from "react";
import * as THREE from "three";
import type { JuiceResult } from "../../shared/model";
import { pct } from "../format";
import { GLASS_OUTLINE } from "../juices";
import { useStore } from "../store";
import type { Layout } from "./layout";

/**
 * The result cards to the right of your site. They're plain HTML (crisp text at any zoom) pinned to
 * a spot on the board: they move with it and grow or shrink with the zoom, within limits, so they
 * always stay readable. At the "fit" zoom they're at their natural size, and the camera makes room
 * for them when it frames the board (see CameraRig in Scene.tsx).
 */

/** One card's natural size in CSS pixels (the camera's fit uses these; styles.css matches them). */
export const CARD_W = 248;
export const CARD_H = 170;
const CARD_GAP = 12;
/** Below this viewport width the cards are hidden (the summary shows the score), as on mobile. */
export const CARDS_MIN_VIEWPORT = 760;

export type CardsArrangement = "row" | "column";
export const cardsBox = (a: CardsArrangement) =>
  a === "row" ? { w: CARD_W * 2 + CARD_GAP, h: CARD_H } : { w: CARD_W, h: CARD_H * 2 + CARD_GAP };

/** Written by the camera rig when it frames the board, read by the pin every frame. */
export const cardsFrame: { fitZoom: number; arrangement: CardsArrangement } = { fitZoom: 1, arrangement: "row" };

/** How far the cards follow the zoom, relative to their natural size. */
const MIN_SCALE = 0.78;
const MAX_SCALE = 1.5;
/** When the cards appear: once the juice has reached your site. */
const REVEAL_MS = 2300;

const pinned: { el: HTMLDivElement | null } = { el: null };
const tmp = new THREE.Vector3();

/** Lives inside the Canvas: keeps the cards pinned to their spot on the board. */
export function ResultCardsPin({ layout }: { layout: Layout }) {
  const { camera, size } = useThree();
  useFrame(() => {
    const el = pinned.el;
    const slot = layout.outputs[0];
    if (!el || !slot) return;
    tmp.set(slot.x, 0, slot.z).project(camera);
    // whole device pixels keep the text sharp
    const dpr = window.devicePixelRatio || 1;
    const sx = Math.round(((tmp.x + 1) / 2) * size.width * dpr) / dpr;
    const sy = Math.round(((1 - tmp.y) / 2) * size.height * dpr) / dpr;
    const s = THREE.MathUtils.clamp((camera as THREE.OrthographicCamera).zoom / cardsFrame.fitZoom, MIN_SCALE, MAX_SCALE);
    el.style.transform = `translate(${sx}px, ${sy}px) scale(${s.toFixed(3)}) translateY(-50%)`;
    const column = cardsFrame.arrangement === "column";
    if (el.classList.contains("results--column") !== column) el.classList.toggle("results--column", column);
    if (el.style.visibility !== "visible") el.style.visibility = "visible";
  });
  useEffect(
    () => () => {
      if (pinned.el) pinned.el.style.visibility = "hidden";
    },
    [],
  );
  return null;
}

const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A number that counts up from zero after a delay. */
function useCountUp(target: number, delayMs: number, durationMs: number) {
  const [v, setV] = useState(() => (reducedMotion() ? target : 0));
  useEffect(() => {
    if (reducedMotion()) {
      setV(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now() + delayMs;
    const tick = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - t0) / durationMs));
      setV(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    setV(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, delayMs, durationMs]);
  return v;
}

/** A value that switches from `from` to `to` after a delay (CSS transitions do the rest). */
function useLater<T>(from: T, to: T, delayMs: number): T {
  const [v, setV] = useState(from);
  useEffect(() => {
    setV(from);
    const t = setTimeout(() => setV(to), delayMs);
    return () => clearTimeout(t);
  }, [from, to, delayMs]);
  return v;
}

/** How juicy a score feels, from a few drops to overflowing, and the next step up. */
const MOODS: [number, string][] = [
  [0, "A few drops"],
  [10, "A trickle"],
  [25, "Flowing"],
  [45, "Juicy"],
  [65, "Gushing"],
  [85, "Overflowing"],
];
function moodOf(score: number) {
  let i = 0;
  while (i + 1 < MOODS.length && score >= MOODS[i + 1]![0]) i++;
  const next = MOODS[i + 1];
  return { name: MOODS[i]![1], next: next ? { at: next[0], name: next[1] } : null };
}

/** The logo's bubble glass, filled to the score with a gently moving surface. */
function ScoreGlass({ level }: { level: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  // the inside of the glass runs from y = 29.6 (bottom) up to just under the rim at y = 11
  const y = 29.6 - 18.4 * Math.min(1, Math.max(0, level));
  return (
    <svg className="sglass" viewBox="0 0 32 32" aria-hidden>
      <defs>
        <clipPath id={`c${id}`}>
          <path d={GLASS_OUTLINE} />
        </clipPath>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0" className="sglass__top" />
          <stop offset="1" className="sglass__deep" />
        </linearGradient>
      </defs>
      <path d="M17.2 22.5 24.6 2.8" stroke="#1d1c1a" strokeWidth="2.7" strokeLinecap="round" />
      <path d="M17.2 22.5 24.6 2.8" stroke="#fff" strokeWidth="1.15" strokeLinecap="round" />
      <path d={GLASS_OUTLINE} fill="#fff" />
      <g clipPath={`url(#c${id})`}>
        <g className="sglass__juice" style={{ transform: `translateY(${y.toFixed(2)}px)` }}>
          <path className="sglass__wave sglass__wave--back" d="M-32 0q4-1.5 8 0t8 0 8 0 8 0 8 0 8 0 8 0 8 0V31H-32Z" />
          <path className="sglass__wave" d="M-32 .7q4-1.7 8 0t8 0 8 0 8 0 8 0 8 0 8 0 8 0V31H-32Z" fill={`url(#g${id})`} />
          <circle className="sglass__bubble" cx="12.6" cy="3.2" r=".85" />
          <circle className="sglass__bubble sglass__bubble--b" cx="18.2" cy="2.4" r=".6" />
          <circle className="sglass__bubble sglass__bubble--c" cx="15.4" cy="6.5" r=".7" />
          <circle className="sglass__bubble sglass__bubble--d" cx="11.2" cy="10" r=".55" />
        </g>
      </g>
      <path d={GLASS_OUTLINE} fill="none" stroke="#1d1c1a" strokeWidth="1.25" strokeLinejoin="round" />
      <path d="M10.1 15.8c-.5 1.6-.4 3.4.2 5" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" opacity=".9" />
    </svg>
  );
}

function ScoreCard({ result }: { result: JuiceResult }) {
  const score = Math.round(result.score);
  const shown = useCountUp(score, REVEAL_MS + 150, 1200);
  const level = useLater(0, score / 100, REVEAL_MS + 150);
  const mood = moodOf(score);
  const toGo = mood.next ? mood.next.at - score : 0;
  return (
    <section className="rcard rcard--score" aria-label={`Juice score: ${score} out of 100. ${mood.name}.`}>
      <div className="rcard__eyebrow">Juice score</div>
      <div className="score">
        <div className="score__main">
          <div className="score__num" aria-hidden>
            {Math.round(shown)}
            <span className="score__of">/100</span>
          </div>
          <div className="score__mood">{mood.name}</div>
        </div>
        <ScoreGlass level={level} />
      </div>
      <div className="rcard__foot">
        {mood.next ? (
          <>
            <b>{toGo}</b> point{toGo === 1 ? "" : "s"} to <b className="rcard__next">{mood.next.name}</b>
          </>
        ) : (
          <>Filled to the brim. Keep it flowing!</>
        )}
      </div>
    </section>
  );
}

function ReclaimCard({ result }: { result: JuiceResult }) {
  const setPanel = useStore((s) => s.setPanel);
  const gain = result.total > 0 ? result.reclaimable / result.total : 0;
  const leaks = result.byHealth.leak.count;
  // the reclaimable juice counts the strongest few lost links (see model.ts)
  const lost = Math.min(5, result.lost.length);
  const shown = useCountUp(gain * 100, REVEAL_MS + 400, 1200);
  const now = Math.round(result.score);
  const after = Math.round(result.scoreIfFixed);
  const open = () => setPanel("insights");
  if (gain < 0.0005) {
    const some = leaks + result.lost.length > 0;
    return (
      <section className="rcard rcard--reclaim" aria-label="Juice you could reclaim">
        <div className="rcard__eyebrow">Juice you could reclaim</div>
        <div className="reclaim-none">
          <svg className="reclaim-none__check" viewBox="0 0 20 20" aria-hidden>
            <circle cx="10" cy="10" r="9" />
            <path d="M6 10.4 8.7 13 14 7.4" />
          </svg>
          <div>
            <div className="reclaim-none__title">Every drop is flowing</div>
            <div className="reclaim-none__text">{some ? "The broken or lost links left carry next to no juice." : "No broken or lost links to win back."}</div>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="rcard rcard--reclaim" aria-label={`Juice you could reclaim: ${pct(gain)} more than now.`}>
      <div className="rcard__eyebrow">Juice you could reclaim</div>
      <div className="reclaim">
        <span className="reclaim__num" aria-hidden>
          +{shown >= 10 ? Math.round(shown) : shown.toFixed(1)}%
        </span>
        <svg className="reclaim__arrow" viewBox="0 0 16 20" aria-hidden>
          <path d="M8 18V3M2.5 8.5 8 3l5.5 5.5" />
        </svg>
        {after > now && (
          <span className="reclaim__after">
            score
            <br />
            {now} → <b>{after}</b>
          </span>
        )}
      </div>
      <div className="meter" aria-hidden>
        <span className="meter__now" style={{ width: `${(100 / (1 + gain)).toFixed(1)}%` }} />
        <span className="meter__more" />
      </div>
      <div className="reclaim__how">
        {leaks > 0 && (
          <button className="raction" onClick={open}>
            <svg viewBox="0 0 16 16" aria-hidden>
              <path d="M6.5 9.5 9.5 6.5M7 4.5l1.3-1.3a2.6 2.6 0 0 1 3.7 3.7L10.7 8.2M9 11.5l-1.3 1.3A2.6 2.6 0 0 1 4 9.1l1.3-1.3" />
            </svg>
            <span>
              Fix {leaks} broken link{leaks === 1 ? "" : "s"}
            </span>
          </button>
        )}
        {lost > 0 && (
          <button className="raction" onClick={open}>
            <svg viewBox="0 0 16 16" aria-hidden>
              <path d="M3 8a5 5 0 1 0 1.6-3.7M3 2.5v2.8h2.8" />
            </svg>
            <span>{lost === result.lost.length ? `Win back ${lost} lost link${lost === 1 ? "" : "s"}` : `Win back ${lost} top lost links`}</span>
          </button>
        )}
      </div>
    </section>
  );
}

/** Lives outside the Canvas: the cards themselves. */
export function ResultCards() {
  const result = useStore((s) => s.result);
  const mode = useStore((s) => s.mode);
  const revealKey = useStore((s) => s.revealKey);
  if (!result || mode !== "funnel") return null;
  return (
    <div className="results-layer">
      <div
        key={revealKey}
        className="results"
        style={{ visibility: "hidden" }}
        ref={(el) => {
          pinned.el = el;
        }}
      >
        <ScoreCard result={result} />
        <ReclaimCard result={result} />
      </div>
    </div>
  );
}
