import { useEffect, useRef, useState } from "react";
import { DEMOS } from "../api";
import { compact, int, pct } from "../format";
import { glassMarkup, juiceById, JUICES } from "../juices";
import { useStore } from "../store";
import { Favicon } from "./Favicon";

/** A glass of whatever juice is flowing. */
export function GlassMark({ size = 28 }: { size?: number }) {
  const juice = juiceById(useStore((s) => s.juice));
  return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden dangerouslySetInnerHTML={{ __html: glassMarkup(juice) }} />;
}

export function Logo() {
  return (
    <a className="logo" href="/" aria-label="Juiceflow home">
      <GlassMark />
      <span>juiceflow</span>
    </a>
  );
}

/** Pick the juice: recolors the streams, the cards and the accents. */
export function JuicePicker() {
  const juice = useStore((s) => s.juice);
  const setJuice = useStore((s) => s.setJuice);
  return (
    <div className="juices" role="radiogroup" aria-label="Juice">
      {JUICES.map((j) => (
        <button
          key={j.id}
          role="radio"
          aria-checked={juice === j.id}
          aria-label={j.name}
          title={j.name}
          className={`juice-dot ${juice === j.id ? "is-on" : ""}`}
          style={{ ["--c" as string]: j.deep, ["--c2" as string]: j.shallow }}
          onClick={() => setJuice(j.id)}
        />
      ))}
    </div>
  );
}

export function SearchBar({ onSubmit, big }: { onSubmit: (d: string) => void; big?: boolean }) {
  const domain = useStore((s) => s.payload?.target ?? s.domain ?? "");
  const status = useStore((s) => s.status);
  const [value, setValue] = useState(domain);
  const input = useRef<HTMLInputElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current && !domain) return;
    first.current = false;
    setValue(domain);
  }, [domain]);
  return (
    <form
      className={`search ${big ? "search--big" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit(value.trim());
        else input.current?.focus();
      }}
    >
      <span className="search__prefix">https://</span>
      <input
        ref={input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="yourwebsite.com"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        inputMode="url"
        aria-label="Website to analyze"
      />
      <button className="keycap keycap--juice" type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Pouring…" : "Follow the juice"}
      </button>
    </form>
  );
}

export function DemoChips({ onPick }: { onPick: (d: string) => void }) {
  const current = useStore((s) => s.payload?.target);
  return (
    <div className="demos">
      <span>Try</span>
      {DEMOS.slice(0, 4).map((d) => (
        <button key={d} className={`chip ${current === d ? "is-on" : ""}`} onClick={() => onPick(d)}>
          <Favicon domain={d} size={14} /> {d}
        </button>
      ))}
    </div>
  );
}

/** Miro-style zoom widget: −, current zoom (click to fit), +, fit. */
export function ZoomControls() {
  const result = useStore((s) => s.result);
  const zoomPct = useStore((s) => s.zoomPct);
  const zoomBy = useStore((s) => s.zoomBy);
  const fitView = useStore((s) => s.fitView);
  if (!result) return null;
  return (
    <div className="zoom" role="group" aria-label="Zoom">
      <button onClick={() => zoomBy(1 / 1.3)} aria-label="Zoom out" title="Zoom out (−)">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M3 7h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
      <button className="zoom__pct" onClick={fitView} title="Fit to screen (0)">
        {zoomPct}%
      </button>
      <button onClick={() => zoomBy(1.3)} aria-label="Zoom in" title="Zoom in (+)">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M3 7h8M7 3v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
      <span className="zoom__sep" />
      <button onClick={fitView} aria-label="Fit to screen" title="Fit to screen (0)">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 5V2h3M9 2h3v3M12 9v3H9M5 12H2V9" />
        </svg>
      </button>
    </div>
  );
}

export function Legend() {
  const result = useStore((s) => s.result);
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  if (!result) return null;
  return (
    <div className="legend">
      <JuicePicker />
      <div className="seg" role="group" aria-label="Layout">
        <button className={mode === "funnel" ? "is-on" : ""} onClick={() => setMode("funnel")}>
          Stream
        </button>
        <button className={mode === "vortex" ? "is-on" : ""} onClick={() => setMode("vortex")}>
          Vortex
        </button>
      </div>
    </div>
  );
}

export function Summary() {
  const result = useStore((s) => s.result);
  const payload = useStore((s) => s.payload);
  const setPanel = useStore((s) => s.setPanel);
  const panel = useStore((s) => s.panel);
  if (!result || !payload) return null;
  const top = result.sources[0];
  const dofollow = result.sources.filter((s) => s.factors.follow === 1).length;
  return (
    <div className="summary">
      <div className="summary__score">
        <span className="summary__num">{Math.round(result.score)}</span>
        <span className="summary__cap">
          juice
          <br />
          score
        </span>
      </div>
      <div className="summary__stats">
        <span>
          <b>{int(result.coverage.total)}</b> linking sites
        </span>
        <span>
          <b>{result.sources.length ? pct(dofollow / result.sources.length) : "0%"}</b> dofollow
        </span>
        {top && (
          <span>
            top: <b>{top.root}</b> {pct(top.share)}
          </span>
        )}
      </div>
      <div className="summary__btns">
        <button className={`keycap ${panel === "sources" ? "is-on" : ""}`} onClick={() => setPanel(panel === "sources" ? null : "sources")}>
          Sources
        </button>
        <button className={`keycap ${panel === "insights" ? "is-on" : ""}`} onClick={() => setPanel(panel === "insights" ? null : "insights")}>
          Insights <span className="badge">{result.insights.filter((i) => i.tone === "bad" || i.tone === "warn").length}</span>
        </button>
      </div>
    </div>
  );
}

export function Loading() {
  const status = useStore((s) => s.status);
  const domain = useStore((s) => s.domain);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (status !== "loading") return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, 3)), 1400);
    return () => clearInterval(t);
  }, [status]);
  if (status !== "loading") return null;
  const steps = ["Finding every site that links to you", "Measuring their authority", "Checking for spam", "Computing the flow"];
  return (
    <div className="loading">
      <div className="loading__ring" />
      <div className="loading__title">Tracing the streams into {domain}</div>
      <div className="loading__step">{steps[step]}…</div>
    </div>
  );
}

export function ErrorToast() {
  const error = useStore((s) => s.error);
  const status = useStore((s) => s.status);
  const setStatus = useStore((s) => s.setStatus);
  const payload = useStore((s) => s.payload);
  if (status !== "error" || !error) return null;
  return (
    <div className="toast" role="alert">
      <span>{error}</span>
      <button onClick={() => setStatus(payload ? "ready" : "idle")} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
