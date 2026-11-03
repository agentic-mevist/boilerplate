import { useEffect, useRef, useState } from "react";
import { DEMOS } from "../api";
import { compact, int, pct } from "../format";
import { useStore } from "../store";
import { C, HEALTH_COLOR } from "../theme";
import { Favicon } from "./Favicon";

export function Logo() {
  return (
    <a className="logo" href="/" aria-label="Juiceflow home">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
        <path d="M13 2.5c3.6 4.5 7.5 8.6 7.5 13a7.5 7.5 0 0 1-15 0c0-4.4 3.9-8.5 7.5-13Z" fill={C.juice} />
        <path d="M9.6 16.6a3.6 3.6 0 0 0 3.4 3.4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity=".85" />
      </svg>
      <span>juiceflow</span>
    </a>
  );
}

export function SearchBar({ onSubmit, big }: { onSubmit: (d: string) => void; big?: boolean }) {
  const domain = useStore((s) => s.payload?.target ?? s.domain ?? "");
  const status = useStore((s) => s.status);
  const [value, setValue] = useState(domain);
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
      }}
    >
      <span className="search__prefix">https://</span>
      <input
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
  const showLost = useStore((s) => s.showLost);
  const setShowLost = useStore((s) => s.setShowLost);
  if (!result) return null;
  const h = result.byHealth;
  const items: { key: keyof typeof h; label: string; sw: string }[] = [
    { key: "clean", label: "Clean juice", sw: "solid" },
    { key: "suspicious", label: "Spammy-ish", sw: "solid" },
    { key: "toxic", label: "Murky spam", sw: "fade" },
    { key: "nofollow", label: "Nofollow", sw: "dots" },
    { key: "leak", label: "Leaking", sw: "spill" },
  ];
  return (
    <div className="legend">
      <div className="legend__row legend__width" title="River width follows each site's share of your juice">
        <span className="legend__river" style={{ height: 3 }} />
        <span className="legend__lbl">spring</span>
        <span className="legend__river" style={{ height: 6 }} />
        <span className="legend__lbl">creek</span>
        <span className="legend__river" style={{ height: 12 }} />
        <span className="legend__lbl">river</span>
      </div>
      <div className="legend__row">
        {items
          .filter((i) => i.key === "clean" || h[i.key].count > 0)
          .map((i) => (
            <span key={i.key} className="legend__item">
              <span className={`sw sw--${i.sw}`} style={{ "--c": HEALTH_COLOR[i.key] } as React.CSSProperties} />
              {i.label}
              {i.key !== "clean" && <em>{h[i.key].count}</em>}
            </span>
          ))}
        {result.lost.length > 0 && (
          <label className="legend__item legend__toggle">
            <input type="checkbox" checked={showLost} onChange={(e) => setShowLost(e.target.checked)} />
            <span className="sw sw--dash" style={{ "--c": HEALTH_COLOR.lost } as React.CSSProperties} />
            Lost <em>{result.lost.length}</em>
          </label>
        )}
      </div>
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
