import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeDomain } from "../shared/domain";
import { analyze, AnalyzeError } from "./api";
import { ScreenLabels } from "./scene/KeyLabels";
import { ResultCards } from "./scene/ResultCards";
import { Scene, type Insets } from "./scene/Scene";
import { useStore } from "./store";
import { HowItWorks } from "./ui/HowItWorks";
import { DemoChips, ErrorToast, Legend, Loading, Logo, SearchBar, Summary, ZoomControls } from "./ui/Hud";
import { Panel } from "./ui/Panel";

function useViewport() {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return vp;
}

export function App() {
  const status = useStore((s) => s.status);
  const payload = useStore((s) => s.payload);
  const panel = useStore((s) => s.panel);
  const setHowOpen = useStore((s) => s.setHowOpen);
  const [landing, setLanding] = useState(() => !new URLSearchParams(location.search).get("d"));
  const abort = useRef<AbortController | null>(null);
  const vp = useViewport();
  const mobile = vp.w < 760;

  const run = useCallback(async (input: string) => {
    const domain = normalizeDomain(input);
    const st = useStore.getState();
    if (!domain) {
      st.setStatus("error", "That doesn't look like a website. Try something like example.com");
      return;
    }
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    st.setDomain(domain);
    st.setStatus("loading");
    setLanding(false);
    const url = new URL(location.href);
    url.searchParams.set("d", domain);
    history.replaceState(null, "", url);
    try {
      const res = await analyze(domain, ctl.signal);
      if (ctl.signal.aborted) return;
      useStore.getState().setPayload(res);
    } catch (e) {
      if (ctl.signal.aborted) return;
      const msg = e instanceof AnalyzeError ? e.message : "Something went wrong. Please try again.";
      useStore.getState().setStatus("error", msg);
    }
  }, []);

  // A shared link (?d=site) opens straight onto the board; otherwise the page waits for you.
  useEffect(() => {
    const d = new URLSearchParams(location.search).get("d");
    if (d) run(d);
  }, [run]);

  // Whiteboard shortcuts: + / − to zoom, 0 to fit, Esc to close things.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const st = useStore.getState();
      if (e.key === "+" || e.key === "=") st.zoomBy(1.3);
      else if (e.key === "-" || e.key === "_") st.zoomBy(1 / 1.3);
      else if (e.key === "0") st.fitView();
      else if (e.key === "Escape") {
        if (st.howOpen) st.setHowOpen(false);
        else if (st.selected) st.select(null);
        else if (st.panel) st.setPanel(null);
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const insets: Insets = useMemo(() => {
    if (mobile) return { top: landing ? 250 : 120, right: 10, bottom: panel ? Math.round(vp.h * 0.55) : 150, left: 10 };
    return { top: landing ? 268 : 124, right: panel ? 430 : 40, bottom: 96, left: landing ? 40 : 296 };
  }, [mobile, landing, panel, vp.h]);

  return (
    <div className={`app ${landing ? "is-landing" : ""} ${mobile ? "is-mobile" : ""}`}>
      <Scene insets={insets} />
      <ScreenLabels />
      <ResultCards />

      <header className="topbar">
        <Logo />
        <div className="topbar__center">
          {!landing && <SearchBar onSubmit={(d) => run(d)} />}
          {!landing && <DemoChipsCompact onPick={(d) => run(d)} />}
        </div>
        <nav className="topbar__nav">
          <button className="link-btn" onClick={() => setHowOpen(true)}>
            How it works
          </button>
        </nav>
      </header>

      {landing && (
        <section className="hero">
          <div className="eyebrow">Link juice, visualized</div>
          <h1>See where your SEO juice comes from.</h1>
          <SearchBar onSubmit={(d) => run(d)} big />
          <DemoChips onPick={(d) => run(d)} />
        </section>
      )}

      {!landing && status !== "loading" && payload && <Summary />}

      <Legend />
      <Panel />
      <ZoomControls />
      <Loading />
      <ErrorToast />
      <HowItWorks />
    </div>
  );
}

function DemoChipsCompact({ onPick }: { onPick: (d: string) => void }) {
  const payload = useStore((s) => s.payload);
  if (!payload?.demo) return null;
  return (
    <div className="demo-note">
      <span>Demo data</span>
      <DemoChips onPick={onPick} />
    </div>
  );
}
